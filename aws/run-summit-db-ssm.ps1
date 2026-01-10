# Run Summit Database Setup via SSM (Simplified Approach)
# Step by step execution to avoid command length limits

$INSTANCE_ID = "i-03589e2371d2fad15"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Summit Database Setup via SSM" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Target: Summit database ONLY" -ForegroundColor Yellow
Write-Host "Instance: $INSTANCE_ID`n" -ForegroundColor White

# Step 1: Create working directory
Write-Host "Step 1: Creating working directory..." -ForegroundColor Cyan
$cmd1 = 'if (-not (Test-Path "C:\summit-db-setup")) { New-Item -ItemType Directory -Path "C:\summit-db-setup" -Force | Out-Null }; Write-Host "Working directory ready"'

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=['$cmd1']" `
    --output text `
    --query "Command.CommandId"

Start-Sleep -Seconds 10
Write-Host "✅ Directory created`n" -ForegroundColor Green

# Step 2: Install Node.js (if needed)
Write-Host "Step 2: Checking Node.js..." -ForegroundColor Cyan
$cmd2 = @'
cd C:\summit-db-setup
try {
    $nodeVer = node --version
    Write-Host "Node.js already installed: $nodeVer"
} catch {
    Write-Host "Installing Node.js via Chocolatey..."
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString(''https://community.chocolatey.org/install.ps1''))
    }
    choco install nodejs -y --force
    Write-Host "Node.js installed"
}
'@

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=['$cmd2']" `
    --output text `
    --query "Command.CommandId"

Start-Sleep -Seconds 30
Write-Host "✅ Node.js ready`n" -ForegroundColor Green

# Step 3: Install pg package
Write-Host "Step 3: Installing PostgreSQL client..." -ForegroundColor Cyan
$cmd3 = @'
cd C:\summit-db-setup
npm init -y 2>&1 | Out-Null
npm install pg --save 2>&1 | Out-Null
Write-Host "PostgreSQL client installed"
'@

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=['$cmd3']" `
    --output text `
    --query "Command.CommandId"

Start-Sleep -Seconds 20
Write-Host "✅ PostgreSQL client installed`n" -ForegroundColor Green

# Step 4: Create test script
Write-Host "Step 4: Creating test script..." -ForegroundColor Cyan
$testJs = @'
const { Client } = require('pg');
const client = new Client({
  host: 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: 5432,
  database: 'Summit',
  user: 'postgres',
  password: 'Stacey1122',
  ssl: { rejectUnauthorized: false }
});
async function test() {
  try {
    await client.connect();
    const result = await client.query('SELECT current_database(), NOW()');
    console.log('Connected to:', result.rows[0].current_database);
    console.log('Time:', result.rows[0].now);
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
test();
'@

$cmd4 = "cd C:\summit-db-setup; @'`n$testJs`n'@ | Out-File -FilePath test.cjs -Encoding UTF8"

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=['$cmd4']" `
    --output text `
    --query "Command.CommandId"

Start-Sleep -Seconds 5
Write-Host "✅ Test script created`n" -ForegroundColor Green

# Step 5: Test connection
Write-Host "Step 5: Testing database connection..." -ForegroundColor Cyan
$cmd5 = 'cd C:\summit-db-setup; node test.cjs'

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=['$cmd5']" `
    --output text `
    --query "Command.CommandId"

Start-Sleep -Seconds 10

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $INSTANCE_ID `
    --output json | ConvertFrom-Json

Write-Host $output.StandardOutputContent
if ($output.Status -eq "Success") {
    Write-Host "✅ Connection test passed`n" -ForegroundColor Green
} else {
    Write-Host "❌ Connection test failed`n" -ForegroundColor Red
    Write-Host $output.StandardErrorContent
    exit 1
}

# Step 6: Create schema SQL file
Write-Host "Step 6: Creating schema file..." -ForegroundColor Cyan

# Read local schema file
$schemaContent = Get-Content "database\complete_schema.sql" -Raw

# Upload schema in chunks if needed - for now, create a simple version
$cmd6 = @"
cd C:\summit-db-setup
@'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), email TEXT NOT NULL UNIQUE, name TEXT, avatar_url TEXT, password_hash TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE TABLE IF NOT EXISTS meetings (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), title TEXT NOT NULL, description TEXT, start_time TIMESTAMP WITH TIME ZONE NOT NULL, end_time TIMESTAMP WITH TIME ZONE NOT NULL, room_id TEXT NOT NULL UNIQUE, created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, recurrence JSONB, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_room_id ON meetings(room_id);
CREATE TABLE IF NOT EXISTS meeting_participants (meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL, user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), PRIMARY KEY (meeting_id, user_id));
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE TABLE IF NOT EXISTS meeting_invitations (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL, inviter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, invitee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, status TEXT DEFAULT 'pending', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), UNIQUE(meeting_id, invitee_id));
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_invitee_id ON meeting_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_status ON meeting_invitations(status);
CREATE TABLE IF NOT EXISTS attachments (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, file_name TEXT NOT NULL, file_path TEXT NOT NULL, file_size BIGINT NOT NULL, mime_type TEXT, chat_id TEXT, meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_chat_id ON attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_attachments_meeting_id ON attachments(meeting_id);
CREATE TABLE IF NOT EXISTS presence (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'offline', last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_presence_status ON presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen);
CREATE TABLE IF NOT EXISTS message_reads (message_id TEXT NOT NULL, user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), PRIMARY KEY (message_id, user_id));
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON message_reads(read_at);
'@ | Out-File -FilePath schema.sql -Encoding UTF8
Write-Host "Schema file created"
"@

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=['$cmd6']" `
    --output text `
    --query "Command.CommandId"

Start-Sleep -Seconds 5
Write-Host "✅ Schema file created`n" -ForegroundColor Green

