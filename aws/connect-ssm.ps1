# Connect to EC2 via AWS Systems Manager Session Manager
# This script helps you easily connect to your EC2 instances using SSM

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   AWS SSM Session Manager" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI: $awsVersion`n" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found!" -ForegroundColor Red
    Write-Host "   Install from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if Session Manager plugin is installed
try {
    $ssmVersion = session-manager-plugin --version 2>&1
    Write-Host "✅ Session Manager Plugin installed`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Session Manager Plugin not found!" -ForegroundColor Yellow
    Write-Host "   Download from: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html`n" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit 1
    }
}

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Cyan
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✅ Authenticated as: $($identity.Arn)`n" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS credentials not configured!" -ForegroundColor Red
    Write-Host "   Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# List available instances
Write-Host "Fetching available instances..." -ForegroundColor Cyan
Write-Host ""

$instancesJson = aws ec2 describe-instances `
    --filters "Name=instance-state-name,Values=running" `
    --query "Reservations[].Instances[].[InstanceId,Tags[?Key=='Name'].Value|[0],PrivateIpAddress,InstanceType,State.Name]" `
    --output json | ConvertFrom-Json

if ($instancesJson.Count -eq 0) {
    Write-Host "❌ No running instances found!" -ForegroundColor Red
    Write-Host "   Make sure you have EC2 instances in the eu-west-1 region" -ForegroundColor Yellow
    exit 1
}

# Display instances
Write-Host "Available instances:`n" -ForegroundColor Green
$index = 1
$instances = @()

foreach ($instance in $instancesJson) {
    $instanceId = $instance[0]
    $instanceName = if ($instance[1]) { $instance[1] } else { "(no name)" }
    $privateIp = $instance[2]
    $instanceType = $instance[3]
    
    $instances += @{
        Index = $index
        Id = $instanceId
        Name = $instanceName
        Ip = $privateIp
        Type = $instanceType
    }
    
    Write-Host "  [$index] " -NoNewline -ForegroundColor Yellow
    Write-Host "$instanceName" -NoNewline -ForegroundColor White
    Write-Host " ($instanceId)" -ForegroundColor Gray
    Write-Host "      Type: $instanceType | IP: $privateIp`n" -ForegroundColor Gray
    
    $index++
}

# Get user selection
Write-Host "========================================`n" -ForegroundColor Cyan
$selection = Read-Host "Select instance number (or 'q' to quit)"

if ($selection -eq 'q') {
    Write-Host "`nExiting...`n" -ForegroundColor Yellow
    exit 0
}

$selectedInstance = $instances | Where-Object { $_.Index -eq [int]$selection }

if (-not $selectedInstance) {
    Write-Host "`n❌ Invalid selection!`n" -ForegroundColor Red
    exit 1
}

# Check if instance has SSM access
Write-Host "`nChecking SSM connectivity..." -ForegroundColor Cyan
$ssmInstances = aws ssm describe-instance-information `
    --filters "Key=InstanceIds,Values=$($selectedInstance.Id)" `
    --output json | ConvertFrom-Json

if ($ssmInstances.InstanceInformationList.Count -eq 0) {
    Write-Host "❌ Instance not available via SSM!" -ForegroundColor Red
    Write-Host "`nPossible reasons:" -ForegroundColor Yellow
    Write-Host "  1. Instance doesn't have IAM role with SSM permissions" -ForegroundColor Yellow
    Write-Host "  2. SSM Agent not installed or not running" -ForegroundColor Yellow
    Write-Host "  3. Instance has no internet access" -ForegroundColor Yellow
    Write-Host "`nSee AWS_SSM_SETUP.md for troubleshooting steps`n" -ForegroundColor Yellow
    exit 1
}

# Connect to instance
Write-Host "✅ Instance is SSM-ready!`n" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Connecting to: $($selectedInstance.Name)" -ForegroundColor Cyan
Write-Host "   Instance ID: $($selectedInstance.Id)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Starting session..." -ForegroundColor Green
Write-Host "(Type 'exit' to close the session)`n" -ForegroundColor Gray

aws ssm start-session --target $selectedInstance.Id

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Session ended" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

