import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from '@supabase/supabase-js';
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Create service role client for admin operations (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { revieweeId, rating, comment, reviewerRole, bookingId, jobId, accessToken } = body;
    let booking: any = null;
    let job: any = null;

    console.log('Reviews API: Received request:', {
      revieweeId,
      rating,
      comment: comment ? '[redacted]' : null,
      reviewerRole,
      bookingId,
      jobId,
      hasAccessToken: !!accessToken,
      hasAuthHeader: !!(req.headers.get('authorization') || '').startsWith('Bearer ')
    });


    // Validate required fields
    if (!revieweeId || rating === undefined || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields: revieweeId, rating, comment' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = accessToken || bearerToken;

    if (token) {
      const { error: sessionError } = await supabase.auth.setSession({ access_token: token });
      if (sessionError) {
        console.warn('Reviews API: auth.setSession failed with provided token', sessionError);
      }
    }

    // Get authenticated user
    const { data: { user } = {} as any, error: userErr } = await supabase.auth.getUser();
    
    if (userErr) {
      console.error('Error fetching authenticated user in reviews POST:', userErr);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!user) {
      console.error('Reviews API: Authentication required - no user found', {
        tokenProvided: !!token,
        authHeader: authHeader ? '[redacted]' : null,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviewer_id = user.id;

    // Validate reviewee_id is not the same as reviewer_id
    if (reviewer_id === revieweeId) {
      return NextResponse.json(
        { error: 'Cannot review yourself' },
        { status: 400 }
      );
    }

    // Validate reviewee exists
    const { data: revieweeProfile, error: revieweeErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', revieweeId)
      .single();

    if (revieweeErr || !revieweeProfile) {
      console.error('Reviewee profile not found:', { revieweeId, error: revieweeErr });
      return NextResponse.json(
        { error: 'Reviewee profile not found' },
        { status: 404 }
      );
    }

    // If bookingId is provided, validate booking exists and user is involved
    if (bookingId) {
      console.log('Reviews API: Validating bookingId:', bookingId, 'for reviewer:', reviewer_id);
      const { data, error: bookingErr } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, service_id, services!inner(provider_id)')
        .eq('id', bookingId)
        .single();
      booking = data;

      console.log('Reviews API: Booking query result:', { booking, error: bookingErr });

      if (bookingErr || !booking) {
        console.error('Booking not found:', { bookingId, error: bookingErr });
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      // Check if the reviewer is the client of this booking
      if (reviewer_id !== booking.client_id) {
        console.error('Reviews API: User is not the client of this booking', {
          reviewer_id,
          booking_client_id: booking.client_id,
          bookingId
        });
        return NextResponse.json(
          { error: 'You are not the client of this booking' },
          { status: 403 }
        );
      }

      // Extract provider_id from the joined services data
      const providerId = booking.services?.provider_id;
      console.log('Reviews API: Extracted providerId:', providerId, 'from booking:', booking);

      if (!providerId) {
        console.error('Booking has no associated service provider:', booking);
        return NextResponse.json(
          { error: 'Booking has invalid service association' },
          { status: 500 }
        );
      }

      // Validate the reviewee is the provider
      if (revieweeId !== providerId) {
        console.error('Reviews API: Reviewee is not the provider of this booking', {
          revieweeId,
          providerId,
          bookingId
        });
        return NextResponse.json(
          { error: 'Reviewee must be the provider of this booking' },
          { status: 400 }
        );
      }
    }

    // If jobId is provided, validate job exists and user is involved
    if (jobId) {
      console.log('Reviews API: Validating jobId:', jobId, 'type:', typeof jobId, 'for reviewer:', reviewer_id);
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(jobId)) {
        console.error('Invalid jobId format:', jobId);
        return NextResponse.json(
          { error: 'Invalid job ID format' },
          { status: 400 }
        );
      }

      let jobErr: any = null;

      const selectJob = async (fields: string) => {
        return await supabaseAdmin
          .from('jobs')
          .select(fields)
          .eq('id', jobId)
          .single();
      };

      ({ data: job, error: jobErr } = await selectJob('id, poster_id, client_id, title, status'));

      if (jobErr && /column .*poster_id.*does not exist/i.test(jobErr.message || '')) {
        console.warn('Reviews API: jobs.poster_id column missing, retrying with client_id');
        ({ data: job, error: jobErr } = await selectJob('id, client_id, title, status'));
      }

      console.log('Reviews API: Job query result:', { job, error: jobErr });

      if (jobErr || !job) {
        console.error('Job not found:', { jobId, error: jobErr });
        return NextResponse.json(
          { error: 'Job not found', details: `Job ID: ${jobId}, Error: ${jobErr?.message || 'No job returned'}` },
          { status: 404 }
        );
      }

      const jobOwnerId = job.poster_id || job.client_id;
      if (!jobOwnerId) {
        console.error('Job record missing both poster_id and client_id:', job);
        return NextResponse.json(
          { error: 'Job ownership information missing' },
          { status: 500 }
        );
      }

      // For job reviews, either:
      // 1. The reviewer is the job owner (client reviewing worker)
      // 2. The reviewee is the job owner (worker reviewing client)
      const isReviewerJobOwner = reviewer_id === jobOwnerId;
      const isRevieweeJobOwner = revieweeId === jobOwnerId;

      console.log('Reviews API: Job validation:', {
        reviewer_id,
        revieweeId,
        jobOwnerId,
        isReviewerJobOwner,
        isRevieweeJobOwner,
        reviewerRole
      });

      if (!isReviewerJobOwner && !isRevieweeJobOwner) {
        console.error('Reviews API: Neither reviewer nor reviewee is job owner');
        return NextResponse.json(
          { error: 'Review must involve the job owner (poster/client)' },
          { status: 403 }
        );
      }
    }

    // Check if a review already exists (prevent duplicates)
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('reviewer_id', reviewer_id)
      .eq('reviewee_id', revieweeId)
      .match(bookingId ? { booking_id: bookingId } : {})
      .match(jobId ? { job_id: jobId } : {})
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this user for this transaction' },
        { status: 409 }
      );
    }

    // Determine required client/provider associations for the review record
    let clientId: string | null = null;
    let providerId: string | null = null;

    if (bookingId) {
      clientId = booking?.client_id || null;
      providerId = booking?.services?.provider_id || null;
    }

    if (jobId) {
      const jobOwnerId = job?.poster_id || job?.client_id || null;
      clientId = jobOwnerId;
      providerId = revieweeId === jobOwnerId ? reviewer_id : revieweeId;
    }

    if (!clientId || !providerId) {
      console.error('Unable to determine client/provider ids for review insert', {
        bookingId,
        jobId,
        clientId,
        providerId,
        reviewer_id,
        revieweeId,
        booking,
        job,
      });
      return NextResponse.json(
        { error: 'Unable to determine review participants for insertion' },
        { status: 500 }
      );
    }

    // Insert the review
    const { data: insertData, error: insertErr } = await supabaseAdmin
      .from('reviews')
      .insert({
        reviewer_id,
        reviewee_id: revieweeId,
        client_id: clientId,
        provider_id: providerId,
        rating,
        comment,
        booking_id: bookingId || null,
        job_id: jobId || null,
      })
      .select('id')
      .single();

    console.log('Insert result:', { insertData, insertErr: insertErr ? { message: insertErr.message, code: insertErr.code } : null });

    if (insertErr) {
      console.error('Error inserting review:', insertErr);
      return NextResponse.json(
        { error: 'Failed to submit review', details: insertErr.message },
        { status: 500 }
      );
    }

    // Fetch the created review
    const { data: newReview, error: fetchErr } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', insertData.id)
      .single();

    console.log('Fetch result:', { newReview, fetchErr });

    if (fetchErr) {
      console.error('Error fetching created review:', fetchErr);
      return NextResponse.json(
        { error: 'Review created but failed to fetch', details: fetchErr.message },
        { status: 500 }
      );
    }

    console.log('Review created successfully:', newReview);
    console.log('Returning response:', { data: newReview });

    if (!newReview) {
      console.error('newReview is null/undefined!');
      return NextResponse.json(
        { error: 'Review creation failed - no data returned' },
        { status: 500 }
      );
    }

    // Try a simple response first
    const responseData = { data: newReview };
    console.log('Final response data:', JSON.stringify(responseData));

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('Reviews API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}
