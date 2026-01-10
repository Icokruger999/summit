# Script to restart backend on EC2
$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"

Write-Host "=== Restarting Summit Backend on EC2 ===" -ForegroundColor Cyan

$commands = @(
    "cd /var/www/summit || cd ~/summit || cd /home/ubuntu/summit",
    "echo 'Current directory:'",
    "pwd",
    "echo ''",
    "echo 'Stopping existing Summit process...'",
    "pm2 stop summit || pm2 delete summit || echo 'No existing process'",
    "echo ''",
    "echo 'Checking if dist/index.js exists...'",
    "test -f dist/index.js && echo '✅ dist/index.js found' || echo '❌ dist/index.js NOT found'",
    "echo ''",
    "echo 'Starting Summit backend...'",
    "PORT=4000 pm2 start dist/index.js --name summit || echo 'Failed to start'",
    "echo ''",
    "echo 'PM2 Status:'",
    "pm2 list",
    "echo ''",
    "echo 'Waiting 3 seconds...'",
    "sleep 3",
    "echo 'Checking if port 4000 is listening...'",
    "netstat -tlnp 2>/dev/null | grep :4000 || ss -tlnp 2>/dev/null | grep :4000 || echo 'Port 4000 not listening'",
    "echo ''",
    "echo 'Testing database connection...'",
    "PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -p 5432 -U postgres -d Summit -c 'SELECT current_database();' 2>&1 | head -3 || echo 'Database test failed'"
)

$commandsJson = ($commands | ConvertTo-Json -Compress) -replace '"', '\"'

Write-Host "`nSending SSM command to EC2..." -ForegroundColor Yellow

$output = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "{`"commands`": $commandsJson}" `
    --region $region `
    --output json 2>&1

if ($LASTEXITCODE -eq 0) {
    $result = $output | ConvertFrom-Json
    $commandId = $result.Command.CommandId
    
    Write-Host "Command ID: $commandId" -ForegroundColor Gray
    Write-Host "Waiting for command to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8
    
    $invocation = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $instanceId `
        --region $region `
        --output json 2>&1 | ConvertFrom-Json
    
    Write-Host "`n=== Command Output ===" -ForegroundColor Cyan
    Write-Host $invocation.StandardOutputContent
    
    if ($invocation.StandardErrorContent) {
        Write-Host "`n=== Errors ===" -ForegroundColor Red
        Write-Host $invocation.StandardErrorContent
    }
    
    Write-Host "`n=== Command Status: $($invocation.Status) ===" -ForegroundColor $(if($invocation.Status -eq "Success"){"Green"}else{"Yellow"})
} else {
    Write-Host "Failed to send SSM command" -ForegroundColor Red
    Write-Host $output
}

