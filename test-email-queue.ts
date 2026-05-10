import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testEmailQueue() {
  console.log('Testing email queue...');

  // First, check if email_queue table exists
  const { data: tables, error: tableError } = await supabase
    .from('email_queue')
    .select('id')
    .limit(1);

  if (tableError) {
    console.error('Email queue table does not exist:', tableError.message);
    console.log('Please run EMAIL_NOTIFICATION_SYSTEM.sql in Supabase SQL Editor first');
    return;
  }

  console.log('Email queue table exists');

  // Check current queue status
  const { data: queueStatus, error: queueError } = await supabase
    .rpc('get_pending_emails', { limit_count: 10 });

  if (queueError) {
    console.error('Error checking queue:', queueError);
    return;
  }

  console.log(`Found ${queueStatus?.length || 0} pending emails`);

  // If no pending emails, create a test one
  if (!queueStatus || queueStatus.length === 0) {
    console.log('Creating a test email...');

    // Get a user with email
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null)
      .neq('email', '')
      .limit(1)
      .single();

    if (userError || !user) {
      console.error('No users with email found');
      return;
    }

    console.log(`Using test user: ${user.email}`);

    // Queue a test email
    const { data: queueResult, error: queueError } = await supabase
      .rpc('queue_email_notification', {
        p_user_id: user.id,
        p_notification_id: null,
        p_template_type: 'job_posted',
        p_template_data: {
          job_title: 'Test Job',
          job_location: 'Test Location',
          job_budget: '5000',
          job_id: 'test-job-id'
        },
        p_priority: 1
      });

    if (queueError) {
      console.error('Error queuing test email:', queueError);
      return;
    }

    console.log('Test email queued successfully:', queueResult);
  }

  // Now test the email sending API
  console.log('Testing email sending API...');

  try {
    const response = await fetch('http://localhost:3000/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    console.log('Email API response:', result);
  } catch (error) {
    console.error('Error calling email API:', error);
  }
}

testEmailQueue().catch(console.error);