-- Script to remove or disable tenant validation
-- Run this AFTER you've identified the function using find-and-disable-tenant-check.sql

-- STEP 1: Find the function name first (run find-and-disable-tenant-check.sql)
-- Then replace 'function_name_here' with the actual function name

-- Example: If function is called 'validate_tenant_user'
-- DROP FUNCTION IF EXISTS validate_tenant_user() CASCADE;

-- STEP 2: Disable any triggers that use tenant validation
-- DROP TRIGGER IF EXISTS trigger_name ON table_name CASCADE;

-- STEP 3: Disable RLS policies that require tenant (if any)
-- DROP POLICY IF EXISTS policy_name ON table_name;

-- STEP 4: Alternative - Modify the function to always return true
-- This is safer than dropping if you're not sure:
/*
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Always allow - no tenant validation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
*/

-- IMPORTANT: Run find-and-disable-tenant-check.sql FIRST to identify what needs to be removed!

