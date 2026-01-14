# Verify Temp Password Feature Deployment
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Verifying Deployment" -ForegroundColor Cyan
Write-Host ""

$commands = @(
    "cd $ServerPath",
    "echo '=== PM2 Status ==='",
    "pm2 list | grep summit || echo 'NOT_RUNNING'",
    "echo ''",
    "echo '=== AWS SES Package ==='",
    "test -d node_modules/@aws-sdk/client-ses && echo 'INSTALLED' || echo 'NOT_INSTALLED'",
    "echo ''",
    "echo '=== Database Migration ==='",
    "sudo -u postgres psql -d summit -c 'SELECT column_name FROM information_schema.columns WHERE table_name=''users'' AND column_name IN (''temp_password_hash'', ''requires_password_change'', ''account_created_at'') ORDER BY column_name;' | grep -E '(temp_password_hash|requires_password_change|account_created_at)' && echo 'MIGRATION_OK' || echo 'MIGRATION_MISSING'",
    "echo ''",
    "echo '=== Build Status ==='",
    "test -f dist/index.js && echo 'BUILD_OK' || echo 'BUILD_MISSING'"
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
    Write-Host "Command ID: $commandId" -ForegroundColor Yellow
    
    Start-Sleep -Seconds 5
    
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --query 'Status' `
        --output text 2>&1
    
    Write-Host "Status: $status" -ForegroundColor $(if ($status -eq "Success") { "Green" } else { "Red" })
    
    if ($status -eq "Success") {
        Write-Host ""
        Write-Host "Deployment verification complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next: Configure AWS SES in .env file" -ForegroundColor Yellow
        Write-Host "Run: .\update-ses-env-ssm.ps1 -FromEmail 'your-email@domain.com'" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
