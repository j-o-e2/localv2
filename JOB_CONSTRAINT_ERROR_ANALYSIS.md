# Job Posting Constraint Error - Detailed Investigation

## Error Details
```
new row for relation "jobs" violates check constraint "jobs_budget_type_check"
Failing row contains: (..., fixed, 2026-05-02 07:39:04.062935+00, {Handyman}, f)
```

## Key Issue: Mystery "f" Field
The failing row ends with `f` which indicates there's an extra column in the table that we're not accounting for. This could be:
- A boolean column (serialized as 'f' for false)
- A column named "f" or abbreviated name
- A column with a default value we're overriding

## Immediate Action Required

### Step 1: Run Diagnostic SQL
Execute [DIAGNOSE_JOBS_TABLE_SCHEMA.sql](DIAGNOSE_JOBS_TABLE_SCHEMA.sql) in your Supabase SQL Editor to:
1. See all columns in the jobs table
2. Check all constraints on the table
3. Verify the budget_type constraint definition
4. Check existing budget_type values

### Step 2: Identify the "f" Column
From the diagnostic output:
- Count the columns to identify which position the "f" is in
- Check if there's a boolean column or any column with a single-letter name/abbreviation
- Note the column data type and any default values

### Step 3: Fix the API Payload
Once you identify the "f" column:

**Option A: If it's a boolean column like "featured" or "flagged"**
- Add it to the API payload with the correct value (true/false)
- Update [app/api/jobs/post/route.ts](app/api/jobs/post/route.ts) to include it

**Option B: If it's a column we shouldn't send**
- Make sure it's filtered out (already done in the latest update)
- Check if it has a default value in the table schema

### Step 4: Fix the Constraint
Run the SQL fix to ensure the constraint accepts 'fixed' and 'hourly':

```sql
-- Drop and recreate constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_type_check;

ALTER TABLE jobs ADD CONSTRAINT jobs_budget_type_check 
    CHECK (budget_type IN ('fixed', 'hourly'));

-- Verify existing data
SELECT DISTINCT budget_type, COUNT(*) FROM jobs GROUP BY budget_type;
```

## Current API Changes
The API has been updated to:
- Filter payload to only include expected columns
- Ensure no extra fields are being sent to the database
- Provide defensive column filtering

## Next: Run Diagnostics
Please run the diagnostic SQL and share:
1. The list of columns in the jobs table
2. The constraint definitions
3. The position/name of the mystery "f" column
