# PowerShell Script to Set Up EC2 Instance via AWS Systems Manager (SSM)
# This script uses SSM instead of SSH to set up the instance

param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceId,
    
    [string]$Region = "eu-west-1"
)

Write-Host "=== Setting Up EC2 Instance via SSM ===" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "âŒ AWS CLI is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host "âœ… AWS CLI found" -ForegroundColor Green
Write-Host ""

# Check if instance is ready for SSM
Write-Host "ðŸ“‹ Checking SSM agent status..." -ForegroundColor Yellow
$maxRetries = 10
$retryCount = 0
$ssmReady = $false

while ($retryCount -lt $maxRetries -and -not $ssmReady) {
    $instanceInfo = aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$InstanceId" --region $Region --output json 2>$null | ConvertFrom-Json
    
    if ($instanceInfo.InstanceInformationList.Count -gt 0 -and $instanceInfo.InstanceInformationList[0].PingStatus -eq "Online") {
        $ssmReady = $true
        Write-Host "âœ… SSM agent is online!" -ForegroundColor Green
    } else {
        $retryCount++
        Write-Host "â³ Waiting for SSM agent to register... (Attempt $retryCount/$maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 15
    }
}

if (-not $ssmReady) {
    Write-Host "âŒ SSM agent is not ready. Please ensure:" -ForegroundColor Red
    Write-Host "   1. Instance has IAM role with SSM permissions" -ForegroundColor Yellow
    Write-Host "   2. SSM agent is installed and running" -ForegroundColor Yellow
    Write-Host "   3. Instance is in a subnet with internet access" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "ðŸ“‹ Creating setup commands..." -ForegroundColor Yellow

# Create setup script as a single command
$setupCommands = @"
#!/bin/bash
set -e

echo "=== Summit Instance Setup Script ==="
echo "Started at: \$(date)"
echo ""

# Update system
echo "ðŸ“¦ Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js 18
echo "ðŸ“¦ Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
echo "ðŸ“¦ Installing PM2..."
sudo npm install -g pm2

# Install Git
echo "ðŸ“¦ Installing Git..."
sudo apt-get install -y git

# Install Nginx
echo "ðŸ“¦ Installing Nginx..."
sudo apt-get install -y nginx

# Install PostgreSQL client
echo "ðŸ“¦ Installing PostgreSQL client..."
sudo apt-get install -y postgresql-client

# Install AWS CLI (if not already installed)
if ! command -v aws &> /dev/null; then
    echo "ðŸ“¦ Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    sudo apt-get install -y unzip
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# Create directories
echo "ðŸ“ Creating directories..."
sudo mkdir -p /var/www/summit
sudo chown -R ubuntu:ubuntu /var/www/summit

echo ""
echo "âœ… System setup complete!"
echo ""
echo "To verify setup:"
echo "  node --version"
echo "  npm --version"
echo "  pm2 --version"
echo "  nginx -v"
"@

# Split commands into an array for SSM
$commandArray = $setupCommands -split "`n" | Where-Object { $_.Trim() -ne "" }

Write-Host "âœ… Setup commands prepared" -ForegroundColor Green
Write-Host ""
Write-Host "ðŸ“¤ Sending setup commands to instance via SSM..." -ForegroundColor Yellow
Write-Host "   (This may take 5-10 minutes)" -ForegroundColor Gray
Write-Host ""

# Send command via SSM
try {
    $commandJson = @{
        commands = $commandArray
    } | ConvertTo-Json -Compress
    
    $commandParams = "commands=$([System.Web.HttpUtility]::UrlEncode($commandJson))"
    
    $commandResult = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=$($commandArray -join ';')" `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $commandId = $commandResult.Command.CommandId
    Write-Host "âœ… Command sent! Command ID: $commandId" -ForegroundColor Green
    Write-Host ""
    Write-Host "â³ Waiting for command to complete..." -ForegroundColor Yellow
    
    # Wait for command to complete
    $maxWait = 600 # 10 minutes
    $waited = 0
    $completed = $false
    
    while ($waited -lt $maxWait -and -not $completed) {
        Start-Sleep -Seconds 10
        $waited += 10
        
        $status = aws ssm get-command-invocation `
            --command-id $commandId `
            --instance-id $InstanceId `
            --region $Region `
            --output json 2>$null | ConvertFrom-Json
        
        if ($status.Status -eq "Success" -or $status.Status -eq "Failed" -or $status.Status -eq "Cancelled") {
            $completed = $true
            
            Write-Host ""
            Write-Host "=== Command Status: $($status.Status) ===" -ForegroundColor $(if ($status.Status -eq "Success") { "Green" } else { "Red" })
            Write-Host ""
            
            if ($status.StandardOutputContent) {
                Write-Host "Output:" -ForegroundColor Cyan
                Write-Host $status.StandardOutputContent -ForegroundColor White
            }
            
            if ($status.StandardErrorContent) {
                Write-Host ""
                Write-Host "Errors:" -ForegroundColor Yellow
                Write-Host $status.StandardErrorContent -ForegroundColor Red
            }
            
            if ($status.Status -eq "Success") {
                Write-Host ""
                Write-Host "âœ… Setup complete!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "âŒ Setup failed. Check errors above." -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    
    if (-not $completed) {
        Write-Host ""
        Write-Host "âš ï¸  Command is still running. Check status with:" -ForegroundColor Yellow
        Write-Host "   aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "âŒ Error sending SSM command: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Verify setup by running:" -ForegroundColor White
Write-Host "     aws ssm send-command --instance-ids $InstanceId --document-name AWS-RunShellScript --parameters 'commands=[\"node --version\",\"pm2 --version\"]'" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Migrate code:" -ForegroundColor White
Write-Host "     .\migrate-summit-code-via-ssm.ps1 -InstanceId $InstanceId" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Or use SSM Session Manager:" -ForegroundColor White
$ssmSessionCmd = 'aws ssm start-session --target ' + $InstanceId + ' --region ' + $Region
Write-Host "     $ssmSessionCmd" -ForegroundColor Cyan
Write-Host ""

