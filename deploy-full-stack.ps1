# Complete Full-Stack Deployment Script
# Updates backend via SSM and deploys frontend to Amplify
# RULE: Amplify must be kept updated with backend deployments

param(
    [string]$InstanceId = "i-0fba58db502cc8d39",
    [string]$Region = "eu-west-1",
    [string]$DeployPath = "/var/www/summit",
    [string]$AmplifyAppId = "",
    [string]$AmplifyBranch = "main",
    [switch]$SkipAmplify = $false
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Summit Full-Stack Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend (EC2 via SSM):" -ForegroundColor Yellow
Write-Host "  Instance ID: $InstanceId" -ForegroundColor Gray
Write-Host "  Region: $Region" -ForegroundColor Gray
Write-Host "  Deploy Path: $DeployPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Frontend (Amplify):" -ForegroundColor Yellow
Write-Host "  App ID: $AmplifyAppId" -ForegroundColor Gray
Write-Host "  Branch: $AmplifyBranch" -ForegroundColor Gray
Write-Host ""

# Validate AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI is not installed!" -ForegroundColor Red
    Write-Host "   Install from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Get Amplify App ID if not provided
if (-not $AmplifyAppId -and -not $SkipAmplify) {
    Write-Host "📋 Detecting Amplify App ID..." -ForegroundColor Yellow
    try {
        $apps = aws amplify list-apps --region $Region --output json | ConvertFrom-Json
        if ($apps.apps.Count -gt 0) {
            $AmplifyAppId = $apps.apps[0].appId
            Write-Host "✅ Found Amplify App: $AmplifyAppId" -ForegroundColor Green
        } else {
            Write-Host "⚠️  No Amplify apps found. Skipping Amplify deployment." -ForegroundColor Yellow
            $SkipAmplify = $true
        }
    } catch {
        Write-Host "⚠️  Could not detect Amplify app. Skipping Amplify deployment." -ForegroundColor Yellow
        $SkipAmplify = $true
    }
}

# ============================================
# STEP 1: Deploy Backend via SSM
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "[1/3] Deploying Backend to EC2 (Port 3000)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Create .env file with production configuration (NO localhost, Port 3000)
Write-Host "[1.1] Creating .env file..." -ForegroundColor Green

$createEnvCmd = @"
cd $DeployPath/server
cat > .env << 'ENVEOF'
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# Database Configuration
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122

# Summit Database Configuration (REQUIRED)
SUMMIT_DB_HOST=summit-db.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
SUMMIT_DB_PORT=5432
SUMMIT_DB_NAME=Summit
SUMMIT_DB_USER=postgres
SUMMIT_DB_PASSWORD=Stacey1122

# Security
JWT_SECRET=summit-jwt-secret-change-in-production

# CORS Configuration (NO localhost in production)
CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com

# Summit API Key
SUMMIT_API_KEY=summit-api-key-change-in-production

# LiveKit Configuration (Production)
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-livekit-domain.com
ENVEOF
echo "✅ .env file created"
cat .env | grep -E "^(PORT|NODE_ENV|CORS_ORIGIN)" | head -5
"@

Write-Host "Sending .env creation command..." -ForegroundColor Yellow
$envResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$createEnvCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$envCmdId = $envResult.Command.CommandId
Write-Host "Command ID: $envCmdId" -ForegroundColor Cyan
Start-Sleep -Seconds 8

$envStatus = aws ssm get-command-invocation --command-id $envCmdId --instance-id $InstanceId --region $Region --query 'Status' --output text 2>$null
Write-Host "Status: $envStatus" -ForegroundColor $(if ($envStatus -eq "Success") { "Green" } else { "Red" })

# Install dependencies
Write-Host ""
Write-Host "[1.2] Installing dependencies..." -ForegroundColor Green
$installCmd = "cd $DeployPath/server && npm install --production"
$installResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$installCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$installCmdId = $installResult.Command.CommandId
Write-Host "Command ID: $installCmdId (waiting up to 3 minutes)..." -ForegroundColor Cyan

$waited = 0
while ($waited -lt 180) {
    Start-Sleep -Seconds 5
    $waited += 5
    $status = aws ssm get-command-invocation --command-id $installCmdId --instance-id $InstanceId --region $Region --query 'Status' --output text 2>$null
    if ($status -eq "Success" -or $status -eq "Failed") { break }
    Write-Host "." -NoNewline
}
Write-Host ""

$installStatus = aws ssm get-command-invocation --command-id $installCmdId --instance-id $InstanceId --region $Region --query 'Status' --output text 2>$null
Write-Host "Install Status: $installStatus" -ForegroundColor $(if ($installStatus -eq "Success") { "Green" } else { "Red" })

# Build application
Write-Host ""
Write-Host "[1.3] Building application..." -ForegroundColor Green
$buildCmd = "cd $DeployPath/server && npm run build"
$buildResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$buildCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$buildCmdId = $buildResult.Command.CommandId
Write-Host "Command ID: $buildCmdId (waiting up to 2 minutes)..." -ForegroundColor Cyan

$waited = 0
while ($waited -lt 120) {
    Start-Sleep -Seconds 5
    $waited += 5
    $status = aws ssm get-command-invocation --command-id $buildCmdId --instance-id $InstanceId --region $Region --query 'Status' --output text 2>$null
    if ($status -eq "Success" -or $status -eq "Failed") { break }
    Write-Host "." -NoNewline
}
Write-Host ""

$buildStatus = aws ssm get-command-invocation --command-id $buildCmdId --instance-id $InstanceId --region $Region --query 'Status' --output text 2>$null
Write-Host "Build Status: $buildStatus" -ForegroundColor $(if ($buildStatus -eq "Success") { "Green" } else { "Red" })

# Start/Restart with PM2 (using ecosystem.config.js)
Write-Host ""
Write-Host "[1.4] Starting server with PM2 (24/7 mode)..." -ForegroundColor Green
$startCmd = @"
cd $DeployPath/server
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
sleep 3
pm2 list | grep summit-backend || echo "PM2 process not found"
"@

$startResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$startCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$startCmdId = $startResult.Command.CommandId
Write-Host "Command ID: $startCmdId" -ForegroundColor Cyan
Start-Sleep -Seconds 10

$startStatus = aws ssm get-command-invocation --command-id $startCmdId --instance-id $InstanceId --region $Region --query 'Status' --output text 2>$null
Write-Host "Start Status: $startStatus" -ForegroundColor $(if ($startStatus -eq "Success") { "Green" } else { "Yellow" })

# Verify backend
Write-Host ""
Write-Host "[1.5] Verifying backend..." -ForegroundColor Green
$verifyCmd = @"
sleep 5
pm2 list | grep summit-backend
curl -s http://localhost:3000/health || echo "Health check failed"
netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000 || echo "Port 3000 not listening"
"@

$verifyResult = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$verifyCmd]" `
    --region $Region `
    --output json 2>&1 | ConvertFrom-Json

$verifyCmdId = $verifyResult.Command.CommandId
Start-Sleep -Seconds 8

$verifyOutput = aws ssm get-command-invocation --command-id $verifyCmdId --instance-id $InstanceId --region $Region --query 'StandardOutputContent' --output text 2>$null
Write-Host $verifyOutput

# ============================================
# STEP 2: Deploy Frontend to Amplify
# ============================================
if (-not $SkipAmplify) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "[2/3] Deploying Frontend to Amplify" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "[2.1] Triggering Amplify build..." -ForegroundColor Green
    try {
        $jobResult = aws amplify start-job `
            --app-id $AmplifyAppId `
            --branch-name $AmplifyBranch `
            --job-type RELEASE `
            --region $Region `
            --output json 2>&1 | ConvertFrom-Json
        
        $jobId = $jobResult.jobSummary.jobId
        Write-Host "✅ Build triggered! Job ID: $jobId" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Monitor build progress:" -ForegroundColor Yellow
        Write-Host "   aws amplify get-job --app-id $AmplifyAppId --branch-name $AmplifyBranch --job-id $jobId --region $Region" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Or check in AWS Console:" -ForegroundColor Yellow
        Write-Host "   https://console.aws.amazon.com/amplify/home?region=$Region#/$AmplifyAppId/$AmplifyBranch" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Could not trigger Amplify build: $_" -ForegroundColor Yellow
        Write-Host "   You may need to push to GitHub to trigger a build, or trigger manually in the console." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⏭️  Skipping Amplify deployment (use -AmplifyAppId to specify app)" -ForegroundColor Yellow
}

