-- Add messages table for persistent message storage
-- This allows message history to be preserved like Teams/Zoom

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, -- Use the same ID format as frontend (timestamp-based)
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'image', 'call', etc.
  file_name TEXT,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages(chat_id, created_at DESC);

-- Index for fetching recent messages efficiently
CREATE INDEX IF NOT EXISTS idx_messages_chat_recent ON messages(chat_id, created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE messages IS 'Persistent storage for all chat messages';
COMMENT ON COLUMN messages.id IS 'Message ID from frontend (timestamp-based for ordering)';
COMMENT ON COLUMN messages.chat_id IS 'Reference to the chat this message belongs to';
COMMENT ON COLUMN messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN messages.deleted_at IS 'Soft delete - when set, message is hidden but preserved';


