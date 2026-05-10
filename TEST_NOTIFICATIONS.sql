-- ============================================================================
-- TEST NOTIFICATIONS - Manual test script
-- ============================================================================

-- Test 1: Check if notifications table exists and has data
SELECT 'Test 1: Check notifications table' AS test_name;
SELECT COUNT(*) AS total_notifications FROM notifications;

-- Test 2: Get recent notifications
SELECT 'Test 2: Recent notifications' AS test_name;
SELECT id, user_id, type, title, message, is_read, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Test 3: Test create_notification function (replace USER_ID with actual profile id)
SELECT 'Test 3: Test create_notification function' AS test_name;
-- Replace this with a valid user_id from your profiles table
-- SELECT create_notification(
--   'YOUR-PROFILE-UUID-HERE',  -- Replace with actual user_id
--   'test',
--   'Test Notification',
--   'This is a test notification',
--   NULL,
--   'test'
-- );

-- Test 4: Check notification types
SELECT 'Test 4: Notification types distribution' AS test_name;
SELECT type, COUNT(*) AS count 
FROM notifications 
GROUP BY type 
ORDER BY count DESC;

-- Test 5: Check unread notifications
SELECT 'Test 5: Unread notifications count' AS test_name;
SELECT COUNT(*) AS unread_count 
FROM notifications 
WHERE is_read = FALSE;

-- ============================================================================
-- END OF TEST
-- ============================================================================