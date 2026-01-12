-- Find the database function or trigger that's throwing "Tenant or user not found"
-- Run this in Supabase SQL Editor

-- 1. Find all functions that might throw this error
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
    OR (pg_get_functiondef(p.oid) ILIKE '%EXCEPTION%' AND pg_get_functiondef(p.oid) ILIKE '%tenant%')
)
ORDER BY p.proname;

-- 2. Find triggers that might call tenant validation
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    n.nspname AS schema_name,
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
)
ORDER BY c.relname, t.tgname;

-- 3. Check for functions that validate tenant using current_setting
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
AND pg_get_functiondef(p.oid) ILIKE '%RAISE%'
ORDER BY p.proname;

-- 4. Once you find the function, remove it with:
-- DROP FUNCTION IF EXISTS schema_name.function_name() CASCADE;
-- DROP TRIGGER IF EXISTS trigger_name ON table_name CASCADE;

