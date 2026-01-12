-- Run this in your database console (Supabase SQL Editor or AWS RDS Query Editor)
-- This will find and show you how to remove the tenant validation function

-- Step 1: Find functions that throw "Tenant or user not found"
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (
    pg_get_functiondef(p.oid) ILIKE '%Tenant or user not found%'
    OR pg_get_functiondef(p.oid) ILIKE '%tenant%user%not%found%'
    OR (pg_get_functiondef(p.oid) ILIKE '%RAISE%' AND pg_get_functiondef(p.oid) ILIKE '%tenant%')
)
ORDER BY p.proname;

-- Step 2: If no results, check for triggers that might call tenant validation
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND t.tgname NOT LIKE 'pg_%'
AND pg_get_functiondef(p.oid) ILIKE '%tenant%';

-- Step 3: Check for functions using tenant session variables
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (
    pg_get_functiondef(p.oid) ILIKE '%current_setting%tenant%'
    OR pg_get_functiondef(p.oid) ILIKE '%app.tenant_id%'
    OR pg_get_functiondef(p.oid) ILIKE '%tenant_id%'
)
AND n.nspname = 'public';

-- Step 4: Once you find the function, remove it with:
-- DROP FUNCTION IF EXISTS schema_name.function_name() CASCADE;
-- 
-- Example:
-- DROP FUNCTION IF EXISTS public.validate_tenant() CASCADE;
-- DROP FUNCTION IF EXISTS public.check_tenant_access() CASCADE;

