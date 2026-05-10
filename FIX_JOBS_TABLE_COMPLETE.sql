-- ============================================================================
-- FIX JOBS TABLE - Add missing columns and fix constraints
-- ============================================================================

-- 1. Check current columns in jobs table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' AND table_schema = 'public';

-- 2. Check if poster_id exists, if so rename/add as client_id
-- First, add client_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN client_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added client_id column to jobs table';
  ELSE
    RAISE NOTICE 'client_id column already exists';
  END IF;
END $$;

-- 3. Create index for client_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);

-- 4. Fix budget_type constraint - drop and recreate with lowercase values
DO $$
BEGIN
  -- Drop existing constraint
  ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_type_check;
  
  -- Add proper check constraint (lowercase values)
  ALTER TABLE jobs ADD CONSTRAINT jobs_budget_type_check 
      CHECK (budget_type IN ('fixed', 'hourly'));
  
  RAISE NOTICE 'Fixed budget_type constraint';
EXCEPTION
  WHEN duplicate_table THEN
    RAISE NOTICE 'Constraint already exists';
END
$$;

-- 5. Verify the fix
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
    AND contype = 'c';

-- ============================================================================
-- END OF FIX
-- ============================================================================