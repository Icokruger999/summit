# Deploy Summit Backend to codingeverest instance
$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$publicIp = "34.246.3.141"
$port = 3001

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "  Deploying Summit Backend via SSM" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "Instance: codingeverest ($instanceId)" -ForegroundColor Yellow
Write-Host "Region: $region" -ForegroundColor Yellow
Write-Host "IP: $publicIp" -ForegroundColor Yellow
Write-Host "Port: $port (isolated from 5000, 50001)" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Package server
Write-Host "[1/4] Packaging server code..." -ForegroundColor Green
if (Test-Path "summit-deploy.zip") { Remove-Item "summit-deploy.zip" -Force }
Compress-Archive -Path ".\server\*" -DestinationPath "summit-deploy.zip" -Force
Write-Host "  Package created: summit-deploy.zip" -ForegroundColor Gray
Write-Host ""

# Upload to S3
Write-Host "[2/4] Uploading to S3..." -ForegroundColor Green
$bucket = "codingeverest-deployments"
$s3Key = "summit/server-$(Get-Date -Format 'yyyyMMddHHmmss').zip"

python -m awscli s3 mb "s3://$bucket" --region $region 2>$null
python -m awscli s3 cp "summit-deploy.zip" "s3://$bucket/$s3Key" --region $region

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Uploaded to s3://$bucket/$s3Key" -ForegroundColor Gray
} else {
    Write-Host "  Upload failed, but continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Create deployment script
$deployScript = @"
#!/bin/bash
set -e
echo '=== Summit Backend Deployment ==='
echo 'Setting up directory...'
sudo mkdir -p /opt/summit-backend
sudo chown ubuntu:ubuntu /opt/summit-backend || sudo chown ec2-user:ec2-user /opt/summit-backend
cd /opt/summit-backend

echo 'Downloading package...'
aws s3 cp s3://$bucket/$s3Key server.zip --region $region || exit 1

echo 'Extracting...'
unzip -o server.zip
rm server.zip

echo 'Installing dependencies...'
npm install --production

echo 'Building...'
npm run build

echo 'Creating .env...'
cat > .env <<ENVEOF
PORT=$port
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=summit-secret-production-$(openssl rand -hex 16 2>/dev/null || echo "change-this-secret")
ENVEOF

echo 'Installing PM2...'
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

echo 'Starting backend on port $port...'
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
pm2 start dist/index.js --name summit-backend
pm2 save
pm2 startup

echo ''
echo '=== Deployment Complete ==='
echo 'Backend running on port $port'
pm2 status
"@

# Send command via SSM
Write-Host "[3/4] Deploying via SSM (this may take 2-3 minutes)..." -ForegroundColor Green
Write-Host "  Sending command to instance" -ForegroundColor Gray

$commandId = (python -m awscli ssm send-command `
    --region $region `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=['$($deployScript -replace "'","'\''")']" `
    --output text `
    --query "Command.CommandId")

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Could not send SSM command" -ForegroundColor Red
    Write-Host "  Please check SSM permissions and that SSM agent is running" -ForegroundColor Yellow
    exit 1
}

Write-Host "  Command ID: $commandId" -ForegroundColor Gray
Write-Host "  Waiting for completion" -NoNewline -ForegroundColor Gray

# Wait for completion
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
    Write-Host "--- Deployment Output ---" -ForegroundColor Cyan
    Write-Host $output -ForegroundColor Gray
} else {
    Write-Host "  Deployment status: $status" -ForegroundColor Yellow
    
    $errorOutput = python -m awscli ssm get-command-invocation `
        --region $region `
        --command-id $commandId `
        --instance-id $instanceId `
        --query "StandardErrorContent" `
        --output text 2>$null
    
    if ($errorOutput) {
        Write-Host ""
        Write-Host "Errors:" -ForegroundColor Red
        Write-Host $errorOutput -ForegroundColor Gray
    }
}

Write-Host ""

# Update Security Group
Write-Host "[4/4] Updating security group for port $port..." -ForegroundColor Green

$sgId = python -m awscli ec2 describe-instances `
    --region $region `
    --instance-ids $instanceId `
    --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" `
    --output text

Write-Host "  Security Group: $sgId" -ForegroundColor Gray

python -m awscli ec2 authorize-security-group-ingress `
    --region $region `
    --group-id $sgId `
    --protocol tcp `
    --port $port `
    --cidr "0.0.0.0/0" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Port $port opened" -ForegroundColor Gray
} else {
    Write-Host "  Port may already be open" -ForegroundColor Gray
}

# Cleanup
Remove-Item "summit-deploy.zip" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: http://${publicIp}:${port}" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test it:" -ForegroundColor White
Write-Host "  curl http://${publicIp}:${port}/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Configure desktop app (desktop/.env):" -ForegroundColor White
Write-Host "  VITE_SERVER_URL=http://${publicIp}:${port}" -ForegroundColor Gray
Write-Host ""
Write-Host "Isolation:" -ForegroundColor White
Write-Host "  Directory: /opt/summit-backend" -ForegroundColor Gray
Write-Host "  Port: $port (no conflict with 5000, 50001)" -ForegroundColor Gray
Write-Host "  Process: summit-backend (PM2)" -ForegroundColor Gray
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

