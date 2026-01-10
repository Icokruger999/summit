# Verify Summit Database via SSM
# Quick verification that only checks Summit database status

$INSTANCE_ID = "i-03589e2371d2fad15"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Verify Summit Database" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$verifyScript = @'
$workDir = "C:\summit-db-setup"
if (Test-Path $workDir) {
    cd $workDir
    
    Write-Host "Verifying Summit database...`n" -ForegroundColor Cyan
    
    if (Test-Path "setup-summit-db.cjs") {
        node setup-summit-db.cjs
    } else {
        Write-Host "Setup scripts not found. Please run run-summit-db-setup.ps1 first." -ForegroundColor Yellow
    }
} else {
    Write-Host "Setup directory not found. Please run run-summit-db-setup.ps1 first." -ForegroundColor Yellow
}
'@

Write-Host "Running verification on EC2...`n" -ForegroundColor Cyan

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunPowerShellScript" `
    --parameters "commands=[$verifyScript]" `
    --comment "Verify Summit Database" `
    --output text `
    --query "Command.CommandId"

if (-not $commandId) {
    Write-Host "❌ Failed to send command!`n" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Command sent! Command ID: $commandId" -ForegroundColor Green
Write-Host "Waiting for results...`n" -ForegroundColor Cyan

# Wait for command
Start-Sleep -Seconds 10

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $INSTANCE_ID `
    --output json | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Results" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host $output.StandardOutputContent

if ($output.StandardErrorContent) {
    Write-Host "`nErrors:" -ForegroundColor Red
    Write-Host $output.StandardErrorContent
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

