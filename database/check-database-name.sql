-- Check what databases exist in Supabase
-- Run this in Supabase SQL Editor

-- List all databases (you might need superuser for this)
SELECT datname FROM pg_database WHERE datistemplate = false;

-- Or check current database
SELECT current_database();

-- Check if 'Summit' database exists
SELECT EXISTS(
  SELECT 1 FROM pg_database WHERE datname = 'Summit'
) AS summit_exists;

-- Check current database name
SELECT current_database() AS current_db;

