async function sendAllTemplates() {
  console.log('Sending all email templates to: kararijoel18@outlook.com');

  const templates = [
    'job_posted',
    'job_available_nearby',
    'job_application_received',
    'application_accepted'
  ];

  for (const templateType of templates) {
    try {
      console.log(`\n📧 Sending ${templateType} template...`);

      // Use the existing test endpoint
      const response = await fetch('http://localhost:3000/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });

      if (!response.ok) {
        console.error(`❌ Failed to queue ${templateType}:`, response.status);
        continue;
      }

      const result = await response.json();
      console.log(`✅ Queued ${templateType}:`, result);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
      console.error(`❌ Error with ${templateType}:`, err);
    }
  }

  console.log('\n🚀 All templates queued! Triggering email send...');

  // Trigger email send
  try {
    const response = await fetch('http://localhost:3000/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });

    const result = await response.json();
    console.log('📤 Email send result:', result);
  } catch (err) {
    console.error('❌ Error sending emails:', err);
  }
}

sendAllTemplates().catch(console.error);