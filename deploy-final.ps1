# Deploy Summit Backend to codingeverest via SSM
$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$publicIp = "34.246.3.141"
$port = 3001
$bucket = "codingeverest-deployments"

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "  Summit Backend Deployment via SSM" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "Instance: codingeverest" -ForegroundColor Yellow
Write-Host "Region: $region" -ForegroundColor Yellow
Write-Host "IP: $publicIp" -ForegroundColor Yellow
Write-Host "Port: $port" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Package server
Write-Host "[1/5] Packaging server..." -ForegroundColor Green
if (Test-Path "summit-deploy.zip") { Remove-Item "summit-deploy.zip" -Force }
Compress-Archive -Path ".\server\*" -DestinationPath "summit-deploy.zip" -Force
Write-Host "  Created: summit-deploy.zip" -ForegroundColor Gray
Write-Host ""

# Create deploy script
Write-Host "[2/5] Creating deployment script..." -ForegroundColor Green
$deployScript = @'
#!/bin/bash
set -e
echo "=== Summit Backend Deployment ==="
sudo mkdir -p /opt/summit-backend
sudo chown ubuntu:ubuntu /opt/summit-backend 2>/dev/null || sudo chown ec2-user:ec2-user /opt/summit-backend
cd /opt/summit-backend
echo "Downloading package..."
aws s3 cp s3://BUCKET_NAME/summit/SERVER_FILE server.zip --region REGION_NAME
echo "Extracting..."
unzip -o server.zip && rm server.zip
echo "Installing dependencies..."
npm install --production
echo "Building..."
npm run build
echo "Creating .env..."
cat > .env << 'ENVEOF'
PORT=PORT_NUMBER
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=summit-secret-production
ENVEOF
echo "Installing PM2..."
if ! command -v pm2 &> /dev/null; then sudo npm install -g pm2; fi
echo "Starting backend on port PORT_NUMBER..."
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
pm2 start dist/index.js --name summit-backend
pm2 save && pm2 startup
echo ""
echo "=== Deployment Complete ==="
pm2 status
'@

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$serverFile = "server-$timestamp.zip"
$deployScript = $deployScript -replace "BUCKET_NAME", $bucket
$deployScript = $deployScript -replace "SERVER_FILE", $serverFile
$deployScript = $deployScript -replace "REGION_NAME", $region
$deployScript = $deployScript -replace "PORT_NUMBER", $port

$deployScript | Out-File -FilePath "deploy-script.sh" -Encoding ASCII
Write-Host "  Created: deploy-script.sh" -ForegroundColor Gray
Write-Host ""

# Upload to S3
Write-Host "[3/5] Uploading to S3..." -ForegroundColor Green
python -m awscli s3 mb "s3://$bucket" --region $region 2>$null
python -m awscli s3 cp "summit-deploy.zip" "s3://$bucket/summit/$serverFile" --region $region | Out-Null
python -m awscli s3 cp "deploy-script.sh" "s3://$bucket/summit/deploy-script.sh" --region $region | Out-Null
Write-Host "  Uploaded to s3://$bucket/summit/" -ForegroundColor Gray
Write-Host ""

# Deploy via SSM
Write-Host "[4/5] Deploying via SSM (2-3 minutes)..." -ForegroundColor Green

$command = "cd /tmp && aws s3 cp s3://$bucket/summit/deploy-script.sh deploy.sh --region $region && chmod +x deploy.sh && ./deploy.sh"

$commandId = (python -m awscli ssm send-command `
    --region $region `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters commands="$command" `
    --output text `
    --query "Command.CommandId")

if ($LASTEXITCODE -ne 0 -or -not $commandId) {
    Write-Host "  ERROR: Could not send SSM command" -ForegroundColor Red
    Write-Host "  Please check SSM permissions" -ForegroundColor Yellow
    exit 1
}

Write-Host "  Command ID: $commandId" -ForegroundColor Gray
Write-Host "  Waiting" -NoNewline -ForegroundColor Gray

# Wait
$maxWait = 180
$waited = 0
$status = "InProgress"

while ($status -eq "InProgress" -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    Write-Host "." -NoNewline -ForegroundColor Gray
    
    $status = python -m awscli ssm get-command-invocation `
        --region $region `
        --command-id $commandId `
        --instance-id $instanceId `
        --query "Status" `
        --output text 2>$null
}

Write-Host ""
Write-Host ""

# Get results
if ($status -eq "Success") {
    Write-Host "  Deployment successful!" -ForegroundColor Green
    
    $output = python -m awscli ssm get-command-invocation `
        --region $region `
        --command-id $commandId `
        --instance-id $instanceId `
        --query "StandardOutputContent" `
        --output text
    
    Write-Host ""
    Write-Host "--- Output ---" -ForegroundColor Cyan
    Write-Host $output
} else {
    Write-Host "  Status: $status" -ForegroundColor Yellow
}

Write-Host ""

# Security Group
Write-Host "[5/5] Opening port $port..." -ForegroundColor Green
$sgId = python -m awscli ec2 describe-instances `
    --region $region `
    --instance-ids $instanceId `
    --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" `
    --output text

python -m awscli ec2 authorize-security-group-ingress `
    --region $region `
    --group-id $sgId `
    --protocol tcp `
    --port $port `
    --cidr "0.0.0.0/0" 2>&1 | Out-Null

Write-Host "  Port $port opened" -ForegroundColor Gray

# Cleanup
Remove-Item "summit-deploy.zip","deploy-script.sh" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: http://${publicIp}:${port}" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test:" -ForegroundColor White
Write-Host "  curl http://${publicIp}:${port}/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Desktop .env:" -ForegroundColor White
Write-Host "  VITE_SERVER_URL=http://${publicIp}:${port}" -ForegroundColor Gray
Write-Host ""
Write-Host "Isolation:" -ForegroundColor White
Write-Host "  Directory: /opt/summit-backend" -ForegroundColor Gray
Write-Host "  Port: $port (isolated from 5000, 50001)" -ForegroundColor Gray
Write-Host "  Process: summit-backend (PM2)" -ForegroundColor Gray
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan

