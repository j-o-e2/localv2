-- ============================================================================
-- NOTIFICATIONS TABLE - Complete Setup Script
-- ============================================================================

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 3. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notifications (via trigger/API)
CREATE POLICY "Users can create own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (p_user_id, p_type, p_title, p_message, p_reference_id, p_reference_type)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- 6. Trigger function to auto-create notifications for common events
CREATE OR REPLACE FUNCTION notification_trigger_function()
RETURNS TRIGGER AS $$
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
    SELECT create_notification(
      NEW.provider_id,
      'application_accepted',
      'Application Accepted',
      format('Your application has been accepted! Job: %s', COALESCE((SELECT title FROM jobs WHERE id = NEW.job_id), 'Unknown')),
      NEW.id,
      'job_application'
    ) INTO v_notification_id;
  END IF;

  -- Handle job application rejected
  IF TG_TABLE_NAME = 'job_applications' AND TG_OP = 'UPDATE' AND NEW.status = 'rejected' THEN
    SELECT create_notification(
      NEW.provider_id,
      'application_rejected',
      'Application Rejected',
      format('Your application was not selected. Job: %s', COALESCE((SELECT title FROM jobs WHERE id = NEW.job_id), 'Unknown')),
      NEW.id,
      'job_application'
    ) INTO v_notification_id;
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
    SELECT create_notification(
      NEW.client_id,
      'booking_approved',
      'Booking Confirmed',
      'Your booking has been confirmed!',
      NEW.id,
      'booking'
    ) INTO v_notification_id;
  END IF;

  -- Handle booking completed
  IF TG_TABLE_NAME = 'bookings' AND TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN
    SELECT create_notification(
      NEW.client_id,
      'booking_completed',
      'Service Completed',
      'Your service has been marked as completed. Please leave a review.',
      NEW.id,
      'booking'
    ) INTO v_notification_id;
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

-- 7. Create triggers for auto-notifications
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

-- 8. Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION notification_trigger_function TO authenticated;

-- ============================================================================
-- END OF NOTIFICATIONS SETUP
-- ============================================================================