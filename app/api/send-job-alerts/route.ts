import { NextRequest, NextResponse } from 'next/server';

// Job alerts endpoint for external cron services (e.g., EasyCron, Cron-job.org)
// Call this endpoint every 5 minutes from your external cron service
// Example: https://your-domain.com/api/send-job-alerts?token=your_cron_secret
export async function GET(request: NextRequest) {
  try {
    // Verify this is an authorized request using query parameter or Bearer token
    const token = request.nextUrl.searchParams.get('token') || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (token !== process.env.CRON_SECRET) {
      console.warn('Unauthorized send-job-alerts request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Trigger email sending via the email/send endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Job alerts send failed:', result);
      return NextResponse.json({ error: 'Job alerts sending failed', details: result }, { status: 500 });
    }

    console.log('Job alerts sent successfully:', result);
    return NextResponse.json({ message: 'Job alerts sent successfully', result });

  } catch (error) {
    console.error('Job alerts error:', error);
    return NextResponse.json(
      { error: 'Job alerts failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering or from cron services that prefer POST
export async function POST(request: NextRequest) {
  return GET(request);
}
