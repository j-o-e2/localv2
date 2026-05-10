-- ============================================================================
-- INSERT TEST NOTIFICATION - Run this to test
-- ============================================================================

-- First, get a valid user_id from profiles table
-- Then insert a test notification

-- Replace 'YOUR_USER_ID_HERE' with an actual profile id
-- You can get one from: SELECT id FROM profiles LIMIT 1;

INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with actual profile id from profiles table
  'test',
  'Test Notification',
  'Testing if notifications work!',
  NULL,
  'test'
);

-- ============================================================================
-- END OF TEST INSERT
-- ============================================================================