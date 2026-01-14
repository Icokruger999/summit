-- Migration: Add temp password and account status columns to users table
-- Run this script to add support for temporary password signup flow

-- Add temp_password_hash column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'temp_password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN temp_password_hash TEXT;
    END IF;
END $$;

-- Add requires_password_change column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'requires_password_change'
    ) THEN
        ALTER TABLE users ADD COLUMN requires_password_change BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add account_created_at column if it doesn't exist
-- Note: We can use created_at if it exists, but adding account_created_at for clarity
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'account_created_at'
    ) THEN
        ALTER TABLE users ADD COLUMN account_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Ensure company, job_title, and phone columns exist (from previous migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'company'
    ) THEN
        ALTER TABLE users ADD COLUMN company TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'job_title'
    ) THEN
        ALTER TABLE users ADD COLUMN job_title TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('temp_password_hash', 'requires_password_change', 'account_created_at', 'company', 'job_title', 'phone')
ORDER BY column_name;
