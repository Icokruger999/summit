-- Migration: Subscription and Trial System
-- Adds subscription management and trial tracking

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pack', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  max_users INTEGER NOT NULL, -- 1 for basic, 5 for pack, NULL for enterprise (stored as -1)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL for active subscriptions
  payment_reference TEXT, -- For future payment integration
  UNIQUE(owner_id) -- One subscription per owner
);

-- Add subscription columns to users table
DO $$ 
BEGIN
    -- Add subscription_id column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
    END IF;
    
    -- Add trial_started_at column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'trial_started_at'
    ) THEN
        ALTER TABLE users ADD COLUMN trial_started_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add subscription_status column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'locked'));
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_id ON subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_trial_started_at ON users(trial_started_at);

-- Set existing users to trial status (if they don't have subscription_status set)
UPDATE users 
SET subscription_status = 'trial' 
WHERE subscription_status IS NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('subscription_id', 'trial_started_at', 'subscription_status')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY column_name;
