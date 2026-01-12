-- Simple queries to find tenant validation - run ONE at a time
-- Run these in Supabase SQL Editor separately

-- Query 1: Find functions by checking source code directly
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosrc ILIKE '%Tenant or user not found%'
ORDER BY p.proname;

-- Query 2: Find functions with tenant validation patterns
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.prosrc ILIKE '%tenant%' AND p.prosrc ILIKE '%user%' AND p.prosrc ILIKE '%not found%')
ORDER BY p.proname;

-- Query 3: Find functions using current_setting for tenant
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosrc ILIKE '%current_setting%tenant%'
ORDER BY p.proname;

-- Query 4: Find functions using app.tenant_id
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosrc ILIKE '%app.tenant_id%'
ORDER BY p.proname;

-- Query 5: Find all triggers in public schema
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
ORDER BY c.relname, t.tgname;

-- After finding the function name, get its definition:
-- SELECT prosrc FROM pg_proc WHERE proname = 'function_name_here';

-- To remove a function:
-- DROP FUNCTION IF EXISTS public.function_name_here() CASCADE;

-- To remove a trigger:
-- DROP TRIGGER IF EXISTS trigger_name_here ON public.table_name_here CASCADE;

