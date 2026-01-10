# Upgrade EC2 Instance to t2.medium
# Current: t2.micro (1 vCPU, 1 GB RAM)
# Upgrade to: t2.medium (2 vCPU, 4 GB RAM)

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$targetType = "t2.medium"

Write-Host "=== EC2 Instance Type Upgrade ===" -ForegroundColor Cyan
Write-Host "Instance: $instanceId" -ForegroundColor White
Write-Host "Current Type: t2.micro" -ForegroundColor Yellow
Write-Host "Target Type: $targetType" -ForegroundColor Green
Write-Host ""

# Check current state
Write-Host "Checking current state..." -ForegroundColor Cyan
$currentState = aws ec2 describe-instances --instance-ids $instanceId --region $region --query "Reservations[0].Instances[0].State.Name" --output text
Write-Host "Current State: $currentState" -ForegroundColor $(if($currentState -eq 'running'){'Green'}else{'Yellow'})

if ($currentState -eq "running") {
    Write-Host "`n⚠️ Instance is running. Need to stop it first." -ForegroundColor Yellow
    Write-Host "This will cause ~5 minutes of downtime." -ForegroundColor Yellow
    $confirm = Read-Host "Continue? (yes/no)"
    
    if ($confirm -ne "yes") {
        Write-Host "Cancelled." -ForegroundColor Red
        exit
    }
    
    # Stop instance
    Write-Host "`nStopping instance..." -ForegroundColor Yellow
    aws ec2 stop-instances --instance-ids $instanceId --region $region | Out-Null
    
    Write-Host "Waiting for instance to stop (this may take 2-3 minutes)..." -ForegroundColor Yellow
    aws ec2 wait instance-stopped --instance-ids $instanceId --region $region
    
    Write-Host "✅ Instance stopped!" -ForegroundColor Green
}

# Change instance type
Write-Host "`nChanging instance type to $targetType..." -ForegroundColor Cyan
aws ec2 modify-instance-attribute `
    --instance-id $instanceId `
    --instance-type "Value=$targetType" `
    --region $region

Write-Host "✅ Instance type changed to $targetType!" -ForegroundColor Green

# Start instance
Write-Host "`nStarting instance..." -ForegroundColor Cyan
aws ec2 start-instances --instance-ids $instanceId --region $region | Out-Null

Write-Host "Waiting for instance to start (this may take 1-2 minutes)..." -ForegroundColor Yellow
aws ec2 wait instance-running --instance-ids $instanceId --region $region

Write-Host "✅ Instance started!" -ForegroundColor Green

# Verify
Write-Host "`nVerifying instance type..." -ForegroundColor Cyan
$newType = aws ec2 describe-instances --instance-ids $instanceId --region $region --query "Reservations[0].Instances[0].InstanceType" --output text
$newState = aws ec2 describe-instances --instance-ids $instanceId --region $region --query "Reservations[0].Instances[0].State.Name" --output text

Write-Host "`n=== Upgrade Complete ===" -ForegroundColor Green
Write-Host "Instance Type: $newType" -ForegroundColor White
Write-Host "State: $newState" -ForegroundColor White

if ($newType -eq $targetType -and $newState -eq "running") {
    Write-Host "`n✅ SUCCESS! Instance upgraded to $targetType" -ForegroundColor Green
    Write-Host "`nInstance now has:" -ForegroundColor Cyan
    Write-Host "  - 2 vCPU (was 1)" -ForegroundColor White
    Write-Host "  - 4 GB RAM (was 1 GB)" -ForegroundColor White
    Write-Host "`nServices (Milo, Summit) should auto-start with PM2" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️ Please verify instance type in AWS Console" -ForegroundColor Yellow
}

