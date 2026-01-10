-- Add chats and chat_participants tables for persistent chat records
-- This ensures both users see the chat when the first message is sent

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT, -- For group chats, null for direct chats
  type TEXT NOT NULL DEFAULT 'direct', -- 'direct' or 'group'
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE
);

-- Chat participants table (many-to-many)
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);
CREATE INDEX IF NOT EXISTS idx_chats_created_by ON chats(created_by);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get or create a direct chat between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_chat(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  chat_id UUID;
  sorted_ids UUID[];
BEGIN
  -- Sort user IDs to ensure consistent chat ID for the same pair
  IF user1_id < user2_id THEN
    sorted_ids := ARRAY[user1_id, user2_id];
  ELSE
    sorted_ids := ARRAY[user2_id, user1_id];
  END IF;

  -- Try to find existing direct chat
  SELECT c.id INTO chat_id
  FROM chats c
  INNER JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = sorted_ids[1]
  INNER JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = sorted_ids[2]
  WHERE c.type = 'direct'
  LIMIT 1;

  -- If no chat exists, create one
  IF chat_id IS NULL THEN
    INSERT INTO chats (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO chat_id;

    -- Add both users as participants
    INSERT INTO chat_participants (chat_id, user_id) VALUES (chat_id, sorted_ids[1]);
    INSERT INTO chat_participants (chat_id, user_id) VALUES (chat_id, sorted_ids[2]);
  END IF;

  RETURN chat_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE chats IS 'Persistent chat records for both direct and group chats';
COMMENT ON TABLE chat_participants IS 'Many-to-many relationship between chats and users';

