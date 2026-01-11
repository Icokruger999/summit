# Ensure Backend is Running - Quick Fix Script
Write-Host "=== Ensuring Backend is Running ===" -ForegroundColor Cyan
Write-Host ""

$instanceId = "i-0fba58db502cc8d39"
$region = "eu-west-1"
$deployPath = "/var/www/summit"

# Step 1: Check current status
Write-Host "[1/3] Checking current status..." -ForegroundColor Yellow
$checkCmd = "cd $deployPath/server && pm2 list | grep summit-backend || echo 'NOT_RUNNING'"
$checkId = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=[$checkCmd]" --region $region --query 'Command.CommandId' --output text
Start-Sleep -Seconds 5
$checkOutput = aws ssm get-command-invocation --command-id $checkId --instance-id $instanceId --region $region --query 'StandardOutputContent' --output text 2>$null

if ($checkOutput -match "summit-backend" -and $checkOutput -notmatch "stopped" -and $checkOutput -notmatch "errored") {
    Write-Host "  ✅ Server is already running" -ForegroundColor Green
    Write-Host "  $checkOutput" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  Server not running, starting now..." -ForegroundColor Yellow
    
    # Step 2: Start server
    Write-Host "[2/3] Starting server with PM2..." -ForegroundColor Yellow
    $startCmd = @"
cd $deployPath/server
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start dist/index.js --name summit-backend --update-env
fi
pm2 save
sleep 3
pm2 list | grep summit
"@
    
    $startId = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=[$startCmd]" --region $region --query 'Command.CommandId' --output text
    Write-Host "  Command sent, waiting 15 seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
    $startOutput = aws ssm get-command-invocation --command-id $startId --instance-id $instanceId --region $region --query 'StandardOutputContent' --output text 2>$null
    Write-Host "  $startOutput" -ForegroundColor Gray
}

# Step 3: Verify
Write-Host "[3/3] Verifying backend is accessible..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    $response = Invoke-WebRequest -Uri "https://summit.api.codingeverest.com/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "  ✅ BACKEND IS WORKING!" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Backend not accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Check PM2 logs: pm2 logs summit-backend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Complete ===" -ForegroundColor Cyan