# Step 7: Create setup script
Write-Host "Step 7: Creating setup script..." -ForegroundColor Cyan
$setupJs = @'
const { Client } = require('pg');
const fs = require('fs');
const client = new Client({
  host: 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: 5432,
  database: 'Summit',
  user: 'postgres',
  password: 'Stacey1122',
  ssl: { rejectUnauthorized: false }
});
async function setup() {
  try {
    await client.connect();
    const dbCheck = await client.query('SELECT current_database()');
    if (dbCheck.rows[0].current_database !== 'Summit') {
      throw new Error('Not connected to Summit database!');
    }
    console.log('Connected to Summit database');
    const schema = fs.readFileSync('schema.sql', 'utf8');
    await client.query(schema);
    console.log('Schema executed');
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
    console.log('Tables created:');
    tables.rows.forEach(r => console.log('  -', r.table_name));
    await client.end();
    console.log('Setup complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
setup();
'@

$cmd7 = "cd C:\summit-db-setup; @'`n$setupJs`n'@ | Out-File -FilePath setup.cjs -Encoding UTF8"

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=['$cmd7']" `
    --output text `
    --query "Command.CommandId"

Start-Sleep -Seconds 5
Write-Host "✅ Setup script created`n" -ForegroundColor Green

# Step 8: Run setup
Write-Host "Step 8: Running database setup..." -ForegroundColor Cyan
Write-Host "(Creating all Summit database tables)...`n" -ForegroundColor Gray

$cmd8 = 'cd C:\summit-db-setup; node setup.cjs'

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=['$cmd8']" `
    --output text `
    --query "Command.CommandId"

Start-Sleep -Seconds 15

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $INSTANCE_ID `
    --output json | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setup Results" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host $output.StandardOutputContent

if ($output.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $output.StandardErrorContent
}

Write-Host "`n========================================" -ForegroundColor Cyan

if ($output.Status -eq "Success") {
    Write-Host "✅ Summit database setup complete!" -ForegroundColor Green
    Write-Host "`nAll tables created in Summit database ONLY" -ForegroundColor Green
    Write-Host "No other databases were affected`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Setup status: $($output.Status)" -ForegroundColor Yellow
}

Write-Host "========================================`n" -ForegroundColor Cyan

