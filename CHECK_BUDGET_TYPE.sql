-- Check current budget_type values in the jobs table
SELECT DISTINCT budget_type FROM jobs;

-- Also check the constraint definition
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
    AND contype = 'c'
    AND conname LIKE '%budget%';