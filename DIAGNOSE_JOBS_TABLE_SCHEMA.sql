-- ============================================================================
-- DIAGNOSE JOBS TABLE SCHEMA AND CONSTRAINTS
-- Run this in Supabase SQL Editor to understand the table structure
-- ============================================================================

-- 1. Get the complete table schema
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

-- 2. Get all constraints on the jobs table
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

-- 3. Specifically check the budget_type constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM 
    pg_constraint
WHERE 
    conrelid = 'jobs'::regclass
    AND contype = 'c'
    AND conname LIKE '%budget%';

-- 4. Check current values in budget_type column
SELECT DISTINCT budget_type, COUNT(*) as count
FROM jobs
GROUP BY budget_type
ORDER BY budget_type;

-- 5. List all columns with their constraints
SELECT 
    a.attname as column_name,
    format_type(a.atttypid, a.atttypmod) as data_type,
    a.attnotnull as not_null,
    a.atthasdef as has_default,
    d.adsrc as default_value
FROM 
    pg_attribute a
    LEFT JOIN pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
WHERE 
    a.attrelid = 'jobs'::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped
ORDER BY 
    a.attnum;
