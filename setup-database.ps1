# Setup Summit Database on RDS via SSM
# This script creates the database tables without affecting other databases

param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceId,
    
    [Parameter(Mandatory=$false)]
    [string]$DBHost = "codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com",
    
    [Parameter(Mandatory=$false)]
    [string]$DBName = "Summit",
    
    [Parameter(Mandatory=$false)]
    [string]$DBUser = "postgres",
    
    [Parameter(Mandatory=$false)]
    [string]$DBPassword = "Stacey1122"
)

Write-Host "=== Summit Database Setup via SSM ===" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host "Database: $DBName on $DBHost" -ForegroundColor Yellow
Write-Host ""

# Read schema file
$schemaContent = Get-Content "database\schema.sql" -Raw

# Upload schema to S3
Write-Host "[1/3] Uploading schema to S3..." -ForegroundColor Green
$bucketName = "codingeverest-deployments"
$schemaFile = "summit-backend/schema.sql"

$schemaContent | Out-File -FilePath "schema.sql" -Encoding UTF8
aws s3 cp "schema.sql" "s3://$bucketName/$schemaFile"

# Create setup script
Write-Host "[2/3] Creating database setup script..." -ForegroundColor Green
$setupScript = @"
#!/bin/bash
set -e

echo "=== Setting up Summit Database ==="

# Install PostgreSQL client if not installed
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL client..."
    sudo apt-get update
    sudo apt-get install -y postgresql-client
fi

# Download schema from S3
echo "Downloading schema..."
cd /tmp
aws s3 cp s3://$bucketName/$schemaFile schema.sql

# Check if database exists
echo "Checking if database '$DBName' exists..."
DB_EXISTS=`$(PGPASSWORD='$DBPassword' psql -h $DBHost -U $DBUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DBName'")

if [ -z "`$DB_EXISTS" ]; then
    echo "Creating database '$DBName'..."
    PGPASSWORD='$DBPassword' psql -h $DBHost -U $DBUser -d postgres -c "CREATE DATABASE \"$DBName\";"
else
    echo "Database '$DBName' already exists"
fi

# Run schema
echo "Creating tables in '$DBName'..."
PGPASSWORD='$DBPassword' psql -h $DBHost -U $DBUser -d $DBName -f schema.sql

echo ""
echo "=== Database Setup Complete ==="
echo "Database: $DBName"
echo "Tables created successfully"
"@

$setupScript | Out-File -FilePath "setup-db-script.sh" -Encoding UTF8
aws s3 cp "setup-db-script.sh" "s3://$bucketName/summit-backend/setup-db-script.sh"

# Execute via SSM
Write-Host "[3/3] Executing database setup on EC2 via SSM..." -ForegroundColor Green

$ssmCommand = @"
cd /tmp
aws s3 cp s3://$bucketName/summit-backend/setup-db-script.sh setup-db-script.sh
chmod +x setup-db-script.sh
./setup-db-script.sh 2>&1
"@

$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$ssmCommand]" `
    --output text `
    --query "Command.CommandId"

Write-Host "   Command ID: $commandId" -ForegroundColor Gray
Write-Host "   Waiting for execution..." -ForegroundColor Gray

# Wait for completion
Start-Sleep -Seconds 5

$maxAttempts = 30
$attempt = 0
$status = "InProgress"

while ($status -eq "InProgress" -and $attempt -lt $maxAttempts) {
    $attempt++
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "Status" `
        --output text 2>$null
    
    if ($status -eq "InProgress") {
        Write-Host "   ." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 3
    }
}

Write-Host ""

# Get output
if ($status -eq "Success") {
    Write-Host "Database setup successful!" -ForegroundColor Green
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "StandardOutputContent" `
        --output text
    
    Write-Host ""
    Write-Host "=== Setup Output ===" -ForegroundColor Cyan
    Write-Host $output
} else {
    Write-Host "Database setup failed!" -ForegroundColor Red
    $errorOutput = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query "StandardErrorContent" `
        --output text
    
    Write-Host "Error output:" -ForegroundColor Red
    Write-Host $errorOutput
}

# Cleanup
Remove-Item "schema.sql" -Force -ErrorAction SilentlyContinue
Remove-Item "setup-db-script.sh" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Database setup complete!" -ForegroundColor Green

