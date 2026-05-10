-- ============================================================================
-- NOTIFICATIONS TABLE - Part 2: Functions & Triggers
-- ============================================================================

-- 1. Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (p_user_id, p_type, p_title, p_message, p_reference_id, p_reference_type)
  RETURNING id;
$$;

-- 2. Trigger function to auto-create notifications for common events
CREATE OR REPLACE FUNCTION notification_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_job_owner UUID;
  v_job_title TEXT;
BEGIN
  -- Handle new job application
  IF TG_TABLE_NAME = 'job_applications' AND TG_OP = 'INSERT' THEN
    SELECT COALESCE(client_id, poster_id) INTO v_job_owner FROM jobs WHERE id = NEW.job_id;
    IF v_job_owner IS NOT NULL THEN
      SELECT title INTO v_job_title FROM jobs WHERE id = NEW.job_id;
      SELECT create_notification(
        v_job_owner,
        'job_application',
        'New Job Application',
        format('You have a new application for your job: %s', COALESCE(v_job_title, 'Unknown')),
        NEW.id,
        'job_application'
      ) INTO v_notification_id;
    END IF;
  END IF;

  -- Handle job application accepted
  IF TG_TABLE_NAME = 'job_applications' AND TG_OP = 'UPDATE' AND NEW.status = 'accepted' THEN
    IF NEW.provider_id IS NOT NULL THEN
      SELECT create_notification(
        NEW.provider_id,
        'application_accepted',
        'Application Accepted',
        format('Your application has been accepted! Job: %s', COALESCE((SELECT title FROM jobs WHERE id = NEW.job_id), 'Unknown')),
        NEW.id,
        'job_application'
      ) INTO v_notification_id;
    END IF;
  END IF;

  -- Handle job application rejected
  IF TG_TABLE_NAME = 'job_applications' AND TG_OP = 'UPDATE' AND NEW.status = 'rejected' THEN
    IF NEW.provider_id IS NOT NULL THEN
      SELECT create_notification(
        NEW.provider_id,
        'application_rejected',
        'Application Rejected',
        format('Your application was not selected. Job: %s', COALESCE((SELECT title FROM jobs WHERE id = NEW.job_id), 'Unknown')),
        NEW.id,
        'job_application'
      ) INTO v_notification_id;
    END IF;
  END IF;

  -- Handle new booking
  IF TG_TABLE_NAME = 'bookings' AND TG_OP = 'INSERT' THEN
    IF NEW.service_id IS NOT NULL THEN
      SELECT create_notification(
        (SELECT provider_id FROM services WHERE id = NEW.service_id),
        'new_booking',
        'New Booking Request',
        format('You have a new booking request for: %s', COALESCE((SELECT name FROM services WHERE id = NEW.service_id), 'Unknown service')),
        NEW.id,
        'booking'
      ) INTO v_notification_id;
    END IF;
  END IF;

  -- Handle booking approved
  IF TG_TABLE_NAME = 'bookings' AND TG_OP = 'UPDATE' AND NEW.status = 'approved' THEN
    IF NEW.client_id IS NOT NULL THEN
      SELECT create_notification(
        NEW.client_id,
        'booking_approved',
        'Booking Confirmed',
        'Your booking has been confirmed!',
        NEW.id,
        'booking'
      ) INTO v_notification_id;
    END IF;
  END IF;

  -- Handle booking completed
  IF TG_TABLE_NAME = 'bookings' AND TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN
    IF NEW.client_id IS NOT NULL THEN
      SELECT create_notification(
        NEW.client_id,
        'booking_completed',
        'Service Completed',
        'Your service has been marked as completed. Please leave a review.',
        NEW.id,
        'booking'
      ) INTO v_notification_id;
    END IF;
  END IF;

  -- Handle new review
  IF TG_TABLE_NAME = 'reviews' AND TG_OP = 'INSERT' THEN
    IF NEW.client_id IS NOT NULL THEN
      SELECT create_notification(
        NEW.client_id,
        'new_review',
        'New Review',
        format('You received a new review: %s', COALESCE(NEW.comment, 'Great service!')),
        NEW.id,
        'review'
      ) INTO v_notification_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create triggers for auto-notifications
DROP TRIGGER IF EXISTS job_application_notification_trigger ON job_applications;
CREATE TRIGGER job_application_notification_trigger
AFTER INSERT OR UPDATE ON job_applications
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function();

DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
CREATE TRIGGER booking_notification_trigger
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function();

DROP TRIGGER IF EXISTS review_notification_trigger ON reviews;
CREATE TRIGGER review_notification_trigger
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function();

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION notification_trigger_function TO authenticated;

-- ============================================================================
-- END OF NOTIFICATIONS SETUP
-- ============================================================================