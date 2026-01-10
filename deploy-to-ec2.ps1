# One-Command Deployment Script for Summit Backend
# Deploys to EC2 via SSM without affecting other applications

param(
    [Parameter(Mandatory=$true, HelpMessage="EC2 Instance ID (e.g., i-1234567890abcdef0)")]
    [string]$InstanceId,
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 3001,
    
    [Parameter(Mandatory=$false)]
    [string]$S3Bucket = "codingeverest-deployments",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDatabase,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSecurityGroup
)

$ErrorActionPreference = "Stop"

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          Summit Backend Deployment via SSM                ║
║                                                           ║
║  Instance: $InstanceId                                    
║  Port: $Port (won't conflict with 5000, 50001)            
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Verify AWS CLI
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI installed: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Verify instance exists and SSM is available
Write-Host "Verifying EC2 instance..." -ForegroundColor Yellow
try {
    $instanceInfo = aws ec2 describe-instances --instance-ids $InstanceId --output json 2>&1 | ConvertFrom-Json
    $instanceState = $instanceInfo.Reservations[0].Instances[0].State.Name
    $publicIp = $instanceInfo.Reservations[0].Instances[0].PublicIpAddress
    
    if ($instanceState -ne "running") {
        Write-Host "✗ Instance is not running (state: $instanceState)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Instance is running" -ForegroundColor Green
    Write-Host "  Public IP: $publicIp" -ForegroundColor Gray
} catch {
    Write-Host "✗ Could not find instance $InstanceId" -ForegroundColor Red
    Write-Host "  Make sure you have permissions and the instance ID is correct" -ForegroundColor Gray
    exit 1
}

# Check SSM connectivity
Write-Host "Checking SSM connectivity..." -ForegroundColor Yellow
try {
    $ssmStatus = aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$InstanceId" --output json 2>&1 | ConvertFrom-Json
    if ($ssmStatus.InstanceInformationList.Count -eq 0) {
        Write-Host "✗ Instance not available via SSM" -ForegroundColor Red
        Write-Host "  Make sure SSM agent is running and IAM role has AmazonSSMManagedInstanceCore policy" -ForegroundColor Gray
        exit 1
    }
    Write-Host "✓ SSM is available" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not verify SSM status, continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""

# Step 1: Setup Database (optional)
if (-not $SkipDatabase) {
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "STEP 1: Setup Database Tables" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    & .\setup-database.ps1 -InstanceId $InstanceId
    
    Write-Host ""
    Write-Host "✓ Database setup complete" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping database setup (--SkipDatabase flag set)" -ForegroundColor Yellow
}

# Step 2: Deploy Backend
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 2: Deploy Backend Application" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

& .\deploy-ssm.ps1 -InstanceId $InstanceId -Port $Port

Write-Host ""
Write-Host "✓ Backend deployment complete" -ForegroundColor Green
Write-Host ""

# Step 3: Update Security Group (optional)
if (-not $SkipSecurityGroup) {
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "STEP 3: Update Security Group" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        $sgId = aws ec2 describe-instances `
            --instance-ids $InstanceId `
            --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" `
            --output text
        
        Write-Host "Security Group ID: $sgId" -ForegroundColor Gray
        Write-Host "Adding inbound rule for port $Port..." -ForegroundColor Yellow
        
        # Try to add the rule (will fail if already exists)
        aws ec2 authorize-security-group-ingress `
            --group-id $sgId `
            --protocol tcp `
            --port $Port `
            --cidr "0.0.0.0/0" `
            --description "Summit Backend API" 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Security group rule added" -ForegroundColor Green
        } else {
            Write-Host "⚠ Rule may already exist, continuing..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠ Could not update security group automatically" -ForegroundColor Yellow
        Write-Host "  Please add inbound rule manually for port $Port" -ForegroundColor Gray
    }
    
    Write-Host ""
} else {
    Write-Host "Skipping security group update (--SkipSecurityGroup flag set)" -ForegroundColor Yellow
    Write-Host "  Remember to manually allow port $Port in your security group!" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Test Backend
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "STEP 4: Test Backend" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://${publicIp}:$Port/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is responding!" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠ Could not reach backend yet" -ForegroundColor Yellow
    Write-Host "  This may take a minute. Try manually: curl http://${publicIp}:$Port/health" -ForegroundColor Gray
}

Write-Host ""

# Final Summary
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Backend URL: " -NoNewline -ForegroundColor Yellow
Write-Host "http://${publicIp}:$Port" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update desktop/.env file:" -ForegroundColor White
Write-Host "   VITE_SERVER_URL=http://${publicIp}:$Port" -ForegroundColor Gray
Write-Host ""
Write-Host "2. (Optional) Setup Route 53 domain:" -ForegroundColor White
Write-Host "   Point A record to: $publicIp" -ForegroundColor Gray
Write-Host "   Then use: VITE_SERVER_URL=http://yourdomain.com:$Port" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Run desktop app:" -ForegroundColor White
Write-Host "   cd desktop" -ForegroundColor Gray
Write-Host "   npm run tauri:dev" -ForegroundColor Gray
Write-Host ""

Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  Check status:  aws ssm start-session --target $InstanceId" -ForegroundColor Gray
Write-Host "                 pm2 status" -ForegroundColor Gray
Write-Host "  View logs:     pm2 logs summit-backend" -ForegroundColor Gray
Write-Host "  Restart:       pm2 restart summit-backend" -ForegroundColor Gray
Write-Host ""

Write-Host "Isolated Deployment:" -ForegroundColor Green
Write-Host "✓ Directory: /opt/summit-backend (separate from other apps)" -ForegroundColor Gray
Write-Host "✓ Port: $Port (no conflict with 5000, 50001)" -ForegroundColor Gray
Write-Host "✓ Process: summit-backend (managed by PM2)" -ForegroundColor Gray
Write-Host "✓ Database: Summit (separate from other databases)" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

