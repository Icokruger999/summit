# Simple SSM Deployment for Summit Backend
param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceId,
    
    [int]$Port = 3001
)

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  Summit Backend Deployment via SSM" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "Instance: $InstanceId" -ForegroundColor Yellow
Write-Host "Port: $Port (isolated from your ports 5000, 50001)" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get instance info
Write-Host "[1/5] Verifying EC2 instance..." -ForegroundColor Green
$instanceInfo = aws ec2 describe-instances --instance-ids $InstanceId --output json | ConvertFrom-Json
$publicIp = $instanceInfo.Reservations[0].Instances[0].PublicIpAddress
Write-Host "Public IP: $publicIp" -ForegroundColor Gray
Write-Host ""

# Step 2: Package server
Write-Host "[2/5] Packaging server code..." -ForegroundColor Green
if (Test-Path "deploy-package.zip") { Remove-Item "deploy-package.zip" -Force }
Compress-Archive -Path ".\server\*" -DestinationPath "deploy-package.zip" -Force
Write-Host "Package created: deploy-package.zip" -ForegroundColor Gray
Write-Host ""

# Step 3: Upload to S3
Write-Host "[3/5] Uploading to S3..." -ForegroundColor Green
$bucketName = "codingeverest-deployments"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$s3Key = "summit/$timestamp/server.zip"

# Create bucket if doesn't exist
aws s3 mb "s3://$bucketName" 2>$null

aws s3 cp "deploy-package.zip" "s3://$bucketName/$s3Key"
Write-Host "Uploaded to: s3://$bucketName/$s3Key" -ForegroundColor Gray
Write-Host ""

# Step 4: Deploy via SSM
Write-Host "[4/5] Deploying to EC2 via SSM (no SSH!)..." -ForegroundColor Green
Write-Host "This may take 2-3 minutes..." -ForegroundColor Gray

$deployScript = @"
#!/bin/bash
set -e
echo "Starting Summit deployment..."

# Setup directory
sudo mkdir -p /opt/summit-backend
sudo chown ubuntu:ubuntu /opt/summit-backend
cd /opt/summit-backend

# Download from S3
echo "Downloading package..."
aws s3 cp s3://$bucketName/$s3Key server.zip

# Extract
echo "Extracting..."
unzip -o server.zip
rm server.zip

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Build
echo "Building..."
npm run build

# Create .env
echo "Creating .env..."
cat > .env << 'ENVEOF'
PORT=$Port
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=summit-secret-\$(openssl rand -hex 32)
ENVEOF

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Stop if running
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true

# Start
echo "Starting backend on port $Port..."
pm2 start dist/index.js --name summit-backend
pm2 save

echo ""
echo "=== Deployment Complete ==="
echo "Backend running on port $Port"
pm2 status
"@

# Send command via SSM
$commandId = (aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=['$($deployScript -replace "'","'\\''")']" `
    --output text `
    --query "Command.CommandId")

Write-Host "Command ID: $commandId" -ForegroundColor Gray

# Wait for completion
Write-Host "Waiting for deployment" -NoNewline -ForegroundColor Gray
$maxWait = 180
$waited = 0
$status = "InProgress"

while ($status -eq "InProgress" -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    Write-Host "." -NoNewline -ForegroundColor Gray
    
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "Status" `
        --output text 2>$null
}

Write-Host ""

if ($status -eq "Success") {
    Write-Host "Deployment successful!" -ForegroundColor Green
    
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "StandardOutputContent" `
        --output text
    
    Write-Host ""
    Write-Host "--- Deployment Output ---" -ForegroundColor Cyan
    Write-Host $output -ForegroundColor Gray
} else {
    Write-Host "Deployment may have issues. Status: $status" -ForegroundColor Yellow
    
    $errorOutput = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "StandardErrorContent" `
        --output text
    
    if ($errorOutput) {
        Write-Host ""
        Write-Host "Errors:" -ForegroundColor Red
        Write-Host $errorOutput -ForegroundColor Gray
    }
}

Write-Host ""

# Step 5: Update Security Group
Write-Host "[5/5] Updating security group for port $Port..." -ForegroundColor Green

$sgId = aws ec2 describe-instances `
    --instance-ids $InstanceId `
    --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" `
    --output text

Write-Host "Security Group: $sgId" -ForegroundColor Gray

$addRule = aws ec2 authorize-security-group-ingress `
    --group-id $sgId `
    --protocol tcp `
    --port $Port `
    --cidr "0.0.0.0/0" `
    --description "Summit Backend API" 2>&1

if ($addRule -match "already exists") {
    Write-Host "Port $Port already open" -ForegroundColor Gray
} else {
    Write-Host "Port $Port opened" -ForegroundColor Gray
}

Write-Host ""

# Cleanup
Remove-Item "deploy-package.zip" -Force -ErrorAction SilentlyContinue

# Final summary
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: http://${publicIp}:$Port" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test it:" -ForegroundColor White
Write-Host "  curl http://${publicIp}:$Port/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Update desktop/.env with:" -ForegroundColor White
Write-Host "  VITE_SERVER_URL=http://${publicIp}:$Port" -ForegroundColor Gray
Write-Host ""
Write-Host "Isolation:" -ForegroundColor White
Write-Host "  Directory: /opt/summit-backend" -ForegroundColor Gray
Write-Host "  Port: $Port (no conflict)" -ForegroundColor Gray
Write-Host "  Process: summit-backend (PM2)" -ForegroundColor Gray
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

