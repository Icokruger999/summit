-- Supabase Database Schema Migration
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension (Supabase has this by default, but ensure it's enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  password_hash TEXT, -- For local auth (if not using Supabase Auth)
  company TEXT,
  job_title TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  room_id TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recurrence JSONB, -- Stores {enabled: boolean, days_of_week: [0,1,2,...]} for recurring meetings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for meetings
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_room_id ON meetings(room_id);

-- Meeting participants table (many-to-many)
CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (meeting_id, user_id)
);

-- Create indexes for meeting_participants
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);

-- Meeting invitations table
CREATE TABLE IF NOT EXISTS meeting_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- Create indexes for meeting_invitations
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_user_id ON meeting_invitations(user_id);

-- Chat requests table
CREATE TABLE IF NOT EXISTS chat_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  requestee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  meeting_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, requestee_id)
);

-- Create indexes for chat_requests
CREATE INDEX IF NOT EXISTS idx_chat_requests_requester_id ON chat_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_requestee_id ON chat_requests(requestee_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_status ON chat_requests(status);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT DEFAULT 'direct', -- 'direct' or 'group'
  name TEXT, -- For group chats
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE
);

-- Chat participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- Create indexes for chat_participants
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- 'text', 'file', 'image', etc.
  file_name TEXT,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Message reads table (read receipts)
CREATE TABLE IF NOT EXISTS message_reads (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Create indexes for message_reads
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);

-- Presence table
CREATE TABLE IF NOT EXISTS presence (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  status TEXT DEFAULT 'offline', -- 'online', 'offline', 'away', 'busy', 'dnd'
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_invitations_updated_at BEFORE UPDATE ON meeting_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_requests_updated_at BEFORE UPDATE ON chat_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Supabase schema migration completed successfully!';
END $$;

