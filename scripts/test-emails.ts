// Test script for email notification system
// Run with: npx tsx scripts/test-emails.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testEmailSystem() {
  console.log('🧪 Testing Email Notification System...\n');

  try {
    // 1. Test queueing an email
    console.log('1. Testing email queueing...');
    const { data: queueResult, error: queueError } = await supabase
      .rpc('queue_email_notification', {
        p_user_id: 'test-user-id', // Replace with actual user ID
        p_notification_id: null,
        p_template_type: 'job_posted',
        p_template_data: {
          job_title: 'Test Job',
          job_location: 'Nairobi',
          job_budget: 5000,
          job_id: 'test-job-id'
        },
        p_priority: 1
      });

    if (queueError) {
      console.error('❌ Queue error:', queueError);
    } else {
      console.log('✅ Email queued successfully:', queueResult);
    }

    // 2. Check pending emails
    console.log('\n2. Checking pending emails...');
    const { data: pendingEmails, error: pendingError } = await supabase
      .rpc('get_pending_emails', { limit_count: 10 });

    if (pendingError) {
      console.error('❌ Fetch pending error:', pendingError);
    } else {
      console.log(`📧 Found ${pendingEmails?.length || 0} pending emails`);
      if (pendingEmails && pendingEmails.length > 0) {
        console.log('Sample pending email:', pendingEmails[0]);
      }
    }

    // 3. Test location-based notifications
    console.log('\n3. Testing location-based notifications...');
    const { data: locationResult, error: locationError } = await supabase
      .rpc('notify_workers_near_location', {
        p_job_id: 'test-job-id',
        p_job_title: 'Test Job for Location',
        p_job_location: 'Nairobi',
        p_client_id: 'test-client-id'
      });

    if (locationError) {
      console.error('❌ Location notification error:', locationError);
    } else {
      console.log(`📍 Notified ${locationResult} workers in Nairobi`);
    }

    console.log('\n✅ Email system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  testEmailSystem();
}

export { testEmailSystem };