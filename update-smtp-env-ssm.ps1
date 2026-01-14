# Update SMTP Configuration in Server .env file via SSM
param(
    [Parameter(Mandatory=$true)]
    [string]$SmtpPassword,
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Updating SMTP Configuration in Server .env file" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

Write-Host "Updating .env file with SMTP configuration..." -ForegroundColor Yellow

$commands = @(
    "cd $ServerPath",
    "if [ ! -f .env ]; then echo 'ERROR: .env file not found' && exit 1; fi",
    "# Remove existing SMTP lines if present",
    "grep -v '^SMTP_HOST=' .env > .env.tmp || true",
    "grep -v '^SMTP_PORT=' .env.tmp > .env.tmp2 || true",
    "grep -v '^SMTP_EMAIL=' .env.tmp2 > .env.tmp || true",
    "grep -v '^SMTP_PASSWORD=' .env.tmp > .env.tmp2 || true",
    "grep -v '^SMTP_FROM_NAME=' .env.tmp2 > .env.tmp || true",
    "grep -v '^FRONTEND_URL=' .env.tmp > .env.tmp2 || true",
    "mv .env.tmp2 .env",
    "# Add new SMTP configuration",
    "echo 'SMTP_HOST=mail.privateemail.com' >> .env",
    "echo 'SMTP_PORT=587' >> .env",
    "echo 'SMTP_EMAIL=info@streamyo.net' >> .env",
    "echo 'SMTP_PASSWORD=$SmtpPassword' >> .env",
    "echo 'SMTP_FROM_NAME=Summit' >> .env",
    "echo 'FRONTEND_URL=https://summit.codingeverest.com' >> .env",
    "# Verify the changes",
    "echo '--- Updated .env SMTP settings ---'",
    "grep -E '^SMTP_' .env || echo 'WARNING: SMTP settings not found in .env'",
    "echo '.env file updated with SMTP configuration'"
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
        Write-Host ""
        Write-Host "✅ SMTP setup complete!" -ForegroundColor Green
        Write-Host "Ready to test signup flow!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
