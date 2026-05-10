import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
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
            } catch { }
          },
        },
      }
    );

    const { data: pendingEmails, error: fetchError } = await supabase
      .rpc('get_pending_emails', { limit_count: 50 });

    if (fetchError || !pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({ message: 'No pending emails', count: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      try {
        const subject = getEmailSubject(email.template_type);
        const html = getEmailHtml(email.template_type, email.template_data);

        if (!html) {
          failed++;
          continue;
        }

        const result = await resend.emails.send({
          from: 'Local Fix Kenya <noreply@localfixkenya.com>',
          to: email.recipient_email,
          subject: subject,
          html: html
        });

        if (result.error) {
          failed++;
        } else {
          sent++;
          // Mark as sent in database
          try {
            await supabase.rpc('mark_email_sent', { p_email_id: email.id });
          } catch (err) {
            // Silently ignore database update errors
          }
        }
      } catch (err) {
        failed++;
      }
    }

    return NextResponse.json({
      sent,
      failed,
      total: pendingEmails.length
    });

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getEmailSubject(type: string): string {
  const subjects: Record<string, string> = {
    job_posted: 'Your job has been posted successfully!',
    job_available_nearby: 'New job opportunity near you!',
    job_application_received: 'New application for your job',
    application_accepted: 'Congratulations! Your application was accepted',
    application_rejected: 'Your job application was not selected',
    new_booking: 'You have a new booking request',
    booking_created: 'Your booking request has been submitted',
    booking_approved: 'Your booking has been approved',
    booking_completed: 'Your booking is complete',
  };
  return subjects[type] || 'Local Fix Kenya Notification';
}

function getEmailHtml(type: string, data: any): string | null {
  switch (type) {
    case 'job_posted':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Job Posted</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #1e40af; text-align: center;">Job Posted Successfully! 🎉</h1>
    <p>Your job has been posted and is now visible to workers in your area.</p>
    <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1e40af;">
      <p><strong>Job Title:</strong> ${data.job_title || 'N/A'}</p>
      <p><strong>Location:</strong> ${data.job_location || 'N/A'}</p>
      <p><strong>Budget:</strong> KES ${data.job_budget || 'N/A'}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/jobs/${data.job_id || ''}" style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Job Details</a>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Local Fix Kenya</p>
  </div>
</body>
</html>`;

    case 'job_available_nearby':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>New Job Opportunity</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #059669;">New Job Opportunity Near You! 💼</h1>
    <p>Hi ${data.recipient_name || 'there'},</p>
    <p>A new job has been posted in your location that matches your skills.</p>
    <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #059669;">
      <p><strong>Job Title:</strong> ${data.job_title || 'N/A'}</p>
      <p><strong>Location:</strong> ${data.job_location || 'N/A'}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/jobs/${data.job_id || ''}" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Job & Apply</a>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Local Fix Kenya</p>
  </div>
</body>
</html>`;

    case 'job_application_received':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>New Application</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #7c3aed;">New Job Application! 📋</h1>
    <p>You have a new application for your job posting.</p>
    <div style="background: #faf5ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
      <p><strong>Job:</strong> ${data.job_title || 'N/A'}</p>
      <p><strong>Applicant:</strong> ${data.applicant_name || 'N/A'}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/jobs/${data.job_id || ''}" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Review Application</a>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Local Fix Kenya</p>
  </div>
</body>
</html>`;

    case 'application_accepted':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Application Accepted</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #059669; text-align: center;">Congratulations! 🎉</h1>
    <p>Your job application has been accepted.</p>
    <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #059669;">
      <p><strong>Job:</strong> ${data.job_title || 'N/A'}</p>
      <p><strong>Status:</strong> ✅ Accepted</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/jobs/${data.job_id || ''}" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Job Details</a>
    </div>
    <p>Contact the client to discuss next steps and get started on the job.</p>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Local Fix Kenya</p>
  </div>
</body>
</html>`;

    case 'application_rejected':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Application Rejected</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #dc2626; text-align: center;">Application Update</h1>
    <p>Unfortunately, your job application has not been selected.</p>
    <div style="background: #fff1f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <p><strong>Job:</strong> ${data.job_title || 'N/A'}</p>
      <p><strong>Status:</strong> ❌ Rejected</p>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Keep applying to other jobs in your area.</p>
  </div>
</body>
</html>`;

    case 'new_booking':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>New Booking Request</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #0f766e;">New Booking Request</h1>
    <p>You have received a new booking request.</p>
    <div style="background: #ecfeff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0f766e;">
      <p><strong>Service:</strong> ${data.service_name || 'N/A'}</p>
      <p><strong>Booking ID:</strong> ${data.booking_id || 'N/A'}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/bookings/${data.booking_id || ''}" style="background: #0f766e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Booking</a>
    </div>
  </div>
</body>
</html>`;

    case 'booking_created':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Booking Request Submitted</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #0f766e;">Booking Request Submitted</h1>
    <p>Your booking request has been submitted successfully.</p>
    <div style="background: #ecfeff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0f766e;">
      <p><strong>Service:</strong> ${data.service_name || 'N/A'}</p>
      <p><strong>Booking ID:</strong> ${data.booking_id || 'N/A'}</p>
    </div>
    <p>You will be notified once the provider approves your booking request.</p>
  </div>
</body>
</html>`;

    case 'booking_approved':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Booking Approved</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #0c4a6e;">Booking Confirmed ✅</h1>
    <p>Your booking request has been approved.</p>
    <div style="background: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0c4a6e;">
      <p><strong>Booking ID:</strong> ${data.booking_id || 'N/A'}</p>
    </div>
  </div>
</body>
</html>`;

    case 'booking_completed':
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Booking Completed</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #059669;">Booking Completed</h1>
    <p>Your booking has been completed successfully.</p>
    <div style="background: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #059669;">
      <p><strong>Booking ID:</strong> ${data.booking_id || 'N/A'}</p>
    </div>
  </div>
</body>
</html>`;

    default:
      return null;
  }
}
