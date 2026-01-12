-- Disable Row Level Security (RLS) policies that require tenant validation
-- Run this in your database console (Supabase SQL Editor or AWS RDS Query Editor)

-- First, check what RLS policies exist
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
ORDER BY tablename, policyname;

-- Disable RLS on all tables (if enabled)
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meeting_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meeting_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.message_reads DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies that check for tenant
DROP POLICY IF EXISTS tenant_isolation_policy ON public.users;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.presence;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.chats;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.messages;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.chat_requests;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.meetings;

-- Also drop any policies with "tenant" in the name
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (policyname ILIKE '%tenant%' OR qual::text ILIKE '%tenant%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END $$;

-- Make tenant_id optional if it exists (don't fail if column doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.users ALTER COLUMN tenant_id DROP NOT NULL;
        RAISE NOTICE 'Made tenant_id optional on users table';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies disabled. Tenant validation should no longer block queries.';
END $$;

