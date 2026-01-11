# Start Summit Server via SSM with Summit Database Configuration

$InstanceId = "i-0fba58db502cc8d39"
$Region = "eu-west-1"
$DeployPath = "/var/www/summit"

Write-Host "Starting Summit Server via SSM..." -ForegroundColor Cyan
Write-Host "Instance: $InstanceId" -ForegroundColor Yellow
Write-Host ""

# Create .env file
Write-Host "[1/4] Creating .env file..." -ForegroundColor Green
$createEnv = @"
cd $DeployPath/server
cat > .env << 'ENVEOF'
PORT=4000
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

CORS_ORIGIN=http://localhost:5173,https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com

LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
ENVEOF
echo "✅ .env file created"
"@

try {
    $result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$createEnv]" --region $Region --output json | ConvertFrom-Json
    $cmdId = $result.Command.CommandId
    Write-Host "Command ID: $cmdId" -ForegroundColor Cyan
    Start-Sleep -Seconds 8
} catch {
    Write-Host "Note: Command sent (checking status separately)" -ForegroundColor Yellow
}

# Start with PM2
Write-Host "[2/4] Starting server with PM2..." -ForegroundColor Green
$startServer = "cd $DeployPath/server && pm2 stop summit 2>/dev/null || true && pm2 delete summit 2>/dev/null || true && pm2 start dist/index.js --name summit --update-env && pm2 save && sleep 3 && pm2 list"

try {
    $result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$startServer]" --region $Region --output json | ConvertFrom-Json
    $cmdId = $result.Command.CommandId
    Write-Host "Command ID: $cmdId" -ForegroundColor Cyan
    Start-Sleep -Seconds 10
} catch {
    Write-Host "Note: Command sent" -ForegroundColor Yellow
}

# Verify
Write-Host "[3/4] Verifying server..." -ForegroundColor Green
$verify = "sleep 5 && pm2 list | grep summit && curl -s http://localhost:4000/health && curl -s http://localhost:4000/api/summit/status"

try {
    $result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[$verify]" --region $Region --output json | ConvertFrom-Json
    $cmdId = $result.Command.CommandId
    Write-Host "Command ID: $cmdId" -ForegroundColor Cyan
    Start-Sleep -Seconds 8
    
    $output = aws ssm get-command-invocation --command-id $cmdId --instance-id $InstanceId --query 'StandardOutputContent' --output text 2>$null
    Write-Host ""
    Write-Host "Output:" -ForegroundColor Cyan
    Write-Host $output
} catch {
    Write-Host "Could not get output immediately. Check AWS Console for command status." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/4] Test endpoints:" -ForegroundColor Green
Write-Host "  http://52.48.245.252:4000/health" -ForegroundColor White
Write-Host "  http://52.48.245.252:4000/api/summit/status" -ForegroundColor White
Write-Host "  http://summit-api.codingeverest.com/health" -ForegroundColor White
Write-Host ""

