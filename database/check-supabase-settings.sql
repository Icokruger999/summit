-- Check for Supabase-specific settings or configurations
-- Run these in Supabase SQL Editor

-- Query 1: Check for any database-level settings related to tenant
SHOW ALL;

-- Query 2: Check for custom configuration parameters
SELECT name, setting, source 
FROM pg_settings 
WHERE name ILIKE '%tenant%' 
   OR name ILIKE '%app%'
ORDER BY name;

-- Query 3: Check if there are any event triggers
SELECT 
    evtname AS trigger_name,
    evtevent AS event,
    evtenabled AS enabled
FROM pg_event_trigger
ORDER BY evtname;

-- Query 4: Check for any hooks or extensions that might be intercepting queries
SELECT 
    extname AS extension_name,
    extversion AS version
FROM pg_extension
WHERE extname NOT IN ('plpgsql', 'uuid-ossp')
ORDER BY extname;

-- Query 5: Try to see what happens when we check current_setting
SELECT current_setting('app.tenant_id', true) AS app_tenant_id;
SELECT current_setting('tenant_id', true) AS tenant_id;

