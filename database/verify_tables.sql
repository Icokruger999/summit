-- Verification script to check which tables exist in the Summit database
-- Run this to see which tables are present

SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'meetings', 'meeting_participants', 'meeting_invitations', 
                           'attachments', 'presence', 'message_reads') 
        THEN '✓ Required'
        ELSE '⚠ Optional'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY 
    CASE 
        WHEN table_name IN ('users', 'meetings', 'meeting_participants', 'meeting_invitations', 
                           'attachments', 'presence', 'message_reads') 
        THEN 0 
        ELSE 1 
    END,
    table_name;

-- Expected tables:
-- ✓ users
-- ✓ meetings
-- ✓ meeting_participants
-- ✓ meeting_invitations
-- ✓ attachments
-- ✓ presence
-- ✓ message_reads

