import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(/;\s*/)
      .map((cookie) => {
        const [name, ...valueParts] = cookie.split("=");
        return [name, decodeURIComponent(valueParts.join("="))];
      })
      .filter(([name]) => !!name),
  );
}

function extractSupabaseAccessToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);

  const maybeToken =
    cookies["sb-access-token"] ||
    cookies["sb:token"] ||
    cookies["supabase-access-token"];

  if (maybeToken) {
    return maybeToken;
  }

  const supabaseAuthToken = cookies["supabase-auth-token"];
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
      console.warn("[api/bookings/approve] Failed to parse supabase-auth-token cookie", error);
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
    console.warn('[api/bookings/approve] Failed to decode access token', error);
    return null;
  }
}

/**
 * Server-side endpoint to approve/update a booking using the Supabase service role key.
 * This bypasses RLS but enforces ownership checks so only the booking client or service provider can update status.
 *
 * Requires env var: SUPABASE_SERVICE_ROLE_KEY
 */
export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: 'Request body must be valid JSON'
      }, { status: 400 });
    }

    const accessToken =
      body?.accessToken ||
      extractSupabaseAccessToken(req);

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Missing authentication token' }, { status: 401 });
    }

    const userId = getUserIdFromJwt(accessToken);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Invalid authentication token' }, { status: 401 });
    }

    const { bookingId, status } = body;

    if (!bookingId) {
      return NextResponse.json({ 
        error: 'Invalid request',
        details: 'bookingId is required'
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        },
        { status: 500 }
      );
    }

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: bookingRow, error: bookingError } = await sb
      .from('bookings')
      .select('id, client_id, service_id')
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('[api/bookings/approve] Failed to fetch booking', bookingError);
      return NextResponse.json({ error: 'Failed to fetch booking', details: bookingError.message || String(bookingError) }, { status: 500 });
    }

    if (!bookingRow) {
      return NextResponse.json({ error: 'Booking not found', details: `No booking found with ID: ${bookingId}` }, { status: 404 });
    }

    const { data: serviceRow, error: serviceError } = await sb
      .from('services')
      .select('provider_id')
      .eq('id', bookingRow.service_id)
      .single();

    if (serviceError) {
      console.error('[api/bookings/approve] Failed to fetch service', serviceError);
      return NextResponse.json({ error: 'Failed to fetch service', details: serviceError.message || String(serviceError) }, { status: 500 });
    }

    const isClientOwner = bookingRow.client_id === userId;
    const isServiceProvider = serviceRow?.provider_id === userId;

    if (!isClientOwner && !isServiceProvider) {
      console.warn('[api/bookings/approve] Forbidden user', { userId, bookingClient: bookingRow.client_id, serviceProvider: serviceRow?.provider_id });
      return NextResponse.json({ error: 'Forbidden: you are not allowed to update this booking' }, { status: 403 });
    }

    const newStatus = status || 'approved';

    const { data: updatedBooking, error: updateError } = await sb
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      const errorMessage = updateError.message || updateError.code || String(updateError);
      return NextResponse.json({ 
        error: 'Failed to update booking',
        details: errorMessage,
        code: updateError.code || 'SUPABASE_ERROR'
      }, { status: 500 });
    }

    if (!updatedBooking) {
      return NextResponse.json({ 
        error: 'Booking not found',
        details: `No booking found with ID: ${bookingId}`
      }, { status: 404 });
    }

    const [profileRes, serviceRes] = await Promise.all([
      sb.from('profiles').select('id, full_name, avatar_url, email').eq('id', updatedBooking.client_id).maybeSingle(),
      sb.from('services').select('id, provider_id, name, price, duration').eq('id', updatedBooking.service_id).maybeSingle(),
    ]);

    const enriched = {
      ...updatedBooking,
      profiles: profileRes?.data ?? null,
      services: serviceRes?.data ?? null,
    };

    try {
      const sendEndpoint = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/api/email/send`
        : new URL('/api/email/send', req.url).toString();

      const emailResponse = await fetch(sendEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!emailResponse.ok) {
        const emailResult = await emailResponse.text().catch(() => 'Unable to read response');
        console.warn('[api/bookings/approve] Immediate email send failed', emailResponse.status, emailResult);
      }
    } catch (emailErr) {
      console.warn('[api/bookings/approve] Immediate email send exception', emailErr);
    }

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[api/bookings/approve] Unexpected error', err);
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
  }
}
