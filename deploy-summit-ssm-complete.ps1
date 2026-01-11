# Complete Summit Deployment via SSM
# Deploys and starts Summit backend with new database configuration

param(
    [string]$InstanceId = "i-0fba58db502cc8d39",
    [string]$Region = "eu-west-1",
    [string]$DeployPath = "/var/www/summit"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Summit Complete Deployment via SSM" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Deploy Path: $DeployPath" -ForegroundColor Yellow
Write-Host ""

# Step 1: Create/Update .env file with Summit database configuration
Write-Host "[1/5] Creating .env file with Summit database configuration..." -ForegroundColor Green

$envContent = @"
PORT=3000
JWT_SECRET=summit-jwt-secret-$(Get-Random)

# Main Database
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122

# Summit Database Configuration (REQUIRED - separate endpoint for Summit API)
SUMMIT_DB_HOST=summit-db.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
SUMMIT_DB_PORT=5432
SUMMIT_DB_NAME=Summit
SUMMIT_DB_USER=postgres
SUMMIT_DB_PASSWORD=Stacey1122

# Summit API Key
SUMMIT_API_KEY=summit-api-key-$(Get-Random)

# CORS Configuration
CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com

# LiveKit Configuration
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
"@

$createEnvCmd = @"
cd $DeployPath/server
cat > .env << 'ENVEOF'
PORT=3000
JWT_SECRET=summit-jwt-secret-change-in-production

DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122

SUMMIT_DB_HOST=summit-db.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
SUMMIT_DB_PORT=5432
SUMMIT_DB_NAME=Summit
SUMMIT_DB_USER=postgres
SUMMIT_DB_PASSWORD=Stacey1122

SUMMIT_API_KEY=summit-api-key-change-in-production

CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com

LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
ENVEOF
echo "✅ .env file created"
cat .env
"@

Write-Host "Sending command to create .env file..." -ForegroundColor Yellow
$envResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$createEnvCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$envCmdId = $envResult.Command.CommandId
Write-Host "Command ID: $envCmdId" -ForegroundColor Cyan
Write-Host "Waiting for command to complete..." -ForegroundColor Yellow

Start-Sleep -Seconds 10

$envStatus = aws ssm get-command-invocation --command-id $envCmdId --instance-id $InstanceId --query 'Status' --output text 2>$null
Write-Host "Status: $envStatus" -ForegroundColor $(if ($envStatus -eq "Success") { "Green" } else { "Yellow" })
Write-Host ""

# Step 2: Install dependencies
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Green

$installCmd = "cd $DeployPath/server && npm install"

Write-Host "Sending install command..." -ForegroundColor Yellow
$installResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$installCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$installCmdId = $installResult.Command.CommandId
Write-Host "Command ID: $installCmdId" -ForegroundColor Cyan
Write-Host "Waiting for npm install (this may take 1-2 minutes)..." -ForegroundColor Yellow

$maxWait = 180
$waited = 0
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    $status = aws ssm get-command-invocation --command-id $installCmdId --instance-id $InstanceId --query 'Status' --output text 2>$null
    if ($status -eq "Success" -or $status -eq "Failed") {
        break
    }
    Write-Host "." -NoNewline
}
Write-Host ""

$installStatus = aws ssm get-command-invocation --command-id $installCmdId --instance-id $InstanceId --query 'Status' --output text 2>$null
Write-Host "Install Status: $installStatus" -ForegroundColor $(if ($installStatus -eq "Success") { "Green" } else { "Red" })
Write-Host ""

# Step 3: Build the application
Write-Host "[3/5] Building application..." -ForegroundColor Green

$buildCmd = "cd $DeployPath/server && npm run build"

Write-Host "Sending build command..." -ForegroundColor Yellow
$buildResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$buildCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$buildCmdId = $buildResult.Command.CommandId
Write-Host "Command ID: $buildCmdId" -ForegroundColor Cyan
Write-Host "Waiting for build (this may take 30-60 seconds)..." -ForegroundColor Yellow

