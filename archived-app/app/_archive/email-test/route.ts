import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore cookie set errors
            }
          },
        },
      }
    );

    // Create or update user with the test email
    const testEmail = 'kararijoel18@outlook.com';
    const { data: customUser, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: `test-user-${Date.now()}`,
        email: testEmail,
        full_name: 'Test User',
        role: 'worker',
        location: 'Nairobi'
      }, { onConflict: 'email' })
      .select('id, email, full_name')
      .single();

    if (upsertError) {
      return NextResponse.json({
        error: 'Failed to create test user',
        details: upsertError.message
      }, { status: 500 });
    }

    // Cycle through different template types
    const templates = [
      {
        type: 'job_posted',
        data: {
          job_title: 'Fix Leaky Faucet',
          job_location: 'Nairobi CBD',
          job_budget: '2500',
          job_id: 'test-job-123'
        }
      },
      {
        type: 'job_available_nearby',
        data: {
          job_title: 'Paint Living Room',
          job_location: 'Westlands',
          job_id: 'test-job-456',
          recipient_name: 'John Worker'
        }
      },
      {
        type: 'job_application_received',
        data: {
          job_title: 'Install Security Lights',
          applicant_name: 'Sarah Contractor',
          job_id: 'test-job-789'
        }
      },
      {
        type: 'application_accepted',
        data: {
          job_title: 'Repair Broken Window',
          job_id: 'test-job-101'
        }
      }
    ];

    // Get current count to cycle through templates
    const { count } = await supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', testEmail);

    const templateIndex = count ? count % templates.length : 0;
    const template = templates[templateIndex];

    // Queue the email
    const { data: queueResult, error: queueError } = await supabase
      .rpc('queue_email_notification', {
        p_user_id: customUser.id,
        p_notification_id: null,
        p_template_type: template.type,
        p_template_data: template.data,
        p_priority: 1
      });

    if (queueError) {
      return NextResponse.json({
        error: 'Failed to queue test email',
        details: queueError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      message: `${template.type} email queued successfully`,
      user: { email: customUser.email, name: customUser.full_name },
      templateType: template.type,
      queueId: queueResult
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}