# Verify Deployment and Health Monitor
Write-Host "=== Verifying Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check Backend
Write-Host "Backend Health:" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "https://summit.api.codingeverest.com/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "  ✅ UP - $($r.StatusCode) - $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ DOWN - $($_.Exception.Message)" -ForegroundColor Red
}

# Check Frontend
Write-Host "Frontend:" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "https://summit.codingeverest.com" -UseBasicParsing -TimeoutSec 10
    Write-Host "  ✅ UP - $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ DOWN - $($_.Exception.Message)" -ForegroundColor Red
}

# Check Cron Job
Write-Host "Cron Job:" -ForegroundColor Yellow
$cmd = 'crontab -l | grep summit-health || echo "NOT_FOUND"'
$id = aws ssm send-command --instance-ids i-0fba58db502cc8d39 --document-name "AWS-RunShellScript" --parameters commands="[$cmd]" --region eu-west-1 --query 'Command.CommandId' --output text
Start-Sleep -Seconds 5
$output = aws ssm get-command-invocation --command-id $id --instance-id i-0fba58db502cc8d39 --region eu-west-1 --query 'StandardOutputContent' --output text 2>$null
if ($output -match "summit-health") {
    Write-Host "  ✅ Cron job installed" -ForegroundColor Green
    Write-Host "  $output" -ForegroundColor Gray
} else {
    Write-Host "  ❌ Cron job NOT installed" -ForegroundColor Red
}

# Check Health Check Script
Write-Host "Health Check Script:" -ForegroundColor Yellow
$cmd = 'test -f /var/www/summit/health-check-fix.sh && echo "EXISTS" || echo "NOT_FOUND"'
$id = aws ssm send-command --instance-ids i-0fba58db502cc8d39 --document-name "AWS-RunShellScript" --parameters commands="[$cmd]" --region eu-west-1 --query 'Command.CommandId' --output text
Start-Sleep -Seconds 5
$output = aws ssm get-command-invocation --command-id $id --instance-id i-0fba58db502cc8d39 --region eu-west-1 --query 'StandardOutputContent' --output text 2>$null
if ($output -match "EXISTS") {
    Write-Host "  ✅ Script exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ Script NOT found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Cyan

