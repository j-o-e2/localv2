-- Fix: Allow reading open jobs and reviews on the home page
-- This enables the home page to display real data for jobs and reviews

-- ============================================================================
-- FIX FOR JOBS TABLE
-- ============================================================================

-- Drop restrictive policies that block reading open jobs
DROP POLICY IF EXISTS "jobs_client_read_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_workers_read_all" ON public.jobs;

-- Create policy: Anyone can read open jobs (public job listings)
CREATE POLICY "Anyone can read open jobs" ON public.jobs
  FOR SELECT
  USING (status = 'open');

-- Create policy: Job owners can read their own jobs
CREATE POLICY "Jobs owner can read own" ON public.jobs
  FOR SELECT
  USING (auth.uid() = client_id);

-- Create policy: Workers can read all open jobs
CREATE POLICY "Workers can read all jobs" ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'worker')
  );

-- Create policy: Admins can read all jobs
CREATE POLICY "Admins can read all jobs" ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create policy: Service role can do anything
CREATE POLICY "Jobs service role full access" ON public.jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- FIX FOR REVIEWS TABLE
-- ============================================================================

-- Drop restrictive policies
DROP POLICY IF EXISTS "reviews_reviewer_read_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_reviewee_read" ON public.reviews;
DROP POLICY IF EXISTS "reviews_involved_read" ON public.reviews;

-- Create policy: Anyone can read reviews with 4+ rating (public testimonials)
CREATE POLICY "Anyone can read positive reviews" ON public.reviews
  FOR SELECT
  USING (rating >= 4);

-- Create policy: Reviewers can read their own reviews
CREATE POLICY "Reviewers can read own reviews" ON public.reviews
  FOR SELECT
  USING (auth.uid() = reviewer_id);

-- Create policy: Reviewees can read reviews about them
CREATE POLICY "Reviewees can read reviews about them" ON public.reviews
  FOR SELECT
  USING (auth.uid() = reviewee_id);

-- Create policy: Users involved in bookings can read related reviews
CREATE POLICY "Involved users can read reviews" ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT client_id FROM bookings WHERE id = booking_id)
    OR auth.uid() IN (SELECT provider_id FROM services WHERE id = (SELECT service_id FROM bookings WHERE id = booking_id))
  );

-- Create policy: Admins can read all reviews
CREATE POLICY "Admins can read all reviews" ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create policy: Service role can do anything
CREATE POLICY "Reviews service role full access" ON public.reviews
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================

-- Check jobs policies
SELECT 'Jobs Policies' as table_name, policyname, cmd, qual::text 
FROM pg_policies 
WHERE tablename = 'jobs';

-- Check reviews policies
SELECT 'Reviews Policies' as table_name, policyname, cmd, qual::text 
FROM pg_policies 
WHERE tablename = 'reviews';

-- Test the queries that should work now
-- SELECT COUNT(*) as open_jobs FROM jobs WHERE status = 'open';
-- SELECT COUNT(*) as positive_reviews FROM reviews WHERE rating >= 4;