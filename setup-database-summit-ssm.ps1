# Database Setup for Summit EC2 Instance via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"

Write-Host "Database Setup for Summit Instance via SSM" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "AWS CLI not found" -ForegroundColor Red
    exit 1
}

Write-Host "Sending database setup command..." -ForegroundColor Yellow
Write-Host "This will take 5-10 minutes..." -ForegroundColor Gray
Write-Host ""

# Use the JSON file approach
$jsonFile = "setup-database-summit-ssm.json"
if (-not (Test-Path $jsonFile)) {
    Write-Host "JSON file not found: $jsonFile" -ForegroundColor Red
    exit 1
}

$result = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --cli-input-json file://$jsonFile `
    --region $Region `
    --output json 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to send command:" -ForegroundColor Red
    Write-Host $result
    exit 1
}

$commandObj = $result | ConvertFrom-Json
$commandId = $commandObj.Command.CommandId

Write-Host "Command sent successfully" -ForegroundColor Green
Write-Host "Command ID: $commandId" -ForegroundColor Yellow
Write-Host ""
Write-Host "Waiting for setup to complete..." -ForegroundColor Yellow
Write-Host "You can check status in AWS Console: Systems Manager -> Run Command" -ForegroundColor Gray
Write-Host ""

# Wait and check status
Write-Host "Waiting 60 seconds for command to complete..." -ForegroundColor Gray
Start-Sleep -Seconds 60

Write-Host ""
Write-Host "Retrieving command output..." -ForegroundColor Yellow

$outputText = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $InstanceId `
    --region $Region `
    --output text 2>&1

Write-Host ""
Write-Host "Command Output:" -ForegroundColor Cyan
Write-Host ("=" * 80)
Write-Host $outputText

# Also get JSON for status
$outputJson = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $InstanceId `
    --region $Region `
    --query 'Status' `
    --output text 2>&1

Write-Host ""
Write-Host "Status: $outputJson" -ForegroundColor $(if ($outputJson -eq "Success") { "Green" } else { "Red" })
Write-Host ""
Write-Host "Full details available in AWS Console: Systems Manager -> Run Command" -ForegroundColor Gray
Write-Host "Command ID: $commandId" -ForegroundColor Gray
