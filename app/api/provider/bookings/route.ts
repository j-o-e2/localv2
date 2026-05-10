import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider_id');

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    console.log('Fetching bookings for provider:', providerId);

    // Get services by this provider
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id')
      .eq('provider_id', providerId);

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      return NextResponse.json({ error: servicesError.message }, { status: 500 });
    }

    console.log('Services found:', services);

    const serviceIds = services?.map(s => s.id) || [];

    if (serviceIds.length === 0) {
      console.log('No services found for provider');
      return NextResponse.json({ bookings: [], services: [] });
    }

    // Get bookings for provider's services
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services:service_id (
          id,
          name,
          price,
          category,
          provider_id
        ),
        profiles:client_id (
          id,
          full_name,
          phone,
          email,
          location
        )
      `)
      .in('service_id', serviceIds)
      .order('booking_date', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Bookings found:', data?.length || 0);
    return NextResponse.json({ bookings: data || [], services });
  } catch (error: any) {
    console.error('Error in provider bookings GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}