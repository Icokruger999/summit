# Complete SES Setup - Configure .env and Restart Server
param(
    [Parameter(Mandatory=$true)]
    [string]$FromEmail,
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Completing SES Setup" -ForegroundColor Cyan
Write-Host "From Email: $FromEmail" -ForegroundColor Yellow
Write-Host ""

# Step 1: Update .env file
Write-Host "Step 1: Updating .env file with SES configuration..." -ForegroundColor Yellow

$commands = @(
    "cd $ServerPath",
    "if [ ! -f .env ]; then echo 'ERROR: .env file not found' && exit 1; fi",
    "# Remove existing AWS SES lines if present",
    "grep -v '^AWS_REGION=' .env > .env.tmp || true",
    "grep -v '^AWS_SES_FROM_EMAIL=' .env.tmp > .env.tmp2 || true",
    "grep -v '^AWS_ACCESS_KEY_ID=' .env.tmp2 > .env.tmp || true",
    "grep -v '^AWS_SECRET_ACCESS_KEY=' .env.tmp > .env.tmp2 || true",
    "mv .env.tmp2 .env",
    "# Add new AWS SES configuration",
    "echo 'AWS_REGION=eu-west-1' >> .env",
    "echo 'AWS_SES_FROM_EMAIL=$FromEmail' >> .env",
    "# Verify the changes",
    "echo '--- Updated .env AWS SES settings ---'",
    "grep -E '^AWS_' .env || echo 'WARNING: AWS settings not found in .env'",
    "echo '.env file updated with AWS SES configuration'"
)

$jsonObj = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = $commands
    }
} | ConvertTo-Json -Depth 10

$tempJson = [System.IO.Path]::GetTempFileName() + ".json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempJson, $jsonObj, $utf8NoBom)

try {
    $result = aws ssm send-command `
        --cli-input-json file://$tempJson `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    Write-Host "  Command ID: $commandId" -ForegroundColor Gray
    
    Start-Sleep -Seconds 5
    
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --query 'Status' `
        --output text 2>&1
    
    Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "Success") { "Green" } else { "Red" })
    
    if ($status -eq "Success") {
        Write-Host ""
        Write-Host "Step 2: Restarting server..." -ForegroundColor Yellow
        
        $restartCommands = @(
            "cd $ServerPath",
            "pm2 restart summit-backend",
            "sleep 3",
            "pm2 status summit-backend"
        )
        
        $restartJson = @{
            InstanceIds = @($InstanceId)
            DocumentName = "AWS-RunShellScript"
            Parameters = @{
                commands = $restartCommands
            }
        } | ConvertTo-Json -Depth 10
        
        $restartJsonFile = [System.IO.Path]::GetTempFileName() + ".json"
        [System.IO.File]::WriteAllText($restartJsonFile, $restartJson, $utf8NoBom)
        
        $restartResult = aws ssm send-command `
            --cli-input-json file://$restartJsonFile `
            --region $Region `
            --output json 2>&1 | ConvertFrom-Json
        
        $restartCommandId = $restartResult.Command.CommandId
        Start-Sleep -Seconds 5
        
        $restartStatus = aws ssm get-command-invocation `
            --command-id $restartCommandId `
            --instance-id $InstanceId `
            --region $Region `
            --query 'Status' `
            --output text 2>&1
        
        Write-Host "  Restart Status: $restartStatus" -ForegroundColor $(if ($restartStatus -eq "Success") { "Green" } else { "Yellow" })
        
        Remove-Item $restartJsonFile -ErrorAction SilentlyContinue
        
        Write-Host ""
        Write-Host "✅ SES setup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Configuration:" -ForegroundColor Cyan
        Write-Host "  AWS_REGION: eu-west-1" -ForegroundColor Gray
        Write-Host "  AWS_SES_FROM_EMAIL: $FromEmail" -ForegroundColor Gray
        Write-Host "  Using IAM role: EC2-SSM-Role" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Ready to test signup flow!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
