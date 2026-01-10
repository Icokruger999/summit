# Deploy Summit to CodingEverest EC2 Instance
# Instance ID: i-06bc5b2218c041802

param(
    [string]$KeyPath = "",
    [string]$EC2IP = ""
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Summit Deployment to CodingEverest EC2" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get EC2 IP if not provided
if ([string]::IsNullOrEmpty($EC2IP)) {
    Write-Host "Getting EC2 instance IP..." -ForegroundColor Yellow
    
    try {
        # Try to get EC2 IP using AWS CLI
        $EC2IP = aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
        Write-Host "Found EC2 IP: $EC2IP" -ForegroundColor Green
    } catch {
        Write-Host "Could not auto-detect EC2 IP. Please provide it manually." -ForegroundColor Red
        $EC2IP = Read-Host "Enter your EC2 public IP address"
    }
}

if ([string]::IsNullOrEmpty($KeyPath)) {
    Write-Host ""
    Write-Host "Please specify your EC2 key file path:" -ForegroundColor Yellow
    $KeyPath = Read-Host "Path to .pem key file"
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  EC2 IP: $EC2IP"
Write-Host "  Key: $KeyPath"
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Deployment cancelled" -ForegroundColor Red
    exit 1
}

# Step 1: Build backend
Write-Host ""
Write-Host "Step 1: Building backend..." -ForegroundColor Cyan
Set-Location server
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build backend" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Step 2: Create deployment package
Write-Host ""
Write-Host "Step 2: Creating deployment package..." -ForegroundColor Cyan
Remove-Item -Path deploy-package -Recurse -Force -ErrorAction SilentlyContinue
New-Item -Path deploy-package -ItemType Directory | Out-Null
Copy-Item -Path server\dist -Destination deploy-package\ -Recurse -Force
Copy-Item -Path server\package.json -Destination deploy-package\ -Force
Copy-Item -Path server\package-lock.json -Destination deploy-package\ -Force

# Create .env file
$envContent = @"
PORT=4000
NODE_ENV=production

DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122

JWT_SECRET=WILL_BE_GENERATED_ON_SERVER

CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com

LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=wss://livekit.codingeverest.com

MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/summit/uploads
"@

$envContent | Out-File -FilePath deploy-package\.env -Encoding UTF8

Write-Host "Deployment package created" -ForegroundColor Green

# Step 3: Upload to EC2
Write-Host ""
Write-Host "Step 3: Uploading to EC2..." -ForegroundColor Cyan
Write-Host ""
Write-Host "===================================================================" -ForegroundColor Yellow
Write-Host "MANUAL STEPS REQUIRED" -ForegroundColor Yellow
Write-Host "===================================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "The files are ready in the 'deploy-package' folder." -ForegroundColor Green
Write-Host ""
Write-Host "Please run these commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Upload files to EC2:" -ForegroundColor White
Write-Host "   scp -i `"$KeyPath`" -r deploy-package/* ubuntu@$EC2IP`:/tmp/summit/" -ForegroundColor Gray
Write-Host ""
Write-Host "2. SSH into EC2:" -ForegroundColor White
Write-Host "   ssh -i `"$KeyPath`" ubuntu@$EC2IP" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Run these commands on EC2:" -ForegroundColor White
Write-Host ""
Write-Host "   # Create directory" -ForegroundColor Gray
Write-Host "   sudo mkdir -p /var/www/summit" -ForegroundColor Gray
Write-Host "   sudo chown `$USER:`$USER /var/www/summit" -ForegroundColor Gray
Write-Host ""
Write-Host "   # Move files" -ForegroundColor Gray
Write-Host "   mv /tmp/summit/* /var/www/summit/" -ForegroundColor Gray
Write-Host "   cd /var/www/summit" -ForegroundColor Gray
Write-Host ""
Write-Host "   # Generate JWT secret" -ForegroundColor Gray
Write-Host "   JWT_SECRET=`$(openssl rand -base64 32)" -ForegroundColor Gray
Write-Host "   sed -i `"s/WILL_BE_GENERATED_ON_SERVER/`$JWT_SECRET/`" .env" -ForegroundColor Gray
Write-Host ""
Write-Host "   # Install and start" -ForegroundColor Gray
Write-Host "   npm install --production" -ForegroundColor Gray
Write-Host "   pm2 start dist/index.js --name summit-backend" -ForegroundColor Gray
Write-Host "   pm2 save" -ForegroundColor Gray
Write-Host ""
Write-Host "   # Verify" -ForegroundColor Gray
Write-Host "   pm2 list" -ForegroundColor Gray
Write-Host "   curl http://localhost:4000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "===================================================================" -ForegroundColor Yellow
Write-Host ""

$openSSH = Read-Host "Would you like to open SSH now? (y/n)"
if ($openSSH -eq 'y' -or $openSSH -eq 'Y') {
    Write-Host ""
    Write-Host "Opening SSH connection..." -ForegroundColor Green
    Write-Host "After connecting, run the commands shown above." -ForegroundColor Yellow
    Write-Host ""
    Start-Sleep -Seconds 2
    ssh -i "$KeyPath" ubuntu@$EC2IP
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Complete EC2 setup (commands above)" -ForegroundColor White
Write-Host "2. Configure Nginx (see DEPLOY_TO_YOUR_EC2.md)" -ForegroundColor White
Write-Host "3. Set up Route 53 DNS" -ForegroundColor White
Write-Host "4. Deploy frontend to Amplify" -ForegroundColor White
Write-Host "5. Update landing page button" -ForegroundColor White
Write-Host ""

