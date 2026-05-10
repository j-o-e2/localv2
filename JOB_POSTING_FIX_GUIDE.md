# Job Posting 500 Error - Root Cause and Fix

## Problem
The job posting API fails with status 500 and error: `"new row for relation "jobs" violates check constraint "jobs_budget_type_check"`

## Root Cause
The database constraint `jobs_budget_type_check` on the `budget_type` column is either:
1. Not allowing the values 'fixed' and 'hourly' (case-sensitive issue)
2. Expecting uppercase values like 'FIXED' and 'HOURLY'
3. Has outdated/incorrect allowed values

## Solution

### Step 1: Execute SQL Fix in Supabase Dashboard

Go to your Supabase dashboard and run the following SQL in the SQL editor:

```sql
-- Check current constraint definition
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
    AND contype = 'c'
    AND conname LIKE '%budget%';

-- Drop the existing constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_type_check;

-- Create new constraint with lowercase values
ALTER TABLE jobs ADD CONSTRAINT jobs_budget_type_check 
    CHECK (budget_type IN ('fixed', 'hourly'));

-- Update any existing jobs with uppercase values to lowercase
UPDATE jobs 
SET budget_type = LOWER(budget_type) 
WHERE budget_type NOT IN ('fixed', 'hourly');

-- Verify the fix
SELECT DISTINCT budget_type, COUNT(*) as count
FROM jobs
GROUP BY budget_type;
```

### Step 2: Clear Next.js Cache and Restart Server

```bash
rm -rf .next
npm run dev
```

### Step 3: Test Job Posting

1. Go to the job posting page
2. Fill in all required fields
3. Select budget type (Fixed or Hourly)
4. Submit the form
5. Verify job is created successfully in the database

## Technical Details

The API code already normalizes `budget_type` to lowercase values ('fixed' or 'hourly') in the `normalizeBudgetType()` function before sending to the database. The fix ensures the database constraint accepts these standard lowercase values.

## Files Modified
- `app/api/jobs/post/route.ts`: Already has comprehensive logging and normalization

## If the Fix Doesn't Work

1. Check if there are any other constraints on the jobs table
2. Verify the budget_type column exists and is text/VARCHAR type
3. Check the actual data in the jobs table with:
   ```sql
   SELECT budget_type, COUNT(*) FROM jobs GROUP BY budget_type;
   ```
4. Look for any row-level security (RLS) policies that might be blocking inserts
