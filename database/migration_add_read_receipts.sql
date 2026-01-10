-- Add read_receipts table for tracking message read status
-- This enables the "received" and "read" message status indicators

-- Read receipts table
CREATE TABLE IF NOT EXISTS read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id) -- One read receipt per message per user
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user_id ON read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_read_at ON read_receipts(read_at);

COMMENT ON TABLE read_receipts IS 'Tracks when users have read messages';
COMMENT ON COLUMN read_receipts.message_id IS 'Reference to the message that was read';
COMMENT ON COLUMN read_receipts.user_id IS 'User who read the message';
COMMENT ON COLUMN read_receipts.read_at IS 'Timestamp when the message was read';