$waited = 0
while ($waited -lt 120) {
    Start-Sleep -Seconds 5
    $waited += 5
    $status = aws ssm get-command-invocation --command-id $buildCmdId --instance-id $InstanceId --query 'Status' --output text 2>$null
    if ($status -eq "Success" -or $status -eq "Failed") {
        break
    }
    Write-Host "." -NoNewline
}
Write-Host ""

$buildStatus = aws ssm get-command-invocation --command-id $buildCmdId --instance-id $InstanceId --query 'Status' --output text 2>$null
Write-Host "Build Status: $buildStatus" -ForegroundColor $(if ($buildStatus -eq "Success") { "Green" } else { "Red" })
Write-Host ""

# Step 4: Start/Restart server with PM2
Write-Host "[4/5] Starting server with PM2..." -ForegroundColor Green

$startCmd = @"
cd $DeployPath/server
pm2 stop summit 2>/dev/null || true
pm2 delete summit 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
sleep 3
pm2 list
"@

Write-Host "Sending PM2 start command..." -ForegroundColor Yellow
$startResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$startCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$startCmdId = $startResult.Command.CommandId
Write-Host "Command ID: $startCmdId" -ForegroundColor Cyan
Write-Host "Waiting for server to start..." -ForegroundColor Yellow

Start-Sleep -Seconds 10

$startStatus = aws ssm get-command-invocation --command-id $startCmdId --instance-id $InstanceId --query 'Status' --output text 2>$null
Write-Host "Start Status: $startStatus" -ForegroundColor $(if ($startStatus -eq "Success") { "Green" } else { "Yellow" })
Write-Host ""

# Step 5: Verify server is running
Write-Host "[5/5] Verifying server is running..." -ForegroundColor Green

$verifyCmd = @"
sleep 5
pm2 list | grep summit
curl -s http://localhost:3000/health || echo "Health check failed"
curl -s http://localhost:3000/api/summit/status || echo "Summit API status check failed"
netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000 || echo "Port 3000 not listening"
"@

Write-Host "Sending verification command..." -ForegroundColor Yellow
$verifyResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$verifyCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$verifyCmdId = $verifyResult.Command.CommandId
Write-Host "Command ID: $verifyCmdId" -ForegroundColor Cyan
Write-Host "Waiting for verification..." -ForegroundColor Yellow

Start-Sleep -Seconds 8

$verifyOutput = aws ssm get-command-invocation --command-id $verifyCmdId --instance-id $InstanceId --query 'StandardOutputContent' --output text 2>$null
$verifyError = aws ssm get-command-invocation --command-id $verifyCmdId --instance-id $InstanceId --query 'StandardErrorContent' --output text 2>$null

Write-Host ""
Write-Host "=== Verification Output ===" -ForegroundColor Cyan
Write-Host $verifyOutput
if ($verifyError) {
    Write-Host "Errors:" -ForegroundColor Yellow
    Write-Host $verifyError
}
Write-Host ""

# Summary
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instance: $InstanceId" -ForegroundColor White
Write-Host "Deploy Path: $DeployPath" -ForegroundColor White
Write-Host ""
Write-Host "Steps:" -ForegroundColor Yellow
Write-Host "  [1] .env file: $envStatus" -ForegroundColor $(if ($envStatus -eq "Success") { "Green" } else { "Red" })
Write-Host "  [2] npm install: $installStatus" -ForegroundColor $(if ($installStatus -eq "Success") { "Green" } else { "Red" })
Write-Host "  [3] npm build: $buildStatus" -ForegroundColor $(if ($buildStatus -eq "Success") { "Green" } else { "Red" })
Write-Host "  [4] PM2 start: $startStatus" -ForegroundColor $(if ($startStatus -eq "Success") { "Green" } else { "Yellow" })
Write-Host "  [5] Verification: See output above" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test endpoints:" -ForegroundColor Yellow
Write-Host "  https://summit.api.codingeverest.com/health" -ForegroundColor White
Write-Host "  https://summit.api.codingeverest.com/api/summit/status" -ForegroundColor White
Write-Host ""
Write-Host "Or via domain (if DNS configured):" -ForegroundColor Yellow
Write-Host "  http://summit-api.codingeverest.com/health" -ForegroundColor White
Write-Host "  http://summit-api.codingeverest.com/api/summit/status" -ForegroundColor White
Write-Host ""

