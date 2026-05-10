import { NextRequest, NextResponse } from 'next/server';

// Cron job to send queued emails every 5 minutes
// This route can be configured as a cron job in Vercel
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Trigger email sending
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Cron email send failed:', result);
      return NextResponse.json({ error: 'Email sending failed', details: result }, { status: 500 });
    }

    console.log('Cron email send successful:', result);
    return NextResponse.json({ message: 'Emails sent successfully', result });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}