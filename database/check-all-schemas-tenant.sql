-- Check specific schemas for tenant validation
-- Run these in Supabase SQL Editor

-- Query 1: Check auth schema
SELECT 
    p.proname AS function_name,
    'auth' AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
  AND (p.prosrc ILIKE '%tenant%' OR p.prosrc ILIKE '%Tenant%')
ORDER BY p.proname;

-- Query 2: Check extensions schema
SELECT 
    p.proname AS function_name,
    'extensions' AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'extensions'
  AND (p.prosrc ILIKE '%tenant%' OR p.prosrc ILIKE '%Tenant%')
ORDER BY p.proname;

-- Query 3: Check realtime schema
SELECT 
    p.proname AS function_name,
    'realtime' AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'realtime'
  AND (p.prosrc ILIKE '%tenant%' OR p.prosrc ILIKE '%Tenant%')
ORDER BY p.proname;

-- Query 4: Check storage schema
SELECT 
    p.proname AS function_name,
    'storage' AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'storage'
  AND (p.prosrc ILIKE '%tenant%' OR p.prosrc ILIKE '%Tenant%')
ORDER BY p.proname;

-- Query 5: Find ANY function with "not found" in ANY schema
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%not found%'
ORDER BY n.nspname, p.proname;

-- Query 6: Find functions that RAISE with "user" in ANY schema
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%RAISE%'
  AND p.prosrc ILIKE '%user%'
  AND p.prosrc ILIKE '%not found%'
ORDER BY n.nspname, p.proname;

