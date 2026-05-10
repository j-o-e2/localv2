# Email Notification System with Resend

This system automatically sends email notifications to users for various platform activities using Resend for reliable email delivery.

## Features

✅ **Location-based notifications** - Workers get notified when jobs are posted in their area
✅ **Real-time email queuing** - Emails are queued immediately when events occur
✅ **Batch processing** - Emails are sent in batches for efficiency
✅ **Retry logic** - Failed emails are automatically retried
✅ **React Email templates** - Beautiful, responsive email templates
✅ **Comprehensive logging** - Full audit trail of email sending

## Setup

### 1. Database Setup
Run the SQL file in Supabase SQL Editor:
```sql
-- Run: EMAIL_NOTIFICATION_SYSTEM.sql
```

### 2. Environment Variables
Add to your `.env` file:
```env
RESEND_API_KEY=your_resend_api_key_here
CRON_SECRET=your_cron_secret_here
```

### 3. Install Dependencies
```bash
npm install resend @react-email/components
```

## How It Works

### 1. Event Triggers
When certain events occur (job posted, application received, etc.), the database triggers automatically:
- Create an in-app notification
- Queue an email for sending

### 2. Email Queue
Emails are stored in the `email_queue` table with:
- Recipient email address
- Template type and data
- Priority level
- Retry count and status

### 3. Batch Sending
The `/api/email/send` endpoint processes queued emails in batches of 50.

### 4. Scheduled Processing
For production, set up a cron job to call `/api/cron/send-emails` every 5 minutes.

## Email Templates

Available templates:
- `job_posted` - When a client posts a job
- `job_available_nearby` - Location-based job notifications for workers
- `job_application_received` - When someone applies for a client's job
- `application_accepted` - When a worker's application is accepted
- `application_rejected` - When a worker's application is rejected
- `booking_created` - When a client creates a booking request
- `new_booking` - When a provider receives a new booking request
- `booking_approved` - When a booking is confirmed
- `booking_completed` - When a service is completed
- `job_completed` - When a job is marked as completed

## Testing

### Manual Testing
```bash
# Test the email system
npx tsx scripts/test-emails.ts
```

### API Testing
```bash
# Send pending emails manually
curl -X POST http://localhost:3000/api/email/send
```

## Production Deployment

### Vercel Cron Jobs
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/send-emails",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Environment Variables
Set these in your Vercel dashboard:
- `RESEND_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Location-Based Notifications

The system automatically notifies workers when jobs are posted in their location:

1. **Exact Match**: Currently uses exact location string matching
2. **Future Enhancement**: Can be upgraded to radius-based (lat/lng) matching
3. **Filtering**: Excludes the job poster from receiving their own job notifications

## Monitoring

### Check Email Queue Status
```sql
SELECT status, COUNT(*) as count
FROM email_queue
GROUP BY status;
```

### View Failed Emails
```sql
SELECT * FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Manual Retry
```sql
UPDATE email_queue
SET status = 'pending', retry_count = 0
WHERE status = 'failed' AND retry_count < max_retries;
```

## Troubleshooting

### Common Issues

1. **Emails not sending**: Check Resend API key and quota
2. **Template errors**: Verify template data matches expected format
3. **Location notifications not working**: Ensure users have location and email in profiles
4. **Cron jobs not running**: Check Vercel cron configuration

### Debug Logging
All email operations are logged to the console. Check your deployment logs for issues.

## Security

- Only service role can access email queue
- Cron endpoints require authentication
- User emails are fetched securely from profiles table
- Failed email attempts are logged but not exposed to users

## Future Enhancements

- [ ] User email preferences (opt-in/opt-out)
- [ ] Radius-based location matching
- [ ] Email analytics and open tracking
- [ ] A/B testing for email templates
- [ ] SMS notifications integration