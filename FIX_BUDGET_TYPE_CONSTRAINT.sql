-- ============================================================================
-- FIX BUDGET TYPE CONSTRAINT - Run this in Supabase SQL Editor
-- ============================================================================
-- This script fixes the jobs_budget_type_check constraint to accept 
-- proper lowercase values: 'fixed' and 'hourly'

-- 1. First, check what the current constraint looks like
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
    AND contype = 'c'
    AND conname LIKE '%budget%';

-- 2. Drop the existing constraint (if it's restricting valid values)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_type_check;

-- 3. Add the correct check constraint with lowercase values
ALTER TABLE jobs ADD CONSTRAINT jobs_budget_type_check 
    CHECK (budget_type IN ('fixed', 'hourly'));

-- 4. Update any existing jobs that might have uppercase or mixed-case values
UPDATE jobs 
SET budget_type = LOWER(budget_type) 
WHERE budget_type NOT IN ('fixed', 'hourly');

-- 5. Verify the constraint is now correct
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
    AND contype = 'c'
    AND conname LIKE '%budget%';

-- 6. Check the budget_type values in the table
SELECT DISTINCT budget_type, COUNT(*) as count
FROM jobs
GROUP BY budget_type
ORDER BY budget_type;

-- ============================================================================
-- END OF FIX
-- ============================================================================
