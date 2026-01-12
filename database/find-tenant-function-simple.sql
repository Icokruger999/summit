-- Simple SQL to find tenant validation function/trigger
-- Run this in Supabase SQL Editor

-- 1. Find functions that throw "Tenant or user not found"
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%Tenant or user not found%'
   OR pg_get_functiondef(p.oid) ILIKE '%tenant%user%not%found%'
ORDER BY p.proname;

-- 2. Find triggers that might call tenant validation
SELECT 
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.tgname NOT LIKE 'pg_%'
  AND pg_get_functiondef(p.oid) ILIKE '%tenant%'
ORDER BY c.relname, t.tgname;

-- 3. Find functions using current_setting for tenant
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%current_setting%tenant%'
   OR (pg_get_functiondef(p.oid) ILIKE '%app.tenant_id%' AND pg_get_functiondef(p.oid) ILIKE '%RAISE%')
ORDER BY p.proname;

-- 4. Get the full definition of any function found above
-- Replace 'function_name' with the actual function name from results above
-- SELECT pg_get_functiondef(p.oid) AS function_definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE p.proname = 'function_name' AND n.nspname = 'public';

