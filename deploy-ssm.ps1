# Deploy Summit Backend to EC2 using AWS SSM
# This script deploys without SSH and uses port 3001 to avoid conflicts

param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceId,
    
    [Parameter(Mandatory=$false)]
    [string]$Port = "3001",
    
    [Parameter(Mandatory=$false)]
    [string]$DeployPath = "/opt/summit-backend"
)

Write-Host "=== Summit Backend SSM Deployment ===" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host "Port: $Port" -ForegroundColor Yellow
Write-Host "Deploy Path: $DeployPath" -ForegroundColor Yellow
Write-Host ""

# Check AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "Error: AWS CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Step 1: Package the server code
Write-Host "[1/5] Packaging server code..." -ForegroundColor Green
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "summit-backend-$timestamp.zip"

if (Test-Path "server-package.zip") {
    Remove-Item "server-package.zip" -Force
}

# Create zip of server directory (excluding node_modules and build artifacts)
Compress-Archive -Path ".\server\*" -DestinationPath "server-package.zip" -Force -CompressionLevel Optimal
Write-Host "   Package created: server-package.zip" -ForegroundColor Gray

# Step 2: Upload to S3 (temporary storage)
Write-Host "[2/5] Uploading package to S3..." -ForegroundColor Green
$bucketName = "codingeverest-deployments" # Change this to your S3 bucket
$s3Key = "summit-backend/$packageName"

Write-Host "   Uploading to s3://$bucketName/$s3Key" -ForegroundColor Gray
aws s3 cp "server-package.zip" "s3://$bucketName/$s3Key"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to upload to S3. Make sure bucket exists and you have permissions." -ForegroundColor Red
    Write-Host "Creating bucket..." -ForegroundColor Yellow
    aws s3 mb "s3://$bucketName" 2>$null
    aws s3 cp "server-package.zip" "s3://$bucketName/$s3Key"
}

# Step 3: Create deployment script
Write-Host "[3/5] Creating deployment script..." -ForegroundColor Green
$deployScript = @"
#!/bin/bash
set -e

echo "=== Summit Backend Deployment ==="
echo "Deploying to: $DeployPath"
echo "Port: $Port"

# Create deployment directory
sudo mkdir -p $DeployPath
sudo chown ubuntu:ubuntu $DeployPath
cd $DeployPath

# Download package from S3
echo "Downloading package..."
aws s3 cp s3://$bucketName/$s3Key server-package.zip

# Extract
echo "Extracting package..."
unzip -o server-package.zip
rm server-package.zip

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Build TypeScript
echo "Building application..."
npm run build

# Create .env file
echo "Creating environment file..."
cat > .env << 'EOF'
PORT=$Port
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=summit-jwt-secret-$(openssl rand -hex 32)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=ws://localhost:7880
EOF

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Stop existing instance if running
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true

# Start with PM2
echo "Starting backend on port $Port..."
pm2 start dist/index.js --name summit-backend --time

# Save PM2 configuration
pm2 save

# Setup PM2 startup
sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "=== Deployment Complete ==="
echo "Backend running on port $Port"
echo ""
echo "Check status: pm2 status"
echo "Check logs: pm2 logs summit-backend"
echo "Test endpoint: curl http://localhost:$Port/health"
"@

$deployScript | Out-File -FilePath "deploy-script.sh" -Encoding UTF8

# Step 4: Execute deployment via SSM
Write-Host "[4/5] Executing deployment on EC2 via SSM..." -ForegroundColor Green
Write-Host "   This may take a few minutes..." -ForegroundColor Gray

# Upload script to S3
aws s3 cp "deploy-script.sh" "s3://$bucketName/summit-backend/deploy-script.sh"

# Execute via SSM
$ssmCommand = @"
cd /tmp
aws s3 cp s3://$bucketName/summit-backend/deploy-script.sh deploy-script.sh
chmod +x deploy-script.sh
./deploy-script.sh 2>&1 | tee deployment.log
cat deployment.log
"@

Write-Host "   Sending command to instance..." -ForegroundColor Gray
$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$($ssmCommand -replace '"','\"')]" `
    --output text `
    --query "Command.CommandId"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to send SSM command. Check instance ID and SSM permissions." -ForegroundColor Red
    exit 1
}

Write-Host "   Command ID: $commandId" -ForegroundColor Gray
Write-Host "   Waiting for execution..." -ForegroundColor Gray

# Wait for command to complete
Start-Sleep -Seconds 5

$maxAttempts = 60
$attempt = 0
$status = "InProgress"

while ($status -eq "InProgress" -and $attempt -lt $maxAttempts) {
    $attempt++
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "Status" `
        --output text 2>$null
    
    if ($status -eq "InProgress") {
        Write-Host "   ." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

Write-Host ""

# Get command output
if ($status -eq "Success") {
    Write-Host "[5/5] Deployment successful!" -ForegroundColor Green
    Write-Host ""
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "StandardOutputContent" `
        --output text
    
    Write-Host "=== Deployment Output ===" -ForegroundColor Cyan
    Write-Host $output
    
    # Get EC2 public IP
    $publicIp = aws ec2 describe-instances `
        --instance-ids $InstanceId `
        --query "Reservations[0].Instances[0].PublicIpAddress" `
        --output text
    
    Write-Host ""
    Write-Host "=== Next Steps ===" -ForegroundColor Cyan
    Write-Host "1. Update EC2 Security Group to allow port $Port from your IP" -ForegroundColor Yellow
    Write-Host "2. Test backend: curl http://${publicIp}:$Port/health" -ForegroundColor Yellow
    Write-Host "3. Update desktop/.env with:" -ForegroundColor Yellow
    Write-Host "   VITE_SERVER_URL=http://${publicIp}:$Port" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Route 53 Setup:" -ForegroundColor Yellow
    Write-Host "   If using Route 53, point your domain to: $publicIp" -ForegroundColor Gray
    Write-Host ""
    
} else {
    Write-Host "[5/5] Deployment failed!" -ForegroundColor Red
    $errorOutput = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "StandardErrorContent" `
        --output text
    
    Write-Host "Error output:" -ForegroundColor Red
    Write-Host $errorOutput
}

# Cleanup
Remove-Item "server-package.zip" -Force -ErrorAction SilentlyContinue
Remove-Item "deploy-script.sh" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green

