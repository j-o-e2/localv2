-- Check email queue status
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_pending,
  MAX(sent_at) as last_sent
FROM email_queue
GROUP BY status
ORDER BY status;

-- Check if your profile has an email
SELECT id, full_name, email, location, role
FROM profiles
WHERE email IS NOT NULL AND email != ''
LIMIT 5;

-- Check recent jobs you posted
SELECT id, title, location, status, created_at, client_id
FROM jobs
WHERE client_id = 'your-user-id-here'  -- Replace with your actual user ID
ORDER BY created_at DESC
LIMIT 5;

-- Check if notifications were created for your jobs
SELECT n.*, p.full_name, p.email
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.type = 'job'
ORDER BY n.created_at DESC
LIMIT 10;