const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function testHomeData() {
  console.log('Testing home-data API logic...');

  // Simulate the home-data API logic
  const { data: services } = await supabase
    .from('services')
    .select('*, profiles:provider_id (full_name, avatar_url)')
    .in('status', ['open', 'pending'])
    .order('created_at', { ascending: false })
    .limit(4);

  console.log('Raw services:', services?.length || 0);

  // Add categories
  const categorizedServices = services?.map(service => {
    const name = service.name?.toLowerCase() || '';
    const description = service.description?.toLowerCase() || '';

    let category = 'Other';
    if (name.includes('paint') || description.includes('paint')) category = 'Painting';
    else if (name.includes('plumb') || description.includes('plumb') || name.includes('faucet') || description.includes('faucet')) category = 'Plumbing';
    else if (name.includes('electr') || description.includes('electr') || name.includes('wiring') || description.includes('wiring')) category = 'Electrical';
    else if (name.includes('carpent') || description.includes('carpent') || name.includes('wood') || description.includes('wood')) category = 'Carpentry';
    else if (name.includes('clean') || description.includes('clean')) category = 'Cleaning';
    else if (name.includes('garden') || description.includes('garden') || name.includes('lawn') || description.includes('lawn')) category = 'Landscaping';
    else if (name.includes('comput') || description.includes('comput') || name.includes('data') || description.includes('data')) category = 'IT Services';
    else if (name.includes('sound') || description.includes('sound') || name.includes('audio') || description.includes('audio')) category = 'Audio/Visual';
    else if (name.includes('veterinar') || description.includes('veterinar') || name.includes('animal') || description.includes('animal')) category = 'Veterinary';

    return { ...service, category };
  });

  console.log('Categorized services:');
  categorizedServices?.forEach((service, i) => {
    console.log(`  ${i+1}. ${service.name} - ${service.category} - KSh ${service.price}`);
  });

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('Jobs:');
  jobs?.forEach((job, i) => {
    console.log(`  ${i+1}. ${job.title} - ${job.category} - ${job.location} - KSh ${job.budget}`);
  });
}

testHomeData().catch(console.error);