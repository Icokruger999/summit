# Update AWS SES Configuration in Server .env file via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    [Parameter(Mandatory=$false)]
    [string]$FromEmail = ""
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Updating AWS SES Configuration in Server .env file" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

if ([string]::IsNullOrEmpty($FromEmail)) {
    Write-Host "Please provide the verified sender email address:" -ForegroundColor Yellow
    Write-Host "Usage: .\update-ses-env-ssm.ps1 -FromEmail 'noreply@yourdomain.com'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or you can manually update the .env file on the server." -ForegroundColor Gray
    exit 0
}

Write-Host "Updating .env file with AWS SES configuration..." -ForegroundColor Yellow

# Commands to update .env file
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
    "# Note: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are optional if using IAM role",
    "# Uncomment and set these if not using IAM role:",
    "# echo 'AWS_ACCESS_KEY_ID=your-key' >> .env",
    "# echo 'AWS_SECRET_ACCESS_KEY=your-secret' >> .env",
    "# Verify the changes",
    "echo '--- Updated .env AWS SES settings ---'",
    "grep -E '^AWS_' .env || echo 'WARNING: AWS settings not found in .env'",
    "echo '.env file updated with AWS SES configuration'"
)

# Create JSON file
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
    Write-Host "Waiting for completion..." -ForegroundColor Yellow
    
    Start-Sleep -Seconds 5
    
    $statusResult = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "Status: $($statusResult.Status)" -ForegroundColor $(if ($statusResult.Status -eq "Success") { "Green" } else { "Red" })
    Write-Host ""
    
    if ($statusResult.StandardOutputContent) {
        Write-Host "Output:" -ForegroundColor Cyan
        $output = $statusResult.StandardOutputContent -replace '[^\x20-\x7E\n\r]', '?'
        Write-Host $output
    }
    
    if ($statusResult.Status -eq "Success") {
        Write-Host ""
        Write-Host "Restarting server to apply changes..." -ForegroundColor Yellow
        
        $restartCommands = @(
            "cd $ServerPath",
            "pm2 restart summit-backend"
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
        Start-Sleep -Seconds 3
        
        $restartStatus = aws ssm get-command-invocation `
            --command-id $restartCommandId `
            --instance-id $InstanceId `
            --region $Region `
            --output json 2>&1 | ConvertFrom-Json
        
        Write-Host "Restart Status: $($restartStatus.Status)" -ForegroundColor $(if ($restartStatus.Status -eq "Success") { "Green" } else { "Yellow" })
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
