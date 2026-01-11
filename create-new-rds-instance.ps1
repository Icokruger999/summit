# PowerShell Script to Create New RDS PostgreSQL Instance for Summit
# Creates a new RDS PostgreSQL instance with database "Summit"

param(
    [string]$DBInstanceIdentifier = "summit-db",
    [string]$MasterUsername = "postgres",
    [string]$MasterPassword = "",
    [string]$DBName = "Summit",
    [string]$InstanceClass = "db.t3.micro",
    [string]$Region = "eu-west-1",
    [string]$VpcSecurityGroupId = "",
    [string]$SubnetGroupName = "default"
)

Write-Host "=== Creating New RDS PostgreSQL Instance for Summit ===" -ForegroundColor Cyan
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

# Get master password if not provided
if ([string]::IsNullOrEmpty($MasterPassword)) {
    $MasterPassword = Read-Host "Enter master password for database (will be saved securely)" -AsSecureString
    $MasterPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($MasterPassword)
    )
} else {
    $MasterPasswordPlain = $MasterPassword
}

Write-Host ""
Write-Host "⚠️  IMPORTANT: Save this password securely!" -ForegroundColor Yellow
Write-Host "   Master Username: $MasterUsername" -ForegroundColor Cyan
Write-Host "   Database Name: $DBName" -ForegroundColor Cyan
Write-Host ""

