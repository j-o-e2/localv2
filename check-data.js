const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
const envVars = {};

envLines.forEach(line => {
  if (line.includes('=')) {
    const parts = line.split('=');
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('Checking current data...');

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Open jobs found:', jobs?.length || 0);
  jobs?.forEach((job, i) => {
    console.log(`Job ${i+1}: ${job.title} - ${job.location} - KSh ${job.budget}`);
  });

  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Services found:', services?.length || 0);
  services?.forEach((service, i) => {
    console.log(`Service ${i+1}: ${service.name} - ${service.category || 'No category'} - KSh ${service.price}`);
    console.log(`  Full data:`, JSON.stringify(service, null, 2));
  });
}

checkData().catch(console.error);