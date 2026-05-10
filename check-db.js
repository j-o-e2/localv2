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

async function checkAndCreateSampleData() {
  try {
    console.log('Checking database...');

    // Check total jobs
    const { count: totalJobs, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    console.log('Total jobs:', totalJobs);

    // Check open jobs
    const { data: openJobs, error: openError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .limit(5);

    console.log('Open jobs:', openJobs?.length || 0);

    if (openJobs && openJobs.length > 0) {
      console.log('Sample open job:', openJobs[0]);
    }

    // If no jobs, create some sample ones
    if (totalJobs === 0) {
      console.log('No jobs found. Creating sample jobs...');

      // First, let's check if there's a sample user
      const { data: users } = await supabase.auth.admin.listUsers();
      let clientId = null;

      if (users && users.users.length > 0) {
        clientId = users.users[0].id;
        console.log('Using existing user ID:', clientId);
      } else {
        console.log('No users found. Please create a user first.');
        return;
      }

      const sampleJobs = [
        {
          title: 'Fix Leaking Kitchen Faucet',
          description: 'Need an experienced plumber to fix a leaking kitchen faucet. The faucet has been dripping for weeks and needs immediate attention.',
          category: 'Plumbing',
          budget: 2500,
          budget_type: 'fixed',
          location: 'Nairobi CBD',
          duration: '2-3 hours',
          status: 'open',
          client_id: clientId,
          required_skills: ['Plumbing', 'Pipe Fitting']
        },
        {
          title: 'Electrical Wiring Installation',
          description: 'Install new electrical wiring for a small office space. Need to add outlets and lighting fixtures.',
          category: 'Electrical',
          budget: 15000,
          budget_type: 'fixed',
          location: 'Westlands, Nairobi',
          duration: '1-2 days',
          status: 'open',
          client_id: clientId,
          required_skills: ['Electrical Work', 'Wiring']
        },
        {
          title: 'House Painting - Living Room',
          description: 'Paint the living room of a 3-bedroom apartment. Walls need to be prepared and painted with quality paint.',
          category: 'Painting',
          budget: 8000,
          budget_type: 'fixed',
          location: 'Kilimani, Nairobi',
          duration: '2-3 days',
          status: 'open',
          client_id: clientId,
          required_skills: ['Painting', 'Surface Preparation']
        },
        {
          title: 'Garden Maintenance Service',
          description: 'Monthly garden maintenance including lawn mowing, weed removal, and plant care for a residential property.',
          category: 'Landscaping',
          budget: 5000,
          budget_type: 'fixed',
          location: 'Karen, Nairobi',
          duration: '4 hours',
          status: 'open',
          client_id: clientId,
          required_skills: ['Gardening', 'Lawn Care']
        },
        {
          title: 'Deep House Cleaning',
          description: 'Complete deep cleaning of a 4-bedroom house including all rooms, kitchen, bathrooms, and common areas.',
          category: 'Cleaning',
          budget: 12000,
          budget_type: 'fixed',
          location: 'Kileleshwa, Nairobi',
          duration: '6-8 hours',
          status: 'open',
          client_id: clientId,
          required_skills: ['House Cleaning', 'Deep Cleaning']
        },
        {
          title: 'Custom Bookshelf Installation',
          description: 'Install custom-built bookshelves in a home office. Shelves are already built and just need to be mounted and secured.',
          category: 'Carpentry',
          budget: 6000,
          budget_type: 'fixed',
          location: 'Parklands, Nairobi',
          duration: '3-4 hours',
          status: 'open',
          client_id: clientId,
          required_skills: ['Carpentry', 'Installation']
        }
      ];

      for (const job of sampleJobs) {
        const { data, error } = await supabase
          .from('jobs')
          .insert([job])
          .select();

        if (error) {
          console.error('Error creating job:', error);
        } else {
          console.log('Created job:', data[0].title);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndCreateSampleData();