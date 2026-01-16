# Fix Summit Backend Configuration
# This script updates the .env file to use local PgBouncer instead of RDS

param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceId,
    
    [Parameter(Mandatory=$false)]
    [string]$DbPassword = "",
    
    [Parameter(Mandatory=$false)]
    [string]$JwtSecret = ""
)

Write-Host "=== Summit Configuration Fix ===" -ForegroundColor Cyan
Write-Host ""

# Generate JWT secret if not provided
if ([string]::IsNullOrEmpty($JwtSecret)) {
    Write-Host "Generating secure JWT secret..." -ForegroundColor Yellow
    $JwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
}

# Create the configuration script
$configScript = @"
#!/bin/bash
set -e

echo "=== Fixing Summit Backend Configuration ==="
echo ""

# Navigate to server directory
cd /var/www/summit/server || cd /opt/summit/server || cd ~/summit/server || {
    echo "❌ Could not find server directory"
    echo "Searching for server directory..."
    find / -name "ecosystem.config.cjs" -type f 2>/dev/null | head -1 | xargs dirname
    exit 1
}

SERVER_DIR=\$(pwd)
echo "✅ Found server directory: \$SERVER_DIR"
echo ""

# Backup existing .env if it exists
if [ -f .env ]; then
    echo "📦 Backing up existing .env to .env.backup.\$(date +%Y%m%d_%H%M%S)"
    cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)
fi

# Get database password from user if not provided
if [ -z "$DbPassword" ]; then
    echo "⚠️  Database password not provided"
    echo "Checking if password exists in current .env..."
    if [ -f .env ] && grep -q "^DB_PASSWORD=" .env; then
        DB_PASSWORD=\$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)
        echo "✅ Using existing password from .env"
    else
        echo "❌ No password found. Please provide DB_PASSWORD"
        echo "You can find it in: /etc/pgbouncer/userlist.txt"
        echo "Or check DATABASE_CREDENTIALS.md"
        exit 1
    fi
else
    DB_PASSWORD="$DbPassword"
fi

# Create new .env file
echo "📝 Creating new .env file with correct configuration..."
cat > .env << 'ENVEOF'
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Database Configuration (PgBouncer on EC2 - LOCAL)
# IMPORTANT: Using localhost PgBouncer, NOT AWS RDS
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=summit
DB_USER=summit_user
DB_PASSWORD=\${DB_PASSWORD}

# JWT Secret
JWT_SECRET=$JwtSecret

# CORS Configuration (Production domains only - NO localhost)
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com

# LiveKit Configuration
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
ENVEOF

# Replace DB_PASSWORD placeholder
sed -i "s|\\\${DB_PASSWORD}|\$DB_PASSWORD|g" .env

echo "✅ .env file created"
echo ""

# Verify configuration
echo "=== Configuration Verification ==="
echo "DB_HOST: \$(grep '^DB_HOST=' .env | cut -d'=' -f2)"
echo "DB_PORT: \$(grep '^DB_PORT=' .env | cut -d'=' -f2)"
echo "DB_NAME: \$(grep '^DB_NAME=' .env | cut -d'=' -f2)"
echo "DB_USER: \$(grep '^DB_USER=' .env | cut -d'=' -f2)"
echo "CORS_ORIGIN: \$(grep '^CORS_ORIGIN=' .env | cut -d'=' -f2)"
echo "PORT: \$(grep '^PORT=' .env | cut -d'=' -f2)"
echo ""

# Test database connection
echo "=== Testing Database Connection ==="
if command -v psql &> /dev/null; then
    if PGPASSWORD=\$DB_PASSWORD psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 1;" &> /dev/null; then
        echo "✅ Database connection successful"
    else
        echo "❌ Database connection failed"
        echo "Checking PgBouncer status..."
        sudo systemctl status pgbouncer --no-pager | head -5
    fi
else
    echo "⚠️  psql not installed, skipping connection test"
fi
echo ""

# Rebuild and restart server
echo "=== Rebuilding Server ==="
if [ -f package.json ]; then
    echo "Installing dependencies..."
    npm install --production
    
    echo "Building TypeScript..."
    npm run build
    
    echo "✅ Build complete"
else
    echo "❌ package.json not found"
    exit 1
fi
echo ""

# Restart PM2
echo "=== Restarting PM2 Process ==="
if command -v pm2 &> /dev/null; then
    # Stop existing process
    pm2 stop summit-backend 2>/dev/null || true
    pm2 delete summit-backend 2>/dev/null || true
    
    # Start with new config
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    
    echo "✅ PM2 restarted"
    echo ""
    
    # Show status
    echo "=== PM2 Status ==="
    pm2 status
    echo ""
    
    # Show recent logs
    echo "=== Recent Logs ==="
    pm2 logs summit-backend --lines 20 --nostream
else
    echo "❌ PM2 not installed"
    echo "Install with: npm install -g pm2"
    exit 1
fi
echo ""

# Test health endpoint
echo "=== Testing Health Endpoint ==="
sleep 3
HEALTH_RESPONSE=\$(curl -s http://localhost:3000/health 2>/dev/null || echo "failed")
if [ "\$HEALTH_RESPONSE" = '{"status":"ok"}' ]; then
    echo "✅ Server is healthy"
else
    echo "❌ Health check failed: \$HEALTH_RESPONSE"
    echo "Check logs: pm2 logs summit-backend"
fi
echo ""

echo "=== Configuration Fix Complete ==="
echo ""
echo "Next steps:"
echo "1. Test registration: curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"name\":\"Test\",\"password\":\"test123\"}'"
echo "2. Check logs: pm2 logs summit-backend"
echo "3. Monitor status: pm2 monit"
echo "4. Test frontend at: https://summit.codingeverest.com"
"@

# Save script to temp file
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$configScript | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline

Write-Host "📤 Uploading configuration script to EC2..." -ForegroundColor Yellow

# Upload script via SSM
$uploadCommand = @"
cat > /tmp/fix-summit-config.sh << 'SCRIPTEOF'
$configScript
SCRIPTEOF
chmod +x /tmp/fix-summit-config.sh
"@

try {
    Write-Host "Connecting to instance $InstanceId..." -ForegroundColor Yellow
    
    # Upload the script
    $uploadResult = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=['$uploadCommand']" `
        --output json | ConvertFrom-Json
    
    $uploadCommandId = $uploadResult.Command.CommandId
    Write-Host "✅ Script uploaded (Command ID: $uploadCommandId)" -ForegroundColor Green
    
    # Wait for upload to complete
    Start-Sleep -Seconds 3
    
    # Execute the script
    Write-Host ""
    Write-Host "🚀 Executing configuration fix..." -ForegroundColor Yellow
    
    $executeResult = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=['/tmp/fix-summit-config.sh']" `
        --output json | ConvertFrom-Json
    
    $executeCommandId = $executeResult.Command.CommandId
    Write-Host "✅ Execution started (Command ID: $executeCommandId)" -ForegroundColor Green
    
    # Wait for execution
    Write-Host ""
    Write-Host "⏳ Waiting for execution to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Get output
    Write-Host ""
    Write-Host "=== Execution Output ===" -ForegroundColor Cyan
    $output = aws ssm get-command-invocation `
        --command-id $executeCommandId `
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
        Write-Host "✅ Configuration fix completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Test registration at: https://summit.codingeverest.com" -ForegroundColor White
        Write-Host "2. Check logs: aws ssm start-session --target $InstanceId" -ForegroundColor White
        Write-Host "   Then run: pm2 logs summit-backend" -ForegroundColor White
    } else {
        Write-Host "⚠️  Configuration fix completed with status: $($output.Status)" -ForegroundColor Yellow
        Write-Host "Check the output above for details" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "1. AWS CLI is configured" -ForegroundColor White
    Write-Host "2. You have SSM permissions" -ForegroundColor White
    Write-Host "3. Instance ID is correct" -ForegroundColor White
    Write-Host "4. SSM agent is running on the instance" -ForegroundColor White
} finally {
    # Cleanup temp file
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
}
