import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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

    // Check email queue status
    const { data: queueData, error: queueError } = await supabase
      .from('email_queue')
      .select('status');

    let queueStatus = [];
    if (!queueError && queueData) {
      const statusCounts = queueData.reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      queueStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));
    }

    if (queueError) {
      console.error('Error checking queue status:', queueError);
      return NextResponse.json({
        error: 'Email queue table may not exist',
        details: queueError.message
      }, { status: 500 });
    }

    // Get pending emails
    const { data: pendingEmails, error: pendingError } = await supabase
      .rpc('get_pending_emails', { limit_count: 5 });

    if (pendingError) {
      console.error('Error getting pending emails:', pendingError);
      return NextResponse.json({
        error: 'get_pending_emails function may not exist',
        details: pendingError.message
      }, { status: 500 });
    }

    // Get sample user with email
    const { data: sampleUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name, location')
      .not('email', 'is', null)
      .neq('email', '')
      .limit(1)
      .single();

    return NextResponse.json({
      queueStatus: queueStatus || [],
      pendingEmailsCount: pendingEmails?.length || 0,
      sampleUser: sampleUser ? {
        id: sampleUser.id,
        email: sampleUser.email,
        name: sampleUser.full_name,
        location: sampleUser.location
      } : null,
      databaseSetupComplete: !queueError && !pendingError
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}