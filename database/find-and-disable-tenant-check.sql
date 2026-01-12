-- Find and disable the database function/trigger that's checking tenant validation
-- This will help us identify what's causing "Tenant or user not found" errors

-- 1. Find all functions that might throw "Tenant or user not found"
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (
    pg_get_functiondef(p.oid) ILIKE '%Tenant or user not found%'
    OR pg_get_functiondef(p.oid) ILIKE '%tenant%user%not%found%'
    OR pg_get_functiondef(p.oid) ILIKE '%RAISE%tenant%'
    OR pg_get_functiondef(p.oid) ILIKE '%RAISE EXCEPTION%tenant%'
)
ORDER BY p.proname;

-- 2. Find all triggers that might call tenant validation functions
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND t.tgname NOT LIKE 'pg_%'
AND (
    pg_get_functiondef(p.oid) ILIKE '%tenant%'
    OR pg_get_triggerdef(t.oid) ILIKE '%tenant%'
);

-- 3. If you find the function, you can disable it by:
-- DROP FUNCTION IF EXISTS function_name CASCADE;
-- OR modify it to not check tenant validation

-- 4. Check for RLS policies that might require tenant context
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual::text AS policy_condition
FROM pg_policies
WHERE schemaname = 'public'
AND (qual::text ILIKE '%tenant%' OR with_check::text ILIKE '%tenant%');