# ============================================
# STEP 3: Summary
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend (EC2):" -ForegroundColor Yellow
Write-Host "  ✅ Environment: $envStatus" -ForegroundColor $(if ($envStatus -eq "Success") { "Green" } else { "Red" })
Write-Host "  ✅ Dependencies: $installStatus" -ForegroundColor $(if ($installStatus -eq "Success") { "Green" } else { "Red" })
Write-Host "  ✅ Build: $buildStatus" -ForegroundColor $(if ($buildStatus -eq "Success") { "Green" } else { "Red" })
Write-Host "  ✅ PM2 Start: $startStatus" -ForegroundColor $(if ($startStatus -eq "Success") { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Frontend (Amplify):" -ForegroundColor Yellow
if (-not $SkipAmplify) {
    Write-Host "  ✅ Build triggered" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Skipped" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Test Endpoints:" -ForegroundColor Yellow
Write-Host "  Backend Health: https://summit.api.codingeverest.com/health" -ForegroundColor White
Write-Host "  Frontend: https://summit.codingeverest.com" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT RULES:" -ForegroundColor Yellow
Write-Host "  1. Backend runs on port 3000 (NEVER 5000 or 50001)" -ForegroundColor White
Write-Host "  2. No localhost in production configuration" -ForegroundColor White
Write-Host "  3. Amplify must be updated when backend is deployed" -ForegroundColor White
Write-Host "  4. Server runs 24/7 with PM2 auto-restart" -ForegroundColor White
Write-Host ""

