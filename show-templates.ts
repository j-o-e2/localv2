// Display all email templates
const templates = {
  job_posted: {
    subject: 'Your job has been posted successfully!',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Job Posted</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #1e40af; text-align: center;">Job Posted Successfully! 🎉</h1>
    <p>Your job has been posted and is now visible to workers in your area.</p>
    <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1e40af;">
      <p><strong>Job Title:</strong> Fix Leaky Faucet</p>
      <p><strong>Location:</strong> Nairobi CBD</p>
      <p><strong>Budget:</strong> KES 2500</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000/jobs/test-job-123" style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Job Details</a>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Local Fix Kenya</p>
  </div>
</body>
</html>`
  },

  job_available_nearby: {
    subject: 'New job opportunity near you!',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>New Job Opportunity</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #059669;">New Job Opportunity Near You! 💼</h1>
    <p>Hi John Worker,</p>
    <p>A new job has been posted in your location that matches your skills.</p>
    <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #059669;">
      <p><strong>Job Title:</strong> Paint Living Room</p>
      <p><strong>Location:</strong> Westlands</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000/jobs/test-job-456" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Job & Apply</a>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Local Fix Kenya</p>
  </div>
</body>
</html>`
  },

  job_application_received: {
    subject: 'New application for your job',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>New Application</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #7c3aed;">New Job Application! 📋</h1>
    <p>You have a new application for your job posting.</p>
    <div style="background: #faf5ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
      <p><strong>Job:</strong> Install Security Lights</p>
      <p><strong>Applicant:</strong> Sarah Contractor</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000/jobs/test-job-789" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Review Application</a>
    </div>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Local Fix Kenya</p>
  </div>
</body>
</html>`
  },

  application_accepted: {
    subject: 'Congratulations! Your application was accepted',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Application Accepted</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
    <h1 style="color: #059669; text-align: center;">Congratulations! 🎉</h1>
    <p>Excellent news! Your job application has been accepted.</p>
    <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #059669;">
      <p><strong>Job:</strong> Repair Broken Window</p>
      <p><strong>Status:</strong> ✅ Accepted</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000/jobs/test-job-101" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Job Details</a>
    </div>
    <p>Contact the client to discuss next steps and get started on the job.</p>
    <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Local Fix Kenya</p>
  </div>
</body>
</html>`
  }
};

console.log('📧 EMAIL TEMPLATES FOR LOCAL FIX KENYA\n');
console.log('========================================\n');

Object.entries(templates).forEach(([type, template]) => {
  console.log(`🎯 ${type.toUpperCase()} TEMPLATE`);
  console.log(`Subject: ${template.subject}`);
  console.log(`HTML Preview: ${template.html.substring(0, 200)}...`);
  console.log('\n' + '='.repeat(50) + '\n');
});

console.log('✅ All 4 email templates are ready!');
console.log('📧 They will be sent automatically when users interact with your app.');
console.log('🔄 Templates are processed by /api/email/send every 5 minutes via cron job.');