-- Performance Optimization Indexes for Summit
-- Run this on your RDS database to improve query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Messages table indexes (most queried)
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages (chat_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_deleted ON messages (chat_id) WHERE deleted_at IS NULL;

-- Chat participants indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants (chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_composite ON chat_participants (chat_id, user_id);

-- Chats table indexes
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats (last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats (updated_at DESC);

-- Meetings table indexes
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings (created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings (start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_participants_user_id ON meeting_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_participants_meeting_id ON meeting_participants (meeting_id);

-- Meeting invitations indexes
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_invitee_status ON meeting_invitations (invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations (meeting_id);

-- Read receipts indexes
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_user ON read_receipts (message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON read_receipts (message_id);

-- Chat requests indexes
CREATE INDEX IF NOT EXISTS idx_chat_requests_requester ON chat_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_requestee ON chat_requests (requestee_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_status ON chat_requests (status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_updated_at ON chat_requests (updated_at DESC);

-- Presence indexes
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON presence (user_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence (last_seen DESC);

-- Analyze tables after creating indexes
ANALYZE users;
ANALYZE messages;
ANALYZE chat_participants;
ANALYZE chats;
ANALYZE meetings;
ANALYZE meeting_participants;
ANALYZE meeting_invitations;
ANALYZE read_receipts;
ANALYZE chat_requests;
ANALYZE presence;

