import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, action } = body;

    console.log('Action request:', { id, action, status });

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Map actions to statuses
    const statusMap: Record<string, string> = {
      'approve': 'approved',
      'reject': 'rejected',
      'complete': 'completed',
      'cancel': 'cancelled'
    };

    const newStatus = statusMap[action] || status;

    console.log('New status:', newStatus);

    if (!newStatus) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // First check if booking exists
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching booking:', fetchError);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    console.log('Existing booking:', existingBooking);

    // Update the booking status using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        services:service_id (id, name, price, provider_id),
        profiles:client_id (id, full_name, email, phone)
      `)
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Updated booking:', data);
    return NextResponse.json({ success: true, booking: data });
  } catch (error: any) {
    console.error('Error in provider booking update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}