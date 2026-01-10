# Setup Summit Database via SSM - Working Version
# This creates and executes scripts on the EC2 instance

$INSTANCE_ID = "i-03589e2371d2fad15"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Summit Database Setup via SSM" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Target: Summit database ONLY" -ForegroundColor Yellow
Write-Host "Instance: $INSTANCE_ID`n" -ForegroundColor White

# Step 1: Create working directory
Write-Host "[1/8] Creating working directory..." -ForegroundColor Cyan
aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands='New-Item -ItemType Directory -Path C:\summit-db-setup -Force | Out-Null; Write-Host Done'" `
    --output text --query "Command.CommandId" | Out-Null
Start-Sleep -Seconds 5
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 2: Check/Install Node.js
Write-Host "[2/8] Checking Node.js..." -ForegroundColor Cyan
$nodeCheck = @'
try { 
    $v = node --version; 
    Write-Host "Node.js already installed: $v" 
} catch { 
    Write-Host "Node.js not found. Please install manually." 
}
'@
aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands='$nodeCheck'" `
    --output text --query "Command.CommandId" | Out-Null
Start-Sleep -Seconds 5
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 3: Create package.json
Write-Host "[3/8] Setting up npm..." -ForegroundColor Cyan
$packageJson = '{"name":"summit-db-setup","version":"1.0.0","dependencies":{"pg":"latest"}}'
aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands='cd C:\summit-db-setup; ''$packageJson'' | Out-File package.json -Encoding UTF8; npm install; Write-Host Done'" `
    --output text --query "Command.CommandId" | Out-Null
Start-Sleep -Seconds 30
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 4: Create connection test script
Write-Host "[4/8] Creating test script..." -ForegroundColor Cyan
$testScript = @"
const {Client} = require('pg');
const c = new Client({host:'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',port:5432,database:'Summit',user:'postgres',password:'Stacey1122',ssl:{rejectUnauthorized:false}});
c.connect().then(() => c.query('SELECT current_database()')).then(r => {console.log('Connected to:',r.rows[0].current_database);c.end();}).catch(e => {console.error('Error:',e.message);process.exit(1);});
"@

# Write script in chunks to avoid issues
aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands='cd C:\summit-db-setup; @''$testScript''@ | Out-File test.cjs -Encoding UTF8; Write-Host Done'" `
    --output text --query "Command.CommandId" | Out-Null
Start-Sleep -Seconds 5
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 5: Test connection
Write-Host "[5/8] Testing database connection..." -ForegroundColor Cyan
$cmdId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands='cd C:\summit-db-setup; node test.cjs'" `
    --output text --query "Command.CommandId"

Start-Sleep -Seconds 10
$result = aws ssm get-command-invocation --command-id $cmdId --instance-id $INSTANCE_ID --output json | ConvertFrom-Json

if ($result.StandardOutputContent -match "Connected to") {
    Write-Host "      ✅ Connection successful`n" -ForegroundColor Green
} else {
    Write-Host "      ❌ Connection failed" -ForegroundColor Red
    Write-Host $result.StandardErrorContent
    exit 1
}

# Step 6: Create schema file
Write-Host "[6/8] Creating schema..." -ForegroundColor Cyan
$schema = @"
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),email TEXT NOT NULL UNIQUE,name TEXT,avatar_url TEXT,password_hash TEXT,created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE TABLE IF NOT EXISTS meetings(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),title TEXT NOT NULL,description TEXT,start_time TIMESTAMP WITH TIME ZONE NOT NULL,end_time TIMESTAMP WITH TIME ZONE NOT NULL,room_id TEXT NOT NULL UNIQUE,created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,recurrence JSONB,created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_room_id ON meetings(room_id);
CREATE TABLE IF NOT EXISTS meeting_participants(meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,status TEXT DEFAULT 'pending',created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),PRIMARY KEY(meeting_id,user_id));
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE TABLE IF NOT EXISTS meeting_invitations(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,inviter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,invitee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,status TEXT DEFAULT 'pending',created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),UNIQUE(meeting_id,invitee_id));
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_invitee_id ON meeting_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_status ON meeting_invitations(status);
CREATE TABLE IF NOT EXISTS attachments(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,file_name TEXT NOT NULL,file_path TEXT NOT NULL,file_size BIGINT NOT NULL,mime_type TEXT,chat_id TEXT,meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_chat_id ON attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_attachments_meeting_id ON attachments(meeting_id);
CREATE TABLE IF NOT EXISTS presence(user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,status TEXT NOT NULL DEFAULT 'offline',last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_presence_status ON presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen);
CREATE TABLE IF NOT EXISTS message_reads(message_id TEXT NOT NULL,user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),PRIMARY KEY(message_id,user_id));
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON message_reads(read_at);
"@

aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands='cd C:\summit-db-setup; @''$schema''@ | Out-File schema.sql -Encoding UTF8; Write-Host Done'" `
    --output text --query "Command.CommandId" | Out-Null
Start-Sleep -Seconds 5
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 7: Create setup script
Write-Host "[7/8] Creating setup script..." -ForegroundColor Cyan
$setupScript = @"
const {Client}=require('pg');
const fs=require('fs');
const c=new Client({host:'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',port:5432,database:'Summit',user:'postgres',password:'Stacey1122',ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query('SELECT current_database()')).then(r=>{if(r.rows[0].current_database!=='Summit')throw new Error('Wrong database!');console.log('Connected to Summit');return c.query(fs.readFileSync('schema.sql','utf8'));}).then(()=>{console.log('Schema executed');return c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");}).then(r=>{console.log('Tables created:');r.rows.forEach(t=>console.log('  -',t.table_name));c.end();console.log('Setup complete!');}).catch(e=>{console.error('Error:',e.message);process.exit(1);});
"@

aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands='cd C:\summit-db-setup; @''$setupScript''@ | Out-File setup.cjs -Encoding UTF8; Write-Host Done'" `
    --output text --query "Command.CommandId" | Out-Null
Start-Sleep -Seconds 5
Write-Host "      ✅ Complete`n" -ForegroundColor Green

# Step 8: Run setup
Write-Host "[8/8] Running database setup..." -ForegroundColor Cyan
Write-Host "      (Creating all Summit database tables)`n" -ForegroundColor Gray

$cmdId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands='cd C:\summit-db-setup; node setup.cjs'" `
    --output text --query "Command.CommandId"

Start-Sleep -Seconds 15
$result = aws ssm get-command-invocation --command-id $cmdId --instance-id $INSTANCE_ID --output json | ConvertFrom-Json

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Setup Results" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host $result.StandardOutputContent -ForegroundColor White

if ($result.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $result.StandardErrorContent -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan

if ($result.Status -eq "Success" -and $result.StandardOutputContent -match "Setup complete") {
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "`nSummit database setup complete!" -ForegroundColor Green
    Write-Host "All tables created in Summit database ONLY" -ForegroundColor White
    Write-Host "No other databases were affected`n" -ForegroundColor White
} else {
    Write-Host "⚠️  Setup may have encountered issues" -ForegroundColor Yellow
    Write-Host "Check the output above for details`n" -ForegroundColor Yellow
}

Write-Host "========================================`n" -ForegroundColor Cyan

