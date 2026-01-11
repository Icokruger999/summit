# Quick Status Check - Backend and Frontend
Write-Host "=== Summit Status Check ===" -ForegroundColor Cyan
Write-Host ""

# Check Backend
Write-Host "Backend (summit.api.codingeverest.com):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://summit.api.codingeverest.com/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "  ✅ UP - Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ DOWN - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check Frontend
Write-Host "Frontend (summit.codingeverest.com):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://summit.codingeverest.com" -UseBasicParsing -TimeoutSec 5
    Write-Host "  ✅ UP - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ DOWN - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check PM2 Status
Write-Host "PM2 Status (EC2):" -ForegroundColor Yellow
$cmdId = aws ssm send-command --instance-ids i-0fba58db502cc8d39 --document-name "AWS-RunShellScript" --parameters "commands=['pm2 list | grep summit || echo NO_SUMMIT']" --region eu-west-1 --query 'Command.CommandId' --output text
Start-Sleep -Seconds 5
$output = aws ssm get-command-invocation --command-id $cmdId --instance-id i-0fba58db502cc8d39 --region eu-west-1 --query 'StandardOutputContent' --output text 2>$null
if ($output -match "summit") {
    Write-Host "  ✅ PM2 process running" -ForegroundColor Green
    Write-Host "  $output" -ForegroundColor Gray
} else {
    Write-Host "  ❌ PM2 process NOT running" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Status Check Complete ===" -ForegroundColor Cyan

