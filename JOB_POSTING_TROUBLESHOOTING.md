# Job Posting Error - Complete Troubleshooting Guide

## Current Status
✅ API payload filtering implemented - only sends expected columns
✅ Enhanced error logging to help identify table schema issues
⚠️ Pending: Database constraint validation

## The Problem
When attempting to insert a job, the database rejects the insert with:
```
new row for relation "jobs" violates check constraint "jobs_budget_type_check"
Failing row: (..., fixed, ..., {Handyman}, f)
```

The mystery **`f`** at the end indicates an extra column we're not handling properly.

## Three Possible Causes

### Cause 1: Invalid budget_type Constraint
The CHECK constraint on `budget_type` might not allow 'fixed' or 'hourly' values.

**Fix:**
```sql
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_budget_type_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_budget_type_check 
    CHECK (budget_type IN ('fixed', 'hourly'));
```

### Cause 2: Missing Boolean Column (the "f")
There might be a boolean column (like `featured`, `verified`, `flagged`) with a single-letter abbreviation.

**Fix:**
Add the column to the API payload with a default value:
```typescript
const jobPayload = {
  // ... existing fields ...
  featured: false,  // or whatever the column is
}
```

### Cause 3: Column Mismatch
The table schema might have changed or have extra columns we're not accounting for.

**Fix:**
Query the table schema to identify all columns.

## Immediate Action: Run Diagnostics

### Step 1: Execute Diagnostic SQL
Copy and run this in your Supabase SQL Editor:

```sql
-- 1. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM 
    information_schema.columns
WHERE 
    table_name = 'jobs' 
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;

-- 2. Check constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
ORDER BY 
    conname;
```

### Step 2: Share Results
Please share the output showing:
- All column names in order (ordinal_position)
- Each column's data type
- All constraints on the table

### Step 3: Identify the Mystery "f"
Count the columns to find:
- What is the 15th column (if there are 15)?
- What is the last column in the table?
- Is there a column with a short name like "f", "v", "a", etc.?

## After Identifying the Issue

### If it's a boolean column:
Update the API to include it:
```typescript
const baseJobPayload = {
  // ... existing fields ...
  [MYSTERY_COLUMN]: false,  // Replace with actual column name
}
```

### If it's a constraint issue:
Run the SQL fix above to update the constraint definition.

### If it's an RLS policy issue:
Check row-level security policies on the jobs table that might be blocking inserts.

## Testing

After making changes:

1. Clear Next.js cache:
```bash
rm -rf .next
```

2. Restart dev server:
```bash
npm run dev
```

3. Try posting a job again

4. Check the server logs for the enhanced error messages

## Files to Reference
- [app/api/jobs/post/route.ts](app/api/jobs/post/route.ts) - API endpoint with enhanced logging
- [app/jobs/post/page.tsx](app/jobs/post/page.tsx) - Client form
- [DIAGNOSE_JOBS_TABLE_SCHEMA.sql](DIAGNOSE_JOBS_TABLE_SCHEMA.sql) - Full diagnostic SQL

## Support Information
If the error persists after these steps, the server logs will now show:
- The exact payload that was sent
- The table schema structure
- More details about why the constraint failed
