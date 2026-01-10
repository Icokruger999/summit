# Manual Deployment to EC2 Instance i-06bc5b2218c041802

Since AWS CLI is not installed, follow these manual steps to deploy Summit backend via AWS Console.

## Step 1: Package the Server Code

Already done! File: `deploy-package.zip` is ready in the project root.

## Step 2: Upload Package via AWS Console

1. Go to **AWS S3 Console**: https://console.aws.amazon.com/s3/
2. Create bucket `codingeverest-deployments` (if doesn't exist)
3. Upload `deploy-package.zip` to the bucket under folder `summit/`

## Step 3: Deploy via SSM Session Manager

1. Go to **AWS Systems Manager Console**: https://console.aws.amazon.com/systems-manager/
2. Click **Session Manager** → **Start session**
3. Select instance: `i-06bc5b2218c041802`
4. Click **Start session**

## Step 4: Run Deployment Commands (in SSM session)

Copy and paste these commands into the SSM session:

```bash
# Create directory
sudo mkdir -p /opt/summit-backend
sudo chown ubuntu:ubuntu /opt/summit-backend
cd /opt/summit-backend

# Download from S3 (replace with your bucket path)
aws s3 cp s3://codingeverest-deployments/summit/deploy-package.zip server.zip

# Extract
unzip -o server.zip
rm server.zip

# Install dependencies
npm install --production

# Build
npm run build

# Create .env file
cat > .env << 'EOF'
PORT=3001
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=summit-secret-$(openssl rand -hex 32)
EOF

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Stop if running
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true

# Start backend on port 3001 (isolated from your ports 5000, 50001)
pm2 start dist/index.js --name summit-backend
pm2 save
pm2 status

echo "Backend deployed on port 3001!"
```

## Step 5: Setup Database Tables

In the same SSM session:

```bash
# Install PostgreSQL client if not installed
sudo apt-get update
sudo apt-get install -y postgresql-client

# Check if Summit database exists
PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='Summit'"

# If not exists, create it:
PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d postgres -c "CREATE DATABASE \"Summit\";"

# Download schema
cd /tmp
cat > schema.sql << 'SCHEMA'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  password_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  room_id TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recurrence JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting participants table
CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (meeting_id, user_id)
);

-- Meeting invitations table
CREATE TABLE IF NOT EXISTS meeting_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, invitee_id)
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  chat_id TEXT,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_room_id ON meetings(room_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_invitee_id ON meeting_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_status ON meeting_invitations(status);
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_chat_id ON attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_attachments_meeting_id ON attachments(meeting_id);
SCHEMA

# Run schema
PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d Summit -f schema.sql

echo "Database tables created!"
```

## Step 6: Update Security Group

1. Go to **EC2 Console**: https://console.aws.amazon.com/ec2/
2. Find instance `i-06bc5b2218c041802`
3. Click on its **Security Group**
4. Click **Edit inbound rules**
5. Click **Add rule**:
   - Type: Custom TCP
   - Port: 3001
   - Source: 0.0.0.0/0 (or your IP for more security)
   - Description: Summit Backend API
6. Click **Save rules**

## Step 7: Get EC2 Public IP

1. In **EC2 Console**, find instance `i-06bc5b2218c041802`
2. Copy the **Public IPv4 address** (e.g., `54.123.45.67`)

## Step 8: Test Backend

In your local PowerShell:

```powershell
# Replace with your actual EC2 public IP
$ip = "YOUR-EC2-PUBLIC-IP"
curl "http://${ip}:3001/health"
```

Expected response: `{"status":"ok"}`

## Step 9: Configure Desktop App

Create `C:\CodingE-Chat\desktop\.env`:

```env
VITE_SERVER_URL=http://YOUR-EC2-PUBLIC-IP:3001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_LIVEKIT_URL=ws://YOUR-EC2-PUBLIC-IP:7880
```

## Step 10: Run Desktop App

```powershell
cd C:\CodingE-Chat\desktop
npm run tauri:dev
```

## Isolation Confirmed

✅ **Directory**: `/opt/summit-backend` (separate from other apps)
✅ **Port**: 3001 (won't conflict with 5000, 50001)  
✅ **Process**: `summit-backend` in PM2
✅ **Database**: `Summit` database (separate)

Your existing applications on ports 5000 and 50001 will not be affected!

## Management Commands

Check status via SSM Session Manager:
```bash
pm2 status
pm2 logs summit-backend
pm2 restart summit-backend
```

## Summary

- Backend runs on **port 3001**
- Completely isolated from your other applications
- Deployed to `/opt/summit-backend`
- Managed by PM2 as `summit-backend`
- Database is separate: `Summit`

