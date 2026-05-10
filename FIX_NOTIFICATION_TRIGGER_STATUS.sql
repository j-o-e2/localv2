-- ============================================================================
-- Fix for notification_trigger_function error: 
-- "record 'new' has no field 'status'"
-- ============================================================================
-- The issue is that the trigger function accesses NEW.status on tables
-- that don't have a status column (like reviews). PostgreSQL validates
-- column references at compile time, not runtime.
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS job_application_notification_trigger ON job_applications;
DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
DROP TRIGGER IF EXISTS review_notification_trigger ON reviews;

-- Drop and recreate the trigger function with proper column guards
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

  -- Handle job application accepted (only for job_applications table)
  IF TG_TABLE_NAME = 'job_applications' AND TG_OP = 'UPDATE' THEN
    IF (NEW.status = 'accepted') THEN
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
      END IF;
    END IF;
  END IF;

  -- Handle job application rejected (only for job_applications table)
  IF TG_TABLE_NAME = 'job_applications' AND TG_OP = 'UPDATE' THEN
    IF (NEW.status = 'rejected') THEN
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
      END IF;
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

  -- Handle booking approved (only for bookings table)
  IF TG_TABLE_NAME = 'bookings' AND TG_OP = 'UPDATE' THEN
    IF (NEW.status = 'approved') THEN
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
  END IF;

  -- Handle booking completed (only for bookings table)
  IF TG_TABLE_NAME = 'bookings' AND TG_OP = 'UPDATE' THEN
    IF (NEW.status = 'completed') THEN
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
  END IF;

  -- Handle new review (reviews table has no status column)
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

-- Recreate triggers
CREATE TRIGGER job_application_notification_trigger
AFTER INSERT OR UPDATE ON job_applications
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function();

CREATE TRIGGER booking_notification_trigger
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function();

CREATE TRIGGER review_notification_trigger
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION notification_trigger_function();

-- Verify
SELECT 'Notification trigger function fixed successfully!' AS status;