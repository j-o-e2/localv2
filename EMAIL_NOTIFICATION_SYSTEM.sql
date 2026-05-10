-- ============================================================================
-- Email Notification System with Resend
-- ============================================================================
-- This creates the email queue system for sending notifications via Resend
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create email_queue table to track emails to be sent
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'job_posted', 'application_received', 'review_received', etc.
  template_data JSONB NOT NULL DEFAULT '{}', -- Data for the email template
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  priority INTEGER DEFAULT 1, -- 1=normal, 2=high, 3=urgent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_template_type ON email_queue(template_type);

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only service role can manage queue
CREATE POLICY "Service role can manage email queue" ON email_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Function to queue an email notification
CREATE OR REPLACE FUNCTION queue_email_notification(
  p_user_id UUID,
  p_notification_id UUID,
  p_template_type TEXT,
  p_template_data JSONB DEFAULT '{}',
  p_priority INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_queue_id UUID;
BEGIN
  -- Get user's email
  SELECT email INTO v_email FROM profiles WHERE id = p_user_id;

  -- Only queue if user has an email
  IF v_email IS NOT NULL AND v_email != '' THEN
    INSERT INTO email_queue (
      user_id,
      notification_id,
      recipient_email,
      template_type,
      template_data,
      priority
    ) VALUES (
      p_user_id,
      p_notification_id,
      v_email,
      p_template_type,
      p_template_data,
      p_priority
    ) RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Function to send location-based job notifications
CREATE OR REPLACE FUNCTION notify_workers_near_location(
  p_job_id UUID,
  p_job_title TEXT,
  p_job_location TEXT,
  p_client_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_worker_count INTEGER := 0;
  v_notification_id UUID;
  v_worker RECORD;
BEGIN
  -- Find workers in the same location (exact match for now)
  FOR v_worker IN
    SELECT id, email, full_name
    FROM profiles
    WHERE location = p_job_location
      AND role = 'worker'
      AND id != p_client_id
      AND email IS NOT NULL
      AND email != ''
  LOOP
    -- Create in-app notification
    SELECT create_notification(
      v_worker.id,
      'job_available',
      'New Job Available',
      format('A new job "%s" has been posted in your location (%s). Check it out!', p_job_title, p_job_location),
      p_job_id,
      'job'
    ) INTO v_notification_id;

    -- Queue email notification
    PERFORM queue_email_notification(
      v_worker.id,
      v_notification_id,
      'job_available_nearby',
      jsonb_build_object(
        'job_title', p_job_title,
        'job_location', p_job_location,
        'job_id', p_job_id,
        'recipient_name', v_worker.full_name
      ),
      2 -- High priority for job notifications
    );

    v_worker_count := v_worker_count + 1;
  END LOOP;

  RETURN v_worker_count;
END;
$$;

-- Update existing notification functions to queue emails
-- First, update job notifications
CREATE OR REPLACE FUNCTION notification_trigger_function_jobs()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_worker_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify the job poster that their job was successfully posted
    SELECT create_notification(
      NEW.client_id,
      'job_posted',
      'Job Posted Successfully',
      format('Your job "%s" has been posted and is now visible to workers.', NEW.title),
      NEW.id,
      'job'
    ) INTO v_notification_id;

    -- Queue email for job poster
    PERFORM queue_email_notification(
      NEW.client_id,
      v_notification_id,
      'job_posted',
      jsonb_build_object(
        'job_title', NEW.title,
        'job_location', NEW.location,
        'job_budget', NEW.budget,
        'job_id', NEW.id
      )
    );

    -- Notify workers in the same location about the new job posting
    SELECT notify_workers_near_location(NEW.id, NEW.title, NEW.location, NEW.client_id) INTO v_worker_count;

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Notify the job poster when their job is marked as completed
    SELECT create_notification(
      NEW.client_id,
      'job_completed',
      'Job Completed',
      format('Your job "%s" has been completed.', NEW.title),
      NEW.id,
      'job'
    ) INTO v_notification_id;

    -- Queue email for job completion
    PERFORM queue_email_notification(
      NEW.client_id,
      v_notification_id,
      'job_completed',
      jsonb_build_object(
        'job_title', NEW.title,
        'job_id', NEW.id
      ),
      2 -- High priority
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Notify the job poster when their job is cancelled
    SELECT create_notification(
      NEW.client_id,
      'job_cancelled',
      'Job Cancelled',
      format('Your job "%s" has been cancelled.', NEW.title),
      NEW.id,
      'job'
    ) INTO v_notification_id;

    -- Queue email for job cancellation
    PERFORM queue_email_notification(
      NEW.client_id,
      v_notification_id,
      'job_cancelled',
      jsonb_build_object(
        'job_title', NEW.title,
        'job_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update job application notifications
CREATE OR REPLACE FUNCTION notification_trigger_function_job_applications()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_job_owner UUID;
  v_job_title TEXT;
  v_applicant_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT client_id INTO v_job_owner FROM jobs WHERE id = NEW.job_id;
    IF v_job_owner IS NOT NULL THEN
      SELECT title INTO v_job_title FROM jobs WHERE id = NEW.job_id;
      SELECT full_name INTO v_applicant_name FROM profiles WHERE id = NEW.provider_id;

      SELECT create_notification(
        v_job_owner,
        'job_application',
        'New Job Application',
        format('You have a new application for your job: %s', COALESCE(v_job_title, 'Unknown')),
        NEW.id,
        'job_application'
      ) INTO v_notification_id;

      -- Queue email for job application
      PERFORM queue_email_notification(
        v_job_owner,
        v_notification_id,
        'job_application_received',
        jsonb_build_object(
          'job_title', v_job_title,
          'applicant_name', v_applicant_name,
          'job_id', NEW.job_id,
          'application_id', NEW.id
        ),
        2 -- High priority
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' THEN
    IF NEW.provider_id IS NOT NULL THEN
      SELECT title INTO v_job_title FROM jobs WHERE id = NEW.job_id;

      SELECT create_notification(
        NEW.provider_id,
        'application_accepted',
        'Application Accepted',
        format('Your application has been accepted! Job: %s', COALESCE(v_job_title, 'Unknown')),
        NEW.id,
        'job_application'
      ) INTO v_notification_id;

      -- Queue email for application acceptance
      PERFORM queue_email_notification(
        NEW.provider_id,
        v_notification_id,
        'application_accepted',
        jsonb_build_object(
          'job_title', v_job_title,
          'job_id', NEW.job_id,
          'application_id', NEW.id
        ),
        3 -- Urgent priority
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'rejected' THEN
    IF NEW.provider_id IS NOT NULL THEN
      SELECT title INTO v_job_title FROM jobs WHERE id = NEW.job_id;

      SELECT create_notification(
        NEW.provider_id,
        'application_rejected',
        'Application Rejected',
        format('Your application was not selected. Job: %s', COALESCE(v_job_title, 'Unknown')),
        NEW.id,
        'job_application'
      ) INTO v_notification_id;

      -- Queue email for application rejection
      PERFORM queue_email_notification(
        NEW.provider_id,
        v_notification_id,
        'application_rejected',
        jsonb_build_object(
          'job_title', v_job_title,
          'job_id', NEW.job_id,
          'application_id', NEW.id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update booking notifications
CREATE OR REPLACE FUNCTION notification_trigger_function_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_service_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.service_id IS NOT NULL THEN
    SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;

    -- Notify and email the provider for a new booking request
    SELECT create_notification(
      (SELECT provider_id FROM services WHERE id = NEW.service_id),
      'new_booking',
      'New Booking Request',
      format('You have a new booking request for: %s', COALESCE(v_service_name, 'Unknown service')),
      NEW.id,
      'booking'
    ) INTO v_notification_id;

    PERFORM queue_email_notification(
      (SELECT provider_id FROM services WHERE id = NEW.service_id),
      v_notification_id,
      'new_booking',
      jsonb_build_object(
        'service_name', v_service_name,
        'booking_id', NEW.id,
        'service_id', NEW.service_id
      ),
      2 -- High priority
    );

    -- Notify and email the client to confirm their booking request was submitted
    IF NEW.client_id IS NOT NULL THEN
      SELECT create_notification(
        NEW.client_id,
        'booking_created',
        'Booking Request Sent',
        format('Your booking request for %s has been sent to the provider.', COALESCE(v_service_name, 'the service')),
        NEW.id,
        'booking'
      ) INTO v_notification_id;

      PERFORM queue_email_notification(
        NEW.client_id,
        v_notification_id,
        'booking_created',
        jsonb_build_object(
          'service_name', v_service_name,
          'booking_id', NEW.id,
          'service_id', NEW.service_id
        ),
        2 -- High priority
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND NEW.client_id IS NOT NULL THEN
    SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;

    SELECT create_notification(
      NEW.client_id,
      'booking_approved',
      'Booking Confirmed',
      'Your booking has been confirmed!',
      NEW.id,
      'booking'
    ) INTO v_notification_id;

    PERFORM queue_email_notification(
      NEW.client_id,
      v_notification_id,
      'booking_approved',
      jsonb_build_object(
        'booking_id', NEW.id,
        'service_name', v_service_name
      ),
      2 -- High priority
    );

    SELECT create_notification(
      (SELECT provider_id FROM services WHERE id = NEW.service_id),
      'booking_approved',
      'Booking Confirmed',
      format('The booking for %s has been approved.', COALESCE(v_service_name, 'your service')),
      NEW.id,
      'booking'
    ) INTO v_notification_id;

    PERFORM queue_email_notification(
      (SELECT provider_id FROM services WHERE id = NEW.service_id),
      v_notification_id,
      'booking_approved',
      jsonb_build_object(
        'booking_id', NEW.id,
        'service_name', v_service_name
      ),
      2 -- High priority
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND NEW.client_id IS NOT NULL THEN
    SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;

    SELECT create_notification(
      NEW.client_id,
      'booking_completed',
      'Service Completed',
      'Your service has been marked as completed. Please leave a review.',
      NEW.id,
      'booking'
    ) INTO v_notification_id;

    PERFORM queue_email_notification(
      NEW.client_id,
      v_notification_id,
      'booking_completed',
      jsonb_build_object(
        'booking_id', NEW.id,
        'service_name', v_service_name
      ),
      2 -- High priority
    );

    SELECT create_notification(
      (SELECT provider_id FROM services WHERE id = NEW.service_id),
      'booking_completed',
      'Service Completed',
      format('The booking for %s has been completed.', COALESCE(v_service_name, 'your service')),
      NEW.id,
      'booking'
    ) INTO v_notification_id;

    PERFORM queue_email_notification(
      (SELECT provider_id FROM services WHERE id = NEW.service_id),
      v_notification_id,
      'booking_completed',
      jsonb_build_object(
        'booking_id', NEW.id,
        'service_name', v_service_name
      ),
      2 -- High priority
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update review notifications
CREATE OR REPLACE FUNCTION notification_trigger_function_reviews()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_reviewer_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.client_id IS NOT NULL THEN
    SELECT full_name INTO v_reviewer_name FROM profiles WHERE id = NEW.reviewer_id;

    SELECT create_notification(
      NEW.client_id,
      'new_review',
      'New Review',
      format('You received a new review: %s', COALESCE(NEW.comment, 'Great service!')),
      NEW.id,
      'review'
    ) INTO v_notification_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to get pending emails for sending
CREATE OR REPLACE FUNCTION get_pending_emails(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  recipient_email TEXT,
  template_type TEXT,
  template_data JSONB,
  priority INTEGER,
  retry_count INTEGER
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    eq.id,
    eq.user_id,
    eq.recipient_email,
    eq.template_type,
    eq.template_data,
    eq.priority,
    eq.retry_count
  FROM email_queue eq
  WHERE eq.status = 'pending'
    AND eq.retry_count < eq.max_retries
  ORDER BY eq.priority DESC, eq.created_at ASC
  LIMIT limit_count;
END;
$$;

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION mark_email_sent(p_email_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
BEGIN
  UPDATE email_queue
  SET status = 'sent', sent_at = NOW()
  WHERE id = p_email_id;

  RETURN FOUND;
END;
$$;

-- Function to mark email as failed
CREATE OR REPLACE FUNCTION mark_email_failed(p_email_id UUID, p_error_message TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
BEGIN
  UPDATE email_queue
  SET
    status = 'failed',
    error_message = p_error_message,
    retry_count = retry_count + 1
  WHERE id = p_email_id;

  RETURN FOUND;
END;
$$;

-- Verify setup
-- Attach notification triggers to the corresponding tables
DROP TRIGGER IF EXISTS job_notification_trigger ON jobs;
CREATE TRIGGER job_notification_trigger
AFTER INSERT OR UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function_jobs();

DROP TRIGGER IF EXISTS job_application_notification_trigger ON job_applications;
CREATE TRIGGER job_application_notification_trigger
AFTER INSERT OR UPDATE ON job_applications
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function_job_applications();

DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
CREATE TRIGGER booking_notification_trigger
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function_bookings();

DROP TRIGGER IF EXISTS review_notification_trigger ON reviews;
-- Review notification emails are intentionally disabled in this email notification system.

SELECT 'Email notification system with Resend configured successfully!' AS status;