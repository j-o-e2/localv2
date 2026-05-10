import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Try anon key first, then service role
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('=== Home Data API ===')
  console.log('URL:', supabaseUrl ? 'present' : 'missing')
  console.log('Key:', supabaseKey ? 'present' : 'missing')
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing config')
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch newest services first (filter by appropriate status)
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*, profiles:provider_id (full_name, avatar_url)')
      .in('status', ['open', 'pending'])  // Include services that are available
      .order('created_at', { ascending: false })
      .limit(4)
    
    console.log('Services query result:', { services: services?.length || 0, error: servicesError })
    
    // Add categories to services based on keywords in name/description
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
    
    // Fetch newest open jobs first
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(3)
    
    console.log('Jobs query result:', { jobs: jobs?.length || 0, error: jobsError })
    if (jobs && jobs.length > 0) {
      console.log('Sample job:', jobs[0])
    }
    
    // Also check total jobs count
    const { count: totalJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
    console.log('Total jobs in database:', totalJobs)
    
    // Fetch positive reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*, profiles:reviewee_id (full_name)')
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(3)
    
    console.log('Reviews query result:', { reviews: reviews?.length || 0, error: reviewsError })
    
    console.log('Results - Services:', services?.length, 'Jobs:', jobs?.length, 'Reviews:', reviews?.length)
    
    return NextResponse.json({
      services: categorizedServices || [],
      jobs: jobs || [],
      reviews: reviews || [],
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}