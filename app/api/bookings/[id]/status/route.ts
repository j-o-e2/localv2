import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(/;\s*/)
      .map((cookie) => {
        const [name, ...valueParts] = cookie.split('=');
        return [name, decodeURIComponent(valueParts.join('='))];
      })
      .filter(([name]) => !!name),
  );
}

function extractSupabaseAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);

  const maybeToken =
    cookies['sb-access-token'] ||
    cookies['sb:token'] ||
    cookies['supabase-access-token'];

  if (maybeToken) {
    return maybeToken;
  }

  const supabaseAuthToken = cookies['supabase-auth-token'];
  if (supabaseAuthToken) {
    try {
      const parsed = JSON.parse(supabaseAuthToken);
      return (
        parsed?.currentSession?.access_token ||
        parsed?.access_token ||
        parsed?.token ||
        null
      );
    } catch (error) {
      console.warn('[api/bookings/[id]/status] Failed to parse supabase-auth-token cookie', error);
    }
  }

  return null;
}

function getUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = typeof Buffer !== 'undefined'
      ? Buffer.from(payloadBase64, 'base64').toString('utf-8')
      : decodeURIComponent(Array.prototype.map.call(atob(payloadBase64), (c: string) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join(''));
    const payload = JSON.parse(decoded);
    return payload?.sub || null;
  } catch (error) {
    console.warn('[api/bookings/[id]/status] Failed to decode access token', error);
    return null;
  }
}

async function getAuthenticatedUserId(request: NextRequest) {
  const accessToken = extractSupabaseAccessToken(request);
  if (!accessToken) return null;
  return getUserIdFromJwt(accessToken);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const accessToken = body?.accessToken || extractSupabaseAccessToken(request);
    const userId = accessToken ? getUserIdFromJwt(accessToken) : null;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Missing or invalid authentication token' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const allowedStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error', details: 'Missing Supabase env vars' }, { status: 500 });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: bookingRecord, error: bookingError } = await serviceClient
      .from('bookings')
      .select('id, client_id, service_id')
      .eq('id', id)
      .single();

    if (bookingError) {
      console.error('[api/bookings/[id]/status] Failed to fetch booking', bookingError);
      return NextResponse.json({ error: 'Failed to fetch booking', details: bookingError.message || String(bookingError) }, { status: 500 });
    }

    if (!bookingRecord) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const { data: serviceRecord, error: serviceError } = await serviceClient
      .from('services')
      .select('provider_id')
      .eq('id', bookingRecord.service_id)
      .single();

    if (serviceError) {
      console.error('[api/bookings/[id]/status] Failed to fetch service', serviceError);
      return NextResponse.json({ error: 'Failed to fetch service', details: serviceError.message || String(serviceError) }, { status: 500 });
    }

    const isClientOwner = bookingRecord.client_id === userId;
    const isServiceProvider = serviceRecord?.provider_id === userId;

    if (!isClientOwner && !isServiceProvider) {
      return NextResponse.json({ error: 'Forbidden: you are not allowed to update this booking' }, { status: 403 });
    }

    const { data, error } = await serviceClient
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating booking status:', error);
      return NextResponse.json(
        { error: 'Failed to update booking status', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error in PATCH /api/bookings/:id/status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
