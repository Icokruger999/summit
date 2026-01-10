# Run Summit Database Setup via AWS SSM
# This script ONLY affects the Summit database, no other databases or applications

$INSTANCE_ID = "i-03589e2371d2fad15"
$DB_NAME = "Summit"  # ONLY this database will be affected

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Summit Database Setup via SSM" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "⚠️  SAFETY CHECK:" -ForegroundColor Yellow
Write-Host "   Target Database: $DB_NAME ONLY" -ForegroundColor White
Write-Host "   Instance: $INSTANCE_ID" -ForegroundColor White
Write-Host "   Action: Create/verify database tables`n" -ForegroundColor White

$confirm = Read-Host "Continue with Summit database setup? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "`n❌ Cancelled by user`n" -ForegroundColor Yellow
    exit 0
}

# Create the setup script that will run on EC2
$setupScript = @'
# Summit Database Setup Script
# This script ONLY affects the Summit database

$ErrorActionPreference = "Stop"

Write-Host "`n=== Summit Database Setup ===" -ForegroundColor Cyan
Write-Host "Target: Summit database ONLY`n" -ForegroundColor Yellow

# Create working directory
$workDir = "C:\summit-db-setup"
if (-not (Test-Path $workDir)) {
    New-Item -ItemType Directory -Path $workDir -Force | Out-Null
}
cd $workDir

# Install Node.js if not present
Write-Host "Checking Node.js installation..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Installing Node.js..." -ForegroundColor Yellow
    
    # Install Chocolatey if needed
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    choco install nodejs -y
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Install pg package (PostgreSQL client for Node.js)
Write-Host "`nInstalling PostgreSQL client..." -ForegroundColor Cyan
npm init -y 2>&1 | Out-Null
npm install pg --save 2>&1 | Out-Null
Write-Host "✅ PostgreSQL client installed" -ForegroundColor Green

# Create test connection script
Write-Host "`nCreating test scripts..." -ForegroundColor Cyan
$testScript = @"
// Test connection to Summit database ONLY
const { Client } = require('pg');

const dbConfig = {
  host: 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: 5432,
  database: 'Summit',  // ONLY this database
  user: 'postgres',
  password: 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  }
};

