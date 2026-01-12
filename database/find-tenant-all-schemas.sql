-- Check ALL schemas for tenant validation functions
-- Run these in Supabase SQL Editor

-- Query 1: Find functions in ALL schemas (not just public)
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%current_setting%tenant%'
ORDER BY n.nspname, p.proname;

-- Query 2: Find functions with RAISE and tenant in ALL schemas
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (p.prosrc ILIKE '%RAISE%' OR p.prosrc ILIKE '%EXCEPTION%')
  AND p.prosrc ILIKE '%tenant%'
ORDER BY n.nspname, p.proname;

-- Query 3: Check for views that might have security definer functions
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%tenant%'
ORDER BY viewname;

-- Query 4: Get the source code of a specific function (replace 'function_name' with actual name)
-- SELECT prosrc FROM pg_proc WHERE proname = 'function_name_here';

-- Query 5: List all functions in public schema that use RAISE
SELECT 
    p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosrc ILIKE '%RAISE%'
ORDER BY p.proname;

