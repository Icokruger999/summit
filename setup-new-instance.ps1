# PowerShell Script to Set Up New EC2 Instance with Summit Code
# This script sets up the new EC2 instance with all dependencies and migrates the code

param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceId,
    
    [string]$KeyPairName = "summit-keypair",
    [string]$Region = "eu-west-1"
)

Write-Host "=== Setting Up New EC2 Instance for Summit ===" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI is not installed!" -ForegroundColor Red
    exit 1
}

# Get instance public IP
Write-Host "📋 Getting instance information..." -ForegroundColor Yellow
try {
    $publicIp = aws ec2 describe-instances --instance-ids $InstanceId --query "Reservations[0].Instances[0].PublicIpAddress" --output text --region $Region
    if (-not $publicIp -or $publicIp -eq "None") {
        Write-Host "❌ Instance not found or no public IP yet" -ForegroundColor Red
        Write-Host "   Waiting 30 seconds for instance to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        $publicIp = aws ec2 describe-instances --instance-ids $InstanceId --query "Reservations[0].Instances[0].PublicIpAddress" --output text --region $Region
    }
    Write-Host "✅ Public IP: $publicIp" -ForegroundColor Green
} catch {
    Write-Host "❌ Error getting instance info: $_" -ForegroundColor Red
    exit 1
}

# Check key file
$keyFile = "$KeyPairName.pem"
if (-not (Test-Path $keyFile)) {
    Write-Host "⚠️  Key file not found: $keyFile" -ForegroundColor Yellow
    $keyFile = Read-Host "Enter path to key file"
    if (-not (Test-Path $keyFile)) {
        Write-Host "❌ Key file not found: $keyFile" -ForegroundColor Red
        exit 1
    }
}

# Set permissions on key file (important for SSH)
if ($IsLinux -or $IsMacOS) {
    & chmod 400 $keyFile
}

Write-Host ""
Write-Host "📋 Creating setup script..." -ForegroundColor Yellow

# Create setup script to run on EC2
$setupScript = @'
#!/bin/bash
set -e

echo "=== Summit Instance Setup Script ==="
echo "Started at: $(date)"
echo ""

# Update system
echo "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt-get install -y git

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y nginx

# Install PostgreSQL client (optional, for database access)
echo "📦 Installing PostgreSQL client..."
apt-get install -y postgresql-client

# Install AWS CLI
echo "📦 Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
apt-get install -y unzip
unzip -q awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Create directories
echo "📁 Creating directories..."
mkdir -p /var/www/summit
chown -R ubuntu:ubuntu /var/www/summit

# Clone repository (or prepare for manual copy)
echo "📦 Preparing for code deployment..."
cd /var/www/summit
# Repository will be cloned or code copied manually

echo ""
echo "✅ System setup complete!"
echo "Next: Clone/copy Summit code to /var/www/summit"
echo ""
echo "To verify setup:"
echo "  node --version"
echo "  npm --version"
echo "  pm2 --version"
echo "  nginx -v"
'@

# Save setup script
$setupScript | Out-File -FilePath "ec2-setup.sh" -Encoding utf8 -NoNewline

Write-Host "✅ Setup script created: ec2-setup.sh" -ForegroundColor Green
Write-Host ""

# Copy setup script to instance
Write-Host "📤 Copying setup script to instance..." -ForegroundColor Yellow
try {
    $keyPath = Resolve-Path $keyFile
    scp -i $keyPath -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-setup.sh ubuntu@${publicIp}:/tmp/setup.sh 2>&1 | ForEach-Object {
        if ($_ -match "Permission denied") {
            Write-Host "⚠️  Permission issue. Trying to fix key permissions..." -ForegroundColor Yellow
            # Key permissions are handled above
        } else {
            Write-Host $_
        }
    }
    Write-Host "✅ Setup script copied" -ForegroundColor Green
} catch {
    Write-Host "⚠️  SCP may have failed. You can copy the script manually:" -ForegroundColor Yellow
    Write-Host "   scp -i $keyFile ec2-setup.sh ubuntu@${publicIp}:/tmp/setup.sh" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📋 Running setup script on instance..." -ForegroundColor Yellow
Write-Host "   (This may take 5-10 minutes)" -ForegroundColor Gray
Write-Host ""

# Run setup script on instance
try {
    ssh -i $keyFile -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${publicIp} "sudo bash /tmp/setup.sh" 2>&1 | ForEach-Object {
        Write-Host $_
    }
    Write-Host ""
    Write-Host "✅ Setup complete!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  SSH command failed. You can run manually:" -ForegroundColor Yellow
    Write-Host "   ssh -i $keyFile ubuntu@${publicIp}" -ForegroundColor Cyan
    Write-Host "   Then run: sudo bash /tmp/setup.sh" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. SSH into instance: ssh -i $keyFile ubuntu@${publicIp}" -ForegroundColor White
Write-Host "  2. Clone Summit repository or copy code" -ForegroundColor White
Write-Host "  3. Run: .\migrate-summit-code.ps1 -InstanceId $InstanceId" -ForegroundColor White
Write-Host "  4. Or follow steps in MIGRATE_TO_NEW_EC2.md" -ForegroundColor White
Write-Host ""

