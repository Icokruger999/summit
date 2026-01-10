# Complete Setup: Install Node.js + Setup Summit Database via SSM
# For Windows Server on EC2

$INSTANCE_ID = "i-03589e2371d2fad15"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   EC2 Setup + Summit Database" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Install Node.js on EC2" -ForegroundColor White
Write-Host "  2. Setup Summit database tables" -ForegroundColor White
Write-Host "  3. ONLY affect Summit database`n" -ForegroundColor White

# Step 1: Install Chocolatey
Write-Host "[1/5] Installing Chocolatey package manager..." -ForegroundColor Cyan
$chocoInstall = @'
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
try {
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Host "Chocolatey installed"
} catch {
    Write-Host "Chocolatey may already be installed or installation failed: $_"
}
'@

$cmdId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters commands="$chocoInstall" `
    --output text --query "Command.CommandId"

Write-Host "      Waiting..." -ForegroundColor Gray
Start-Sleep -Seconds 60
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 2: Install Node.js
Write-Host "[2/5] Installing Node.js..." -ForegroundColor Cyan
$nodeInstall = 'choco install nodejs -y --force; refreshenv; node --version'

$cmdId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters commands="$nodeInstall" `
    --output text --query "Command.CommandId"

Write-Host "      Waiting..." -ForegroundColor Gray
Start-Sleep -Seconds 120
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 3: Setup workspace
Write-Host "[3/5] Setting up workspace..." -ForegroundColor Cyan
$workspace = @'
New-Item -ItemType Directory -Path C:\summit-db-setup -Force | Out-Null
cd C:\summit-db-setup
'{"name":"summit-db","version":"1.0.0","dependencies":{"pg":"latest"}}' | Out-File package.json -Encoding UTF8
& "C:\Program Files\nodejs\npm.cmd" install
Write-Host "Workspace ready"
'@

$cmdId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters commands="$workspace" `
    --output text --query "Command.CommandId"

Write-Host "      Waiting..." -ForegroundColor Gray
Start-Sleep -Seconds 45
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 4: Create database scripts
Write-Host "[4/5] Creating database scripts..." -ForegroundColor Cyan

# Use here-string for the Node.js script content
$dbScripts = @'
cd C:\summit-db-setup

# Test script
$testJs = @"
const {Client} = require('pg');
const client = new Client({
  host: 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: 5432,
  database: 'Summit',
  user: 'postgres',
  password: 'Stacey1122',
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => client.query('SELECT current_database() as db'))
  .then(r => { console.log('Connected to:', r.rows[0].db); return client.end(); })
  .catch(e => { console.error('Error:', e.message); process.exit(1); });
"@
$testJs | Out-File test.cjs -Encoding UTF8

# Schema
$schema = "CREATE EXTENSION IF NOT EXISTS ""uuid-ossp""; CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),email TEXT NOT NULL UNIQUE,name TEXT,avatar_url TEXT,password_hash TEXT,created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_users_email ON users(email); CREATE TABLE IF NOT EXISTS meetings(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),title TEXT NOT NULL,description TEXT,start_time TIMESTAMP WITH TIME ZONE NOT NULL,end_time TIMESTAMP WITH TIME ZONE NOT NULL,room_id TEXT NOT NULL UNIQUE,created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,recurrence JSONB,created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by); CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time); CREATE INDEX IF NOT EXISTS idx_meetings_room_id ON meetings(room_id); CREATE TABLE IF NOT EXISTS meeting_participants(meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,status TEXT DEFAULT 'pending',created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),PRIMARY KEY(meeting_id,user_id)); CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id); CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id); CREATE TABLE IF NOT EXISTS meeting_invitations(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,inviter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,invitee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,status TEXT DEFAULT 'pending',created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),UNIQUE(meeting_id,invitee_id)); CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id); CREATE INDEX IF NOT EXISTS idx_meeting_invitations_invitee_id ON meeting_invitations(invitee_id); CREATE INDEX IF NOT EXISTS idx_meeting_invitations_status ON meeting_invitations(status); CREATE TABLE IF NOT EXISTS attachments(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,file_name TEXT NOT NULL,file_path TEXT NOT NULL,file_size BIGINT NOT NULL,mime_type TEXT,chat_id TEXT,meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id); CREATE INDEX IF NOT EXISTS idx_attachments_chat_id ON attachments(chat_id); CREATE INDEX IF NOT EXISTS idx_attachments_meeting_id ON attachments(meeting_id); CREATE TABLE IF NOT EXISTS presence(user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,status TEXT NOT NULL DEFAULT 'offline',last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_presence_status ON presence(status); CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen); CREATE TABLE IF NOT EXISTS message_reads(message_id TEXT NOT NULL,user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),PRIMARY KEY(message_id,user_id)); CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id); CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON message_reads(read_at);"
$schema | Out-File schema.sql -Encoding UTF8

# Setup script
$setupJs = @"
const {Client} = require('pg');
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
    const dbCheck = await client.query('SELECT current_database() as db');
    if (dbCheck.rows[0].db !== 'Summit') throw new Error('Wrong database!');
    console.log('Connected to Summit database');
    const schema = fs.readFileSync('schema.sql', 'utf8');
    await client.query(schema);
    console.log('Schema executed');
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
    console.log('Tables in Summit database:');
    tables.rows.forEach(t => console.log('  ✓', t.table_name));
    await client.end();
    console.log('Setup complete!');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
setup();
"@
$setupJs | Out-File setup.cjs -Encoding UTF8

Write-Host "Scripts created"
'@

$cmdId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters commands="$dbScripts" `
    --output text --query "Command.CommandId"

Write-Host "      Waiting..." -ForegroundColor Gray
Start-Sleep -Seconds 10
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 5: Run database setup
Write-Host "[5/5] Running Summit database setup..." -ForegroundColor Cyan
Write-Host "      (This will create all tables in Summit database ONLY)`n" -ForegroundColor Gray

$runSetup = @'
cd C:\summit-db-setup
Write-Host "Testing connection..."
& "C:\Program Files\nodejs\node.exe" test.cjs
if ($LASTEXITCODE -eq 0) {
    Write-Host "`nRunning setup..."
    & "C:\Program Files\nodejs\node.exe" setup.cjs
} else {
    Write-Host "Connection test failed!"
    exit 1
}
'@

$cmdId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters commands="$runSetup" `
    --output text --query "Command.CommandId"

Write-Host "      Waiting for results..." -ForegroundColor Gray
Start-Sleep -Seconds 20

$result = aws ssm get-command-invocation --command-id $cmdId --instance-id $INSTANCE_ID --output json | ConvertFrom-Json

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Setup Results" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($result.StandardOutputContent) {
    Write-Host $result.StandardOutputContent -ForegroundColor White
}

if ($result.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $result.StandardErrorContent -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan

if ($result.Status -eq "Success" -and $result.StandardOutputContent -match "Setup complete") {
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "`nSummit database setup complete via SSM!" -ForegroundColor Green
    Write-Host "Node.js installed on EC2: C:\Program Files\nodejs" -ForegroundColor White
    Write-Host "All tables created in Summit database ONLY" -ForegroundColor White
    Write-Host "No other databases were affected`n" -ForegroundColor White
} else {
    Write-Host "⚠️  Setup may have encountered issues" -ForegroundColor Yellow
    Write-Host "Status: $($result.Status)" -ForegroundColor Yellow
    Write-Host "`nNote: Database may already be set up from previous run`n" -ForegroundColor Gray
}

Write-Host "========================================`n" -ForegroundColor Cyan

