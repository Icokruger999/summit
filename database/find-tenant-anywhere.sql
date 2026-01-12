-- Find tenant validation function in ANY schema
-- Run these in Supabase SQL Editor

-- Query 1: Find functions with "Tenant" and "not found" in ANY schema
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%Tenant%'
  AND p.prosrc ILIKE '%not found%'
ORDER BY n.nspname, p.proname;

-- Query 2: Find ALL functions that use RAISE with tenant in ANY schema
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%RAISE%'
  AND p.prosrc ILIKE '%tenant%'
ORDER BY n.nspname, p.proname;

-- Query 3: Check auth schema (Supabase uses this)
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
  AND p.prosrc ILIKE '%tenant%'
ORDER BY p.proname;

-- Query 4: Check extensions schema
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname LIKE '%extensions%'
  AND p.prosrc ILIKE '%tenant%'
ORDER BY p.proname;

-- Query 5: List ALL schemas that have functions
SELECT DISTINCT n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname;

