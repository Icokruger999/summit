# Wait for SSM to register and deploy automatically
$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$maxWait = 600  # 10 minutes
$waited = 0

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "  Waiting for SSM Agent to Register" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "Instance: $instanceId" -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking SSM status" -NoNewline -ForegroundColor Green

while ($waited -lt $maxWait) {
    # Check if instance is registered with SSM
    $ssmStatus = python -m awscli ssm describe-instance-information `
        --region $region `
        --filters "Key=InstanceIds,Values=$instanceId" `
        --query "InstanceInformationList[0].PingStatus" `
        --output text 2>$null
    
    if ($ssmStatus -eq "Online") {
        Write-Host ""
        Write-Host ""
        Write-Host "===========================================================" -ForegroundColor Green
        Write-Host "  SSM Agent is Online!" -ForegroundColor Green
        Write-Host "===========================================================" -ForegroundColor Green
        Write-Host ""
        
        # Get instance details
        $instanceInfo = python -m awscli ssm describe-instance-information `
            --region $region `
            --filters "Key=InstanceIds,Values=$instanceId" `
            --query "InstanceInformationList[0].[PlatformName,PlatformVersion,AgentVersion]" `
            --output text
        
        Write-Host "Instance Details:" -ForegroundColor Yellow
        Write-Host "  Platform: $instanceInfo" -ForegroundColor Gray
        Write-Host ""
        
        # Now deploy!
        Write-Host "Starting automated deployment..." -ForegroundColor Cyan
        Write-Host ""
        
        & "$PSScriptRoot\deploy-final.ps1"
        
        exit 0
    }
    
    # Not ready yet, wait and try again
    Write-Host "." -NoNewline -ForegroundColor Gray
    Start-Sleep -Seconds 30
    $waited += 30
}

# Timeout
Write-Host ""
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Yellow
Write-Host "  SSM Registration Timeout" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "SSM agent hasn't registered after $($maxWait/60) minutes." -ForegroundColor Yellow
Write-Host ""
Write-Host "This might be because:" -ForegroundColor White
Write-Host "1. SSM agent needs to be installed on the instance" -ForegroundColor Gray
Write-Host "2. SSM agent needs to be restarted" -ForegroundColor Gray
Write-Host "3. Instance needs a reboot" -ForegroundColor Gray
Write-Host ""
Write-Host "Quick Fix Options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Reboot the instance (recommended)" -ForegroundColor White
Write-Host "  python -m awscli ec2 reboot-instances --region $region --instance-ids $instanceId" -ForegroundColor Gray
Write-Host "  Then wait 2-3 minutes and run this script again" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Manual deployment (works now)" -ForegroundColor White
Write-Host "  See DEPLOY_NOW_QUICK.md for instructions" -ForegroundColor Gray
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Yellow
Write-Host ""





