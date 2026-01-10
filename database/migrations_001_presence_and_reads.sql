-- Migration 001: Add presence and message_reads tables
-- Run this after the base schema.sql

-- Presence table for tracking user online/offline status
CREATE TABLE IF NOT EXISTS presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline', -- 'online', 'offline', 'away'
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_presence_status ON presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen);

-- Message reads table for read receipts
CREATE TABLE IF NOT EXISTS message_reads (
  message_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Create indexes for message_reads
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON message_reads(read_at);

-- Trigger to update presence updated_at
CREATE TRIGGER update_presence_updated_at BEFORE UPDATE ON presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE presence IS 'User online/offline presence status';
COMMENT ON TABLE message_reads IS 'Read receipts for chat messages';

