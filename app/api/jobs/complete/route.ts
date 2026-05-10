import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // Handle cookie setting errors
            }
          },
        },
      }
    );

    const { data: { user }, error } = await authClient.auth.getUser();
    if (error) {
      console.error('[api/jobs/complete] Auth error:', error);
      return null;
    }
    return user;
  } catch (err) {
    console.error('[api/jobs/complete] Unexpected auth error:', err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Job completion API called');

    let body;
    try {
      body = await req.json();
      console.log('Request body parsed:', body);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json({
        error: "Invalid request body",
        details: "Request body must be valid JSON",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const { jobId } = body;
    console.log('Job ID from request:', jobId);

    if (!jobId) {
      console.error('Missing jobId in request');
      return NextResponse.json({
        error: "Invalid request",
        details: "jobId is required",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          error: 'Server configuration error',
          details: 'Missing required environment variables',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Check if poster_id column exists, fallback to client_id only if not
    let jobQuery = sb
      .from('jobs')
      .select('id, status, client_id')
      .eq('id', jobId)
      .eq('client_id', user.id);

    try {
      const testQuery = await sb.from('jobs').select('poster_id').limit(1);
      if (!testQuery.error) {
        // poster_id column exists, include it in the query
        jobQuery = sb
          .from('jobs')
          .select('id, status, client_id, poster_id')
          .eq('id', jobId)
          .or(`client_id.eq.${user.id},poster_id.eq.${user.id}`);
      }
    } catch (e) {
      // poster_id column doesn't exist, continue with client_id only
      console.log('poster_id column not available, using client_id only');
    }

    const { data: existingJob, error: fetchError } = await jobQuery.single();

    if (fetchError) {
      console.error('Failed to fetch job:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch job',
        details: fetchError.message || fetchError.details || JSON.stringify(fetchError),
        code: fetchError.code || 'SUPABASE_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    if (!existingJob) {
      return NextResponse.json({
        error: 'Job not found',
        details: `No job found with ID: ${jobId}`,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Verify ownership (should already be handled by the query, but double-check)
    const canCompleteJob = existingJob.client_id === user.id ||
      (existingJob.poster_id && existingJob.poster_id === user.id);
    if (!canCompleteJob) {
      console.warn('[api/jobs/complete] Unauthorized completion attempt', {
        userId: user.id,
        jobId,
        clientId: existingJob.client_id,
        posterId: existingJob.poster_id
      });
      return NextResponse.json({
        error: 'Forbidden',
        details: 'You are not allowed to complete this job'
      }, { status: 403 });
    }

    // Mark the job as completed - use schema-aware select
    let updateQuery = sb
      .from('jobs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Check if poster_id exists for the select
    let selectFields = 'id, title, status, client_id, updated_at';
    try {
      const testQuery = await sb.from('jobs').select('poster_id').limit(1);
      if (!testQuery.error) {
        selectFields = 'id, title, status, client_id, poster_id, updated_at';
      }
    } catch (e) {
      // poster_id column doesn't exist, continue with client_id only
    }

    const { data: jobRow, error: updateError } = await updateQuery
      .select(selectFields)
      .single();

    console.log('Update result:', { jobRow: !!jobRow, updateError: !!updateError });

    if (updateError) {
      console.error('Failed to update job:', updateError);
      const errorMessage = updateError.message || updateError.details || updateError.code || JSON.stringify(updateError);
      return NextResponse.json({
        error: "Failed to complete job",
        details: errorMessage,
        code: updateError.code || 'SUPABASE_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    if (!jobRow) {
      console.error('Job update returned no data:', jobId);
      return NextResponse.json({
        error: "Job update failed",
        details: `Update completed but no data returned for job ID: ${jobId}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    console.log('Job completed successfully');
    return NextResponse.json({
      success: true,
      message: "Job completed successfully",
      job: jobRow,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Unexpected error in job completion:', err);
    return NextResponse.json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}