async function testConnection() {
  const client = new Client(dbConfig);
  
  try {
    console.log('\n🔌 Testing connection to Summit database...');
    await client.connect();
    console.log('✅ Connected to Summit database!\n');
    
    const result = await client.query('SELECT NOW() as current_time, current_database() as database');
    console.log('Current database:', result.rows[0].database);
    console.log('Server time:', result.rows[0].current_time);
    
    // Verify we're on the right database
    if (result.rows[0].database !== 'Summit') {
      throw new Error('ERROR: Connected to wrong database!');
    }
    
    console.log('\n✅ Connection test passed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

testConnection();
"@
$testScript | Out-File -FilePath "test-connection.cjs" -Encoding UTF8

# Create database setup script
$setupDbScript = @"
// Setup Summit database tables ONLY
const { Client } = require('pg');
const fs = require('fs');

const dbConfig = {
  host: 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: 5432,
  database: 'Summit',  // ONLY this database
  user: 'postgres',
  password: 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  }
};

const REQUIRED_TABLES = [
  'users',
  'meetings',
  'meeting_participants',
  'meeting_invitations',
  'attachments',
  'presence',
  'message_reads'
];

async function setupDatabase() {
  const client = new Client(dbConfig);
  
  try {
    console.log('\n🔌 Connecting to Summit database...');
    await client.connect();
    
    // Verify we're on the Summit database
    const dbCheck = await client.query('SELECT current_database()');
    if (dbCheck.rows[0].current_database !== 'Summit') {
      throw new Error('ERROR: Not connected to Summit database!');
    }
    console.log('✅ Connected to Summit database\n');
    
    // Read schema file
    console.log('📄 Reading schema file...');
    const schemaSQL = fs.readFileSync('complete_schema.sql', 'utf8');
    
    console.log('🔨 Creating/updating tables...');
    await client.query(schemaSQL);
    console.log('✅ Schema executed\n');
    
    // Verify tables
    console.log('🔍 Verifying tables...\n');
    const result = await client.query(\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    \`);
    
    const existingTables = result.rows.map(r => r.table_name);
    
    console.log('📊 Table Status:\n');
    let allGood = true;
    REQUIRED_TABLES.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(\`   ✅ \${table}\`);
      } else {
        console.log(\`   ❌ \${table} - MISSING!\`);
        allGood = false;
      }
    });
    
    console.log('');
    
    if (allGood) {
      console.log('✅ All required tables exist!\n');
      
      // Count records
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      const meetingCount = await client.query('SELECT COUNT(*) FROM meetings');
      console.log(\`Users: \${userCount.rows[0].count}\`);
      console.log(\`Meetings: \${meetingCount.rows[0].count}\`);
      console.log('\n✅ Summit database setup complete!\n');
    } else {
      console.log('⚠️ Some tables are missing!\n');
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
"@
$setupDbScript | Out-File -FilePath "setup-summit-db.cjs" -Encoding UTF8

# Create complete schema SQL
$schemaSQL = @"
-- Summit Database Complete Schema
-- PostgreSQL Database Setup
-- This script ONLY affects the Summit database

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
  recurrence JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_room_id ON meetings(room_id);

-- Meeting participants table
CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);

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

CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_invitee_id ON meeting_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_status ON meeting_invitations(status);

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

CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_chat_id ON attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_attachments_meeting_id ON attachments(meeting_id);

-- Presence table
CREATE TABLE IF NOT EXISTS presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_status ON presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen);

-- Message reads table
CREATE TABLE IF NOT EXISTS message_reads (
  message_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON message_reads(read_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS `$`$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
`$`$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_invitations_updated_at ON meeting_invitations;
CREATE TRIGGER update_meeting_invitations_updated_at BEFORE UPDATE ON meeting_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_presence_updated_at ON presence;
CREATE TRIGGER update_presence_updated_at BEFORE UPDATE ON presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE users IS 'User accounts and profiles - Summit app only';
COMMENT ON TABLE meetings IS 'Scheduled meetings - Summit app only';
COMMENT ON TABLE meeting_participants IS 'Meeting attendees - Summit app only';
COMMENT ON TABLE meeting_invitations IS 'Meeting invitations - Summit app only';
COMMENT ON TABLE attachments IS 'File attachments - Summit app only';
COMMENT ON TABLE presence IS 'User presence status - Summit app only';
COMMENT ON TABLE message_reads IS 'Message read receipts - Summit app only';
"@
$schemaSQL | Out-File -FilePath "complete_schema.sql" -Encoding UTF8

Write-Host "✅ Scripts created" -ForegroundColor Green

# Test connection first
Write-Host "`n=== Step 1: Testing Connection ===" -ForegroundColor Yellow
node test-connection.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Connection test failed! Aborting.`n" -ForegroundColor Red
    exit 1
}

# Run database setup
Write-Host "`n=== Step 2: Setting Up Database ===" -ForegroundColor Yellow
node setup-summit-db.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Database setup failed!`n" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "Summit database is ready!`n" -ForegroundColor Green

# Cleanup
Write-Host "Cleaning up temporary files..." -ForegroundColor Cyan
cd ..
# Keep the directory for reference, but you can delete it manually later
Write-Host "Working directory: $workDir`n" -ForegroundColor Gray
'@

Write-Host "`nPreparing to run setup on EC2..." -ForegroundColor Cyan
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Install Node.js on EC2 (if needed)" -ForegroundColor White
Write-Host "  2. Test connection to Summit database ONLY" -ForegroundColor White
Write-Host "  3. Create/verify all 7 tables in Summit database" -ForegroundColor White
Write-Host "  4. No other databases will be touched`n" -ForegroundColor White

$proceed = Read-Host "Proceed with setup? (yes/no)"
if ($proceed -ne "yes") {
    Write-Host "`n❌ Cancelled`n" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🚀 Running setup via SSM..." -ForegroundColor Green
Write-Host "This may take 5-10 minutes on first run...`n" -ForegroundColor Gray

# Send command via SSM
$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=[$setupScript]" `
    --comment "Summit Database Setup - Summit DB Only" `
    --output text `
    --query "Command.CommandId"

if (-not $commandId) {
    Write-Host "`n❌ Failed to send command!`n" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Command sent! Command ID: $commandId" -ForegroundColor Green
Write-Host "`nWaiting for command to complete..." -ForegroundColor Cyan
Write-Host "(This may take several minutes)...`n" -ForegroundColor Gray

# Wait for command to complete
$maxWait = 600  # 10 minutes
$waited = 0
$status = "InProgress"

while ($status -in @("Pending", "InProgress") -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $INSTANCE_ID `
        --query "Status" `
        --output text 2>$null
    
    Write-Host "." -NoNewline
    
    if ($waited % 30 -eq 0) {
        Write-Host " $($waited)s" -ForegroundColor Gray
    }
}

Write-Host "`n"

# Get command output
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Command Output" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $INSTANCE_ID `
    --output json | ConvertFrom-Json

Write-Host "Status: $($output.Status)" -ForegroundColor $(if ($output.Status -eq "Success") { "Green" } else { "Red" })
Write-Host "`nOutput:" -ForegroundColor Cyan
Write-Host $output.StandardOutputContent

if ($output.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $output.StandardErrorContent
}

Write-Host "`n========================================" -ForegroundColor Cyan

if ($output.Status -eq "Success") {
    Write-Host "✅ Summit database setup complete!" -ForegroundColor Green
    Write-Host "`nYour Summit database is ready to use!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Setup completed with status: $($output.Status)" -ForegroundColor Yellow
    Write-Host "Check the output above for details.`n" -ForegroundColor Yellow
}

Write-Host "========================================`n" -ForegroundColor Cyan

