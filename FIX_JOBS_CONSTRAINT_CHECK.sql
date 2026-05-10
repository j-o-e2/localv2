-- ============================================================================
-- FIX JOBS BUDGET CONSTRAINT - Run this in Supabase SQL Editor
-- ============================================================================

-- First, check what constraint exists
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
    AND contype = 'c';

-- Drop existing constraint if it has wrong values
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_type_check;

-- Add proper check constraint (lowercase values)
ALTER TABLE jobs ADD CONSTRAINT jobs_budget_type_check 
    CHECK (budget_type IN ('fixed', 'hourly'));

-- Verify the fix
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