-- Summit Database Schema
-- PostgreSQL Database Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  password_hash TEXT, -- For local auth (if not using external auth)
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

-- Meeting invitations table (for tracking invitations separately)
CREATE TABLE IF NOT EXISTS meeting_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, invitee_id)
);

-- Create indexes for meeting_invitations
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_invitee_id ON meeting_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_status ON meeting_invitations(status);

-- File attachments table (metadata for uploaded files)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  chat_id TEXT, -- For chat attachments (if using persistent storage)
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for attachments
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_chat_id ON attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_attachments_meeting_id ON attachments(meeting_id);

-- Chat requests table (for friend request-like system)
CREATE TABLE IF NOT EXISTS chat_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  requestee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL, -- Link to meeting if request was auto-created from meeting invite
  meeting_title TEXT, -- Store meeting title for display in request
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, requestee_id)
);

-- Create indexes for chat_requests
CREATE INDEX IF NOT EXISTS idx_chat_requests_requester_id ON chat_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_requestee_id ON chat_requests(requestee_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_status ON chat_requests(status);
-- Composite index for faster contact queries
CREATE INDEX IF NOT EXISTS idx_chat_requests_user_status ON chat_requests(requester_id, requestee_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_status_updated ON chat_requests(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_requests_meeting_id ON chat_requests(meeting_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_invitations_updated_at BEFORE UPDATE ON meeting_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_requests_updated_at BEFORE UPDATE ON chat_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts and profiles';
COMMENT ON TABLE meetings IS 'Scheduled meetings with optional recurrence';
COMMENT ON TABLE meeting_participants IS 'Many-to-many relationship between meetings and users';
COMMENT ON TABLE meeting_invitations IS 'Meeting invitations with acceptance status';
COMMENT ON TABLE attachments IS 'File attachment metadata';
COMMENT ON TABLE chat_requests IS 'Chat requests (friend request-like system) with optional meeting invitation links';
COMMENT ON COLUMN meetings.recurrence IS 'JSONB field storing recurrence rules: {enabled: boolean, days_of_week: [0-6]}';

