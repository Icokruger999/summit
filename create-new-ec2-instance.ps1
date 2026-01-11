# PowerShell Script to Create New EC2 Instance for Summit Migration
# This creates a new t2.micro EC2 instance for migrating Summit code

param(
    [string]$InstanceName = "summit-new-instance",
    [string]$KeyPairName = "summit-keypair",
    [string]$SecurityGroupName = "summit-security-group",
    [string]$Region = "eu-west-1"
)

Write-Host "=== Creating New EC2 Instance for Summit Migration ===" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI is not installed!" -ForegroundColor Red
    Write-Host "   Install from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ AWS CLI found" -ForegroundColor Green
Write-Host ""

# Set AWS region
$env:AWS_DEFAULT_REGION = $Region
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Get default VPC
Write-Host "📋 Getting default VPC..." -ForegroundColor Yellow
try {
    $vpc = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text
    if ($vpc -eq "None" -or -not $vpc) {
        Write-Host "❌ No default VPC found. Please specify a VPC ID." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Default VPC: $vpc" -ForegroundColor Green
} catch {
    Write-Host "❌ Error getting VPC: $_" -ForegroundColor Red
    exit 1
}

# Get default subnet
Write-Host "📋 Getting default subnet..." -ForegroundColor Yellow
try {
    $subnet = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc" --query "Subnets[0].SubnetId" --output text
    if ($subnet -eq "None" -or -not $subnet) {
        Write-Host "❌ No subnet found. Please specify a subnet ID." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Default subnet: $subnet" -ForegroundColor Green
} catch {
    Write-Host "❌ Error getting subnet: $_" -ForegroundColor Red
    exit 1
}

# Check if key pair exists, create if not
Write-Host "📋 Checking key pair..." -ForegroundColor Yellow
try {
    $keyExists = aws ec2 describe-key-pairs --key-names $KeyPairName --query "KeyPairs[0].KeyName" --output text 2>$null
    if ($keyExists -eq $KeyPairName) {
        Write-Host "✅ Key pair '$KeyPairName' already exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Key pair '$KeyPairName' not found" -ForegroundColor Yellow
        Write-Host "   Creating new key pair..." -ForegroundColor Yellow
        aws ec2 create-key-pair --key-name $KeyPairName --query "KeyMaterial" --output text > "$KeyPairName.pem"
        Write-Host "✅ Key pair created and saved to $KeyPairName.pem" -ForegroundColor Green
        Write-Host "⚠️  IMPORTANT: Save this key file securely! You'll need it to SSH into the instance." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not check/create key pair: $_" -ForegroundColor Yellow
    Write-Host "   You may need to create it manually in AWS Console" -ForegroundColor Yellow
}

# Check/create security group
Write-Host "📋 Checking security group..." -ForegroundColor Yellow
try {
    $sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$SecurityGroupName" "Name=vpc-id,Values=$vpc" --query "SecurityGroups[0].GroupId" --output text 2>$null
    if ($sgId -and $sgId -ne "None") {
        Write-Host "✅ Security group '$SecurityGroupName' already exists: $sgId" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Security group '$SecurityGroupName' not found" -ForegroundColor Yellow
        Write-Host "   Creating new security group..." -ForegroundColor Yellow
        $sgId = aws ec2 create-security-group --group-name $SecurityGroupName --description "Security group for Summit application" --vpc-id $vpc --query "GroupId" --output text
        
        # Add inbound rules
        Write-Host "   Adding inbound rules..." -ForegroundColor Yellow
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 2>$null | Out-Null
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0 2>$null | Out-Null
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0 2>$null | Out-Null
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 4000 --cidr 0.0.0.0/0 2>$null | Out-Null
        
        Write-Host "✅ Security group created: $sgId" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not check/create security group: $_" -ForegroundColor Yellow
    Write-Host "   You may need to create it manually in AWS Console" -ForegroundColor Yellow
    $sgId = Read-Host "Enter security group ID (or press Enter to skip)"
}

# Get Ubuntu 22.04 LTS AMI
Write-Host "📋 Getting Ubuntu 22.04 LTS AMI..." -ForegroundColor Yellow
try {
    $amiId = aws ec2 describe-images --owners 099720109477 --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" --output text --region $Region
    Write-Host "✅ AMI: $amiId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error getting AMI: $_" -ForegroundColor Red
    Write-Host "   Using default AMI ID for Ubuntu 22.04" -ForegroundColor Yellow
    $amiId = "ami-0c55b159cbfafe1f0" # Fallback - may need updating
}

# Create user data script for initial setup
$userData = @"
#!/bin/bash
# Initial setup script for Summit instance
apt-get update -y
apt-get install -y git curl wget

# Create summit user
useradd -m -s /bin/bash summit || true

# Log setup start
echo "Summit instance setup started at $(date)" >> /var/log/summit-setup.log
"@

$userDataBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($userData))

# Launch instance
Write-Host ""
Write-Host "🚀 Launching EC2 instance..." -ForegroundColor Yellow
Write-Host "   Instance Type: t2.micro" -ForegroundColor Gray
Write-Host "   AMI: $amiId" -ForegroundColor Gray
Write-Host "   Key Pair: $KeyPairName" -ForegroundColor Gray
Write-Host "   Security Group: $sgId" -ForegroundColor Gray
Write-Host ""

try {
    $instanceJson = aws ec2 run-instances `
        --image-id $amiId `
        --instance-type t2.micro `
        --key-name $KeyPairName `
        --security-group-ids $sgId `
        --subnet-id $subnet `
        --user-data $userDataBase64 `
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$InstanceName},{Key=Project,Value=Summit},{Key=Environment,Value=New}]" `
        --output json | ConvertFrom-Json
    
    $instanceId = $instanceJson.Instances[0].InstanceId
    Write-Host "✅ Instance created: $instanceId" -ForegroundColor Green
    Write-Host ""
    
    # Wait for instance to be running
    Write-Host "⏳ Waiting for instance to be running..." -ForegroundColor Yellow
    aws ec2 wait instance-running --instance-ids $instanceId
    
    # Get public IP
    Start-Sleep -Seconds 5
    $publicIp = aws ec2 describe-instances --instance-ids $instanceId --query "Reservations[0].Instances[0].PublicIpAddress" --output text
    
    Write-Host ""
    Write-Host "=== Instance Created Successfully! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Instance ID: $instanceId" -ForegroundColor Cyan
    Write-Host "Public IP: $publicIp" -ForegroundColor Cyan
    Write-Host "Key Pair: $KeyPairName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Save this information!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SSH Command:" -ForegroundColor Yellow
    Write-Host "  ssh -i $KeyPairName.pem ubuntu@$publicIp" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Wait 2-3 minutes for instance to fully initialize" -ForegroundColor White
    Write-Host "  2. Run: .\setup-new-instance.ps1 -InstanceId $instanceId" -ForegroundColor White
    Write-Host "  3. Or run setup manually (see MIGRATE_TO_NEW_EC2.md)" -ForegroundColor White
    Write-Host ""
    
    # Save instance info to file
    @{
        InstanceId = $instanceId
        PublicIp = $publicIp
        KeyPairName = $KeyPairName
        Region = $Region
        CreatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json | Out-File -FilePath "new-instance-info.json" -Encoding utf8
    
    Write-Host "✅ Instance information saved to: new-instance-info.json" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error creating instance: $_" -ForegroundColor Red
    exit 1
}

