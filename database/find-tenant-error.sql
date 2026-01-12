-- Find the source of "Tenant or user not found" error
-- This script queries the database for functions, triggers, and policies that might throw this error

-- 1. Check for functions that might throw this error
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%tenant%user%not%found%'
OR pg_get_functiondef(p.oid) ILIKE '%Tenant or user not found%';

-- 2. Check for triggers that might call functions with this error
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
AND (pg_get_triggerdef(t.oid) ILIKE '%tenant%' OR pg_get_functiondef(p.oid) ILIKE '%tenant%');

-- 3. Check for RLS policies that might reference tenants
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND (qual::text ILIKE '%tenant%' OR with_check::text ILIKE '%tenant%');

-- 4. Check if there's a tenants table and user_tenants relationship table
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (table_name ILIKE '%tenant%' OR column_name ILIKE '%tenant%')
ORDER BY table_name, ordinal_position;

-- 5. Check for any functions that validate tenant/user relationships
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname ILIKE '%tenant%' OR p.proname ILIKE '%validate%' OR p.proname ILIKE '%check%')
ORDER BY p.proname;

-- 6. Check for any views that might have tenant filtering
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition ILIKE '%tenant%';

