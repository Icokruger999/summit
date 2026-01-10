-- Additional index optimization for contacts query
-- Run this to further optimize the contacts endpoint for speed

-- Partial composite indexes for faster contacts queries (only indexes accepted status rows)
-- These indexes will significantly speed up the contacts query by limiting index size
CREATE INDEX IF NOT EXISTS idx_chat_requests_requester_accepted 
ON chat_requests(requester_id, requestee_id)
WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_chat_requests_requestee_accepted 
ON chat_requests(requestee_id, requester_id)
WHERE status = 'accepted';

-- Index on users.id (should already exist as PRIMARY KEY, but ensure it's optimized)
-- This helps with the JOIN in the contacts query

