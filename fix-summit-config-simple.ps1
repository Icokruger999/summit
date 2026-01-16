# Fix Summit Backend Configuration
param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceId
)

Write-Host "=== Summit Configuration Fix ===" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

# Create the bash script content
$bashScript = @'
#!/bin/bash
set -e

echo "=== Fixing Summit Backend Configuration ==="
echo ""

# Find server directory
if [ -d '/var/www/summit/server' ]; then
    cd /var/www/summit/server
elif [ -d '/opt/summit/server' ]; then
    cd /opt/summit/server
elif [ -d "$HOME/summit/server" ]; then
    cd $HOME/summit/server
else
    echo "Searching for server directory..."
    SERVER_PATH=$(find /home /var/www /opt -name "ecosystem.config.cjs" -type f 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
    if [ -n "$SERVER_PATH" ]; then
        cd "$SERVER_PATH"
    else
        echo "ERROR: Could not find server directory"
        exit 1
    fi
fi

SERVER_DIR=$(pwd)
echo "Found server directory: $SERVER_DIR"
echo ""

# Backup existing .env
if [ -f .env ]; then
    echo "Backing up existing .env"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Get existing password
    if grep -q '^DB_PASSWORD=' .env; then
        DB_PASSWORD=$(grep '^DB_PASSWORD=' .env | cut -d'=' -f2)
        echo "Using existing password from .env"
    else
        DB_PASSWORD='CHANGE_ME'
    fi
else
    DB_PASSWORD='CHANGE_ME'
fi

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)

# Create new .env file
echo "Creating new .env file..."
cat > .env << ENVEOF
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Database Configuration (PgBouncer on EC2 - LOCAL)
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=summit
DB_USER=summit_user
DB_PASSWORD=$DB_PASSWORD

# JWT Secret
JWT_SECRET=$JWT_SECRET

# CORS Configuration
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com

# LiveKit Configuration
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
ENVEOF

echo "Configuration created"
echo ""

# Show configuration (without password)
echo "=== Configuration ==="
grep -E '^(DB_HOST|DB_PORT|DB_NAME|DB_USER|CORS_ORIGIN|PORT)=' .env
echo ""

# Test database connection
echo "=== Testing Database Connection ==="
if command -v psql > /dev/null 2>&1; then
    if PGPASSWORD=$DB_PASSWORD psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c 'SELECT 1;' > /dev/null 2>&1; then
        echo "SUCCESS: Database connection works"
    else
        echo "WARNING: Database connection failed"
        echo "Checking PgBouncer status..."
        sudo systemctl status pgbouncer --no-pager | head -5 || true
    fi
else
    echo "SKIP: psql not installed"
fi
echo ""

# Rebuild
echo "=== Rebuilding Server ==="
npm install --production
npm run build
echo "Build complete"
echo ""

# Restart PM2
echo "=== Restarting PM2 ==="
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
echo "PM2 restarted"
echo ""

# Show status
pm2 status
echo ""

# Test health
sleep 3
echo "=== Testing Health Endpoint ==="
HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null || echo "failed")
echo "Health response: $HEALTH"
echo ""

echo "=== Configuration Fix Complete ==="
echo "Test at: https://summit.codingeverest.com"
'@

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$bashScript | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

try {
    Write-Host "Uploading and executing fix script..." -ForegroundColor Yellow
    
    # Create the SSM command
    $commands = @(
        "cat > /tmp/fix-summit.sh << 'EOFSCRIPT'",
        $bashScript,
        "EOFSCRIPT",
        "chmod +x /tmp/fix-summit.sh",
        "/tmp/fix-summit.sh"
    )
    
    $commandJson = $commands | ConvertTo-Json -Compress
    
    # Execute via SSM
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=$commandJson" `
        --output json | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    Write-Host "Command sent. ID: $commandId" -ForegroundColor Green
    Write-Host ""
    
    # Wait for execution
    Write-Host "Waiting for execution to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Get output
    Write-Host ""
    Write-Host "=== Execution Output ===" -ForegroundColor Cyan
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --output json | ConvertFrom-Json
    
    Write-Host $output.StandardOutputContent
    
    if ($output.StandardErrorContent) {
        Write-Host ""
        Write-Host "=== Errors ===" -ForegroundColor Red
        Write-Host $output.StandardErrorContent
    }
    
    Write-Host ""
    if ($output.Status -eq "Success") {
        Write-Host "SUCCESS: Configuration fixed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Test registration at: https://summit.codingeverest.com"
        Write-Host "2. Try creating an account with email, name, and password"
        Write-Host "3. Check if you get logged in automatically"
    } else {
        Write-Host "Status: $($output.Status)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
} finally {
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
}
