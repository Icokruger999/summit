# PowerShell Script to Migrate Summit Code to New EC2 Instance
# This script copies code from current setup or clones from GitHub

param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceId,
    
    [string]$KeyPairName = "summit-keypair",
    [string]$GitHubRepo = "https://github.com/Icokruger999/summit.git",
    [string]$Branch = "main",
    [string]$Region = "eu-west-1"
)

Write-Host "=== Migrating Summit Code to New EC2 Instance ===" -ForegroundColor Cyan
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

Write-Host ""
Write-Host "📋 Creating migration script..." -ForegroundColor Yellow

# Create migration script
$migrateScript = @"
#!/bin/bash
set -e

echo "=== Summit Code Migration Script ==="
echo "Started at: \$(date)"
echo ""

cd /var/www/summit

# Clone repository
echo "📦 Cloning Summit repository..."
if [ -d ".git" ]; then
    echo "   Repository already exists, pulling latest..."
    git pull origin $Branch
else
    echo "   Cloning from GitHub..."
    git clone -b $Branch $GitHubRepo .
fi

echo ""
echo "📦 Installing backend dependencies..."
cd server
npm install

echo ""
echo "📦 Building backend..."
npm run build

echo ""
echo "📦 Installing frontend dependencies..."
cd ../desktop
npm install --legacy-peer-deps

echo ""
echo "📦 Building frontend..."
export VITE_SERVER_URL=https://summit-api.codingeverest.com
npm run build

echo ""
echo "✅ Code migration complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env file to server/.env"
echo "  2. Configure Nginx"
echo "  3. Start backend with PM2"
echo "  4. Test the application"
"@

# Save migration script
$migrateScript | Out-File -FilePath "ec2-migrate.sh" -Encoding utf8 -NoNewline

Write-Host "✅ Migration script created: ec2-migrate.sh" -ForegroundColor Green
Write-Host ""

# Copy migration script to instance
Write-Host "📤 Copying migration script to instance..." -ForegroundColor Yellow
$keyPath = Resolve-Path $keyFile
scp -i $keyPath -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-migrate.sh ubuntu@${publicIp}:/tmp/migrate.sh 2>&1 | Out-Null

Write-Host "📋 Running migration script on instance..." -ForegroundColor Yellow
Write-Host "   (This may take 10-15 minutes)" -ForegroundColor Gray
Write-Host ""

# Run migration script
ssh -i $keyFile -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${publicIp} "cd /var/www/summit && sudo -u ubuntu bash /tmp/migrate.sh" 2>&1 | ForEach-Object {
    Write-Host $_
}

Write-Host ""
Write-Host "=== Migration Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Copy .env file from old instance or create new one" -ForegroundColor White
Write-Host "  2. Configure Nginx (see MIGRATE_TO_NEW_EC2.md)" -ForegroundColor White
Write-Host "  3. Start backend: cd /var/www/summit/server && pm2 start dist/index.js --name summit" -ForegroundColor White
Write-Host "  4. Test the application" -ForegroundColor White
Write-Host ""