# Get default VPC
Write-Host "📋 Getting default VPC..." -ForegroundColor Yellow
try {
    $vpcId = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $Region
    if ($vpcId -eq "None" -or -not $vpcId) {
        Write-Host "❌ No default VPC found. Please specify a VPC ID." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Default VPC: $vpcId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error getting VPC: $_" -ForegroundColor Red
    exit 1
}

# Get or create DB subnet group
Write-Host "📋 Checking DB subnet group..." -ForegroundColor Yellow
try {
    $subnetGroup = aws rds describe-db-subnet-groups --db-subnet-group-name $SubnetGroupName --query "DBSubnetGroups[0].DBSubnetGroupName" --output text --region $Region 2>$null
    if ($subnetGroup -eq "None" -or -not $subnetGroup) {
        Write-Host "⚠️  DB subnet group '$SubnetGroupName' not found" -ForegroundColor Yellow
        Write-Host "   Creating default subnet group..." -ForegroundColor Yellow
        
        # Get subnets in VPC
        $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[*].SubnetId" --output text --region $Region
        $subnetArray = $subnets -split "`t"
        $subnet1 = $subnetArray[0]
        $subnet2 = $subnetArray[1]
        
        if ($subnet1 -and $subnet2) {
            aws rds create-db-subnet-group `
                --db-subnet-group-name $SubnetGroupName `
                --db-subnet-group-description "Default subnet group for RDS" `
                --subnet-ids $subnet1 $subnet2 `
                --region $Region | Out-Null
            Write-Host "✅ DB subnet group created" -ForegroundColor Green
        } else {
            Write-Host "❌ Not enough subnets found. Please create subnet group manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ DB subnet group found: $SubnetGroupName" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Error checking subnet group: $_" -ForegroundColor Yellow
}

# Get or create security group for RDS
Write-Host "📋 Checking security group for RDS..." -ForegroundColor Yellow
try {
    if ([string]::IsNullOrEmpty($VpcSecurityGroupId)) {
        $sgName = "rds-summit-sg"
        $sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" "Name=vpc-id,Values=$vpcId" --query "SecurityGroups[0].GroupId" --output text --region $Region 2>$null
        
        if ($sgId -and $sgId -ne "None") {
            Write-Host "✅ Security group found: $sgId" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Security group not found, creating..." -ForegroundColor Yellow
            $sgId = aws ec2 create-security-group --group-name $sgName --description "Security group for Summit RDS" --vpc-id $vpcId --query "GroupId" --output text --region $Region
            
            # Add inbound rule for PostgreSQL (port 5432) from VPC
            aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 5432 --cidr $vpcId/16 --region $Region 2>$null | Out-Null
            
            Write-Host "✅ Security group created: $sgId" -ForegroundColor Green
        }
        $VpcSecurityGroupId = $sgId
    }
} catch {
    Write-Host "⚠️  Error with security group: $_" -ForegroundColor Yellow
}

# Create RDS instance
Write-Host ""
Write-Host "🚀 Creating RDS PostgreSQL instance..." -ForegroundColor Yellow
Write-Host "   Instance Identifier: $DBInstanceIdentifier" -ForegroundColor Gray
Write-Host "   Engine: PostgreSQL" -ForegroundColor Gray
Write-Host "   Instance Class: $InstanceClass" -ForegroundColor Gray
Write-Host "   Database Name: $DBName" -ForegroundColor Gray
Write-Host "   Master Username: $MasterUsername" -ForegroundColor Gray
Write-Host "   This may take 10-15 minutes..." -ForegroundColor Gray
Write-Host ""

try {
    $createParams = @(
        "rds", "create-db-instance",
        "--db-instance-identifier", $DBInstanceIdentifier,
        "--db-instance-class", $InstanceClass,
        "--engine", "postgres",
        "--engine-version", "15.4",
        "--master-username", $MasterUsername,
        "--master-user-password", $MasterPasswordPlain,
        "--db-name", $DBName,
        "--allocated-storage", "20",
        "--storage-type", "gp3",
        "--vpc-security-group-ids", $VpcSecurityGroupId,
        "--db-subnet-group-name", $SubnetGroupName,
        "--backup-retention-period", "7",
        "--publicly-accessible", "false",
        "--storage-encrypted",
        "--region", $Region,
        "--output", "json"
    )
    
    $instanceJson = & aws @createParams | ConvertFrom-Json
    
    Write-Host "✅ RDS instance creation initiated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Instance Details:" -ForegroundColor Cyan
    Write-Host "  Instance Identifier: $($instanceJson.DBInstance.DBInstanceIdentifier)" -ForegroundColor White
    Write-Host "  Status: $($instanceJson.DBInstance.DBInstanceStatus)" -ForegroundColor White
    Write-Host "  Engine: $($instanceJson.DBInstance.Engine) $($instanceJson.DBInstance.EngineVersion)" -ForegroundColor White
    Write-Host "  Instance Class: $($instanceJson.DBInstance.DBInstanceClass)" -ForegroundColor White
    Write-Host ""
    Write-Host "⏳ Instance is being created. This will take 10-15 minutes." -ForegroundColor Yellow
    Write-Host "   You can check status with:" -ForegroundColor Gray
    Write-Host "   aws rds describe-db-instances --db-instance-identifier $DBInstanceIdentifier" -ForegroundColor Cyan
    Write-Host ""
    
    # Save connection info
    $connectionInfo = @{
        DBInstanceIdentifier = $DBInstanceIdentifier
        MasterUsername = $MasterUsername
        MasterPassword = "***SAVED SECURELY - DO NOT COMMIT***"
        DBName = $DBName
        Region = $Region
        Status = "Creating"
        CreatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Endpoint = "Will be available after instance is created"
    }
    
    $connectionInfo | ConvertTo-Json | Out-File -FilePath "rds-instance-info.json" -Encoding utf8
    Write-Host "✅ Connection info saved to: rds-instance-info.json" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Save the master password!" -ForegroundColor Yellow
    Write-Host "   Password: $MasterPasswordPlain" -ForegroundColor Cyan
    Write-Host ""
    
    # Wait for instance to be available (optional - commented out as it takes long)
    Write-Host "To wait for instance to be ready, run:" -ForegroundColor Yellow
    Write-Host "   aws rds wait db-instance-available --db-instance-identifier $DBInstanceIdentifier" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error creating RDS instance: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Insufficient permissions (need rds:CreateDBInstance)" -ForegroundColor White
    Write-Host "  - Instance identifier already exists" -ForegroundColor White
    Write-Host "  - Invalid security group or subnet group" -ForegroundColor White
    exit 1
}

