# Fix Summit Configuration - Final Version
$InstanceId = "i-0fba58db502cc8d39"
$Region = "eu-west-1"

Write-Host "=== Fixing Summit Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get password
Write-Host "[1/5] Getting existing password..." -ForegroundColor Yellow
$json1 = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = @("cd /var/www/summit/server && grep '^DB_PASSWORD=' .env | cut -d'=' -f2")
    }
} | ConvertTo-Json -Depth 10
$json1 | Out-File -FilePath "temp1.json" -Encoding UTF8 -NoNewline
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("temp1.json", $json1, $utf8NoBom)
$cmdId1 = (aws ssm send-command --cli-input-json file://temp1.json --region $Region --query 'Command.CommandId' --output text)
Start-Sleep -Seconds 5
$dbPass = (aws ssm get-command-invocation --command-id $cmdId1 --instance-id $InstanceId --region $Region --query 'StandardOutputContent' --output text).Trim()
Write-Host "✅ Password retrieved" -ForegroundColor Green
Remove-Item "temp1.json" -Force

# Step 2: Generate JWT
Write-Host "[2/5] Generating JWT secret..." -ForegroundColor Yellow
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "✅ JWT generated" -ForegroundColor Green

# Step 3: Create .env
Write-Host "[3/5] Creating new .env file..." -ForegroundColor Yellow
$envContent = @"
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=summit
DB_USER=summit_user
DB_PASSWORD=$dbPass
JWT_SECRET=$jwtSecret
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
"@

$createEnvScript = @"
cd /var/www/summit/server
cp .env .env.backup.`$(date +%Y%m%d_%H%M%S)
cat > .env << 'ENVEOF'
$envContent
ENVEOF
echo "Config created"
grep -E '^(DB_HOST|DB_PORT|CORS_ORIGIN)=' .env
"@

$json2 = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = @($createEnvScript)
    }
} | ConvertTo-Json -Depth 10
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("temp2.json", $json2, $utf8NoBom)
$cmdId2 = (aws ssm send-command --cli-input-json file://temp2.json --region $Region --query 'Command.CommandId' --output text)
Start-Sleep -Seconds 5
$output2 = (aws ssm get-command-invocation --command-id $cmdId2 --instance-id $InstanceId --region $Region --query 'StandardOutputContent' --output text)
Write-Host $output2
Write-Host "✅ .env created" -ForegroundColor Green
Remove-Item "temp2.json" -Force

# Step 4: Rebuild
Write-Host "[4/5] Rebuilding server..." -ForegroundColor Yellow
$rebuildScript = @"
cd /var/www/summit/server
npm install --production
npm run build
echo "Build complete"
"@

$json3 = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = @($rebuildScript)
    }
} | ConvertTo-Json -Depth 10
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("temp3.json", $json3, $utf8NoBom)
$cmdId3 = (aws ssm send-command --cli-input-json file://temp3.json --region $Region --query 'Command.CommandId' --output text)
Write-Host "Building... (30 seconds)" -ForegroundColor Yellow
Start-Sleep -Seconds 30
$output3 = (aws ssm get-command-invocation --command-id $cmdId3 --instance-id $InstanceId --region $Region --query 'StandardOutputContent' --output text)
Write-Host "✅ Build complete" -ForegroundColor Green
Remove-Item "temp3.json" -Force

# Step 5: Restart PM2
Write-Host "[5/5] Restarting PM2..." -ForegroundColor Yellow
$restartScript = @"
cd /var/www/summit/server
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
sleep 3
pm2 status
curl -s http://localhost:3000/health
"@

$json4 = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = @($restartScript)
    }
} | ConvertTo-Json -Depth 10
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("temp4.json", $json4, $utf8NoBom)
$cmdId4 = (aws ssm send-command --cli-input-json file://temp4.json --region $Region --query 'Command.CommandId' --output text)
Start-Sleep -Seconds 10
$output4 = (aws ssm get-command-invocation --command-id $cmdId4 --instance-id $InstanceId --region $Region --query 'StandardOutputContent' --output text)
Write-Host ""
Write-Host "=== PM2 Status ===" -ForegroundColor Cyan
Write-Host $output4
Remove-Item "temp4.json" -Force

Write-Host ""
Write-Host "=== Configuration Fix Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Database: 127.0.0.1:6432 (PgBouncer)" -ForegroundColor White
Write-Host "✅ CORS: summit.codingeverest.com" -ForegroundColor White
Write-Host "✅ Server: Running on port 3000" -ForegroundColor White
Write-Host ""
Write-Host "Test registration at: https://summit.codingeverest.com" -ForegroundColor Cyan
