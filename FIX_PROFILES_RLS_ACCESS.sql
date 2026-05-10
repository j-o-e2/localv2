-- Fix: Allow authenticated users to read worker profiles
-- This enables clients to view worker profiles when browsing services

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Create new policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Authenticated users can read worker profiles
-- This allows clients to view worker profiles when browsing services/jobs
CREATE POLICY "Authenticated users can read worker profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = auth.uid() 
      AND p2.role IN ('client', 'admin')
    )
    AND role = 'worker'
  );

-- Verify the policies are created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test: Try fetching a worker profile
-- This should work now for authenticated clients
-- SELECT * FROM profiles WHERE role = 'worker' LIMIT 1;