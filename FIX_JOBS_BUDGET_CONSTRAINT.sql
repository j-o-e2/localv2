-- Fix for jobs_budget_type_check constraint error
-- This script checks and fixes the budget_type constraint on the jobs table

-- First, let's see what constraint exists on the jobs table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
    AND contype = 'c';

-- If there's a constraint that's causing issues, we can drop and recreate it
-- This allows 'fixed' and 'hourly' values for budget_type

-- Drop the existing constraint if it exists with wrong values
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_type_check;

-- Add proper check constraint
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