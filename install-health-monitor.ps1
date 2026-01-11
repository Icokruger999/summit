# Install Health Monitor and Cron Job
Write-Host "=== Installing Health Monitor ===" -ForegroundColor Cyan

$instanceId = "i-0fba58db502cc8d39"
$region = "eu-west-1"

# Create health check script
$scriptContent = @'
#!/bin/bash
DEPLOY_PATH="/var/www/summit/server"
LOCAL_URL="http://localhost:3000/health"
LOG_FILE="/var/log/summit-health-check.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
check_backend() { curl -s -f "$LOCAL_URL" > /dev/null 2>&1 && return 0 || return 1; }
check_pm2() { cd "$DEPLOY_PATH" && pm2 list | grep -q "summit-backend.*online" && return 0 || return 1; }
start_backend() {
  log "Starting backend..."
  cd "$DEPLOY_PATH" || return 1
  pm2 stop summit-backend 2>/dev/null
  pm2 delete summit-backend 2>/dev/null
  if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js --env production
  else
    pm2 start dist/index.js --name summit-backend
  fi
  pm2 save
  sleep 10
  pm2 list | grep -q "summit-backend.*online" && log "Backend started" || log "Backend failed"
}
main() {
  log "=== Health Check ==="
  if check_backend; then
    log "✅ Backend responding"
    check_pm2 || start_backend
    exit 0
  else
    log "❌ Backend NOT responding"
    check_pm2 || start_backend
    pm2 restart summit-backend 2>/dev/null
    sleep 10
    check_backend && log "✅ Fixed" || log "❌ Still down"
  fi
}
main
'@

# Base64 encode to avoid escaping issues
$bytes = [System.Text.Encoding]::UTF8.GetBytes($scriptContent)
$base64 = [Convert]::ToBase64String($bytes)

# Create script on server
$createScript = @"
echo '$base64' | base64 -d > /var/www/summit/health-check-fix.sh
chmod +x /var/www/summit/health-check-fix.sh
echo "Script created"
"@

Write-Host "[1/3] Creating health check script..." -ForegroundColor Yellow
$result1 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=[$createScript]" --region $region --output json | ConvertFrom-Json
$cmdId1 = $result1.Command.CommandId
Start-Sleep -Seconds 8
$status1 = aws ssm get-command-invocation --command-id $cmdId1 --instance-id $instanceId --region $region --query 'Status' --output text
Write-Host "  Status: $status1" -ForegroundColor $(if ($status1 -eq "Success") { "Green" } else { "Red" })

# Install cron job
$installCron = @"
(crontab -l 2>/dev/null | grep -v summit-health; echo '*/5 * * * * /var/www/summit/health-check-fix.sh >> /var/log/summit-health-check.log 2>&1') | crontab -
crontab -l | grep summit
echo "Cron installed"
"@

Write-Host "[2/3] Installing cron job (runs every 5 minutes)..." -ForegroundColor Yellow
$result2 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=[$installCron]" --region $region --output json | ConvertFrom-Json
$cmdId2 = $result2.Command.CommandId
Start-Sleep -Seconds 5
$output2 = aws ssm get-command-invocation --command-id $cmdId2 --instance-id $instanceId --region $region --query 'StandardOutputContent' --output text
Write-Host "  $output2" -ForegroundColor Gray

# Run health check now
Write-Host "[3/3] Running health check now..." -ForegroundColor Yellow
$runCheck = "/var/www/summit/health-check-fix.sh"
$result3 = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=[$runCheck]" --region $region --output json | ConvertFrom-Json
$cmdId3 = $result3.Command.CommandId
Start-Sleep -Seconds 15
$output3 = aws ssm get-command-invocation --command-id $cmdId3 --instance-id $instanceId --region $region --query 'StandardOutputContent' --output text
Write-Host "  $output3" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Health monitor installed!" -ForegroundColor Green
Write-Host "  - Script: /var/www/summit/health-check-fix.sh" -ForegroundColor Gray
Write-Host "  - Cron: Every 5 minutes" -ForegroundColor Gray
Write-Host "  - Log: /var/log/summit-health-check.log" -ForegroundColor Gray
Write-Host ""

