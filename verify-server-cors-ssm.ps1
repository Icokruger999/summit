# Verify Server CORS Configuration via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Verifying Server CORS Configuration" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

$commands = @(
    "cd $ServerPath",
    "echo '=== PM2 Status ==='",
    "pm2 status summit-backend",
    "echo ''",
    "echo '=== .env CORS Settings ==='",
    "grep '^CORS_ORIGIN=' .env || echo 'CORS_ORIGIN not found'",
    "echo ''",
    "echo '=== Recent PM2 Logs (last 20 lines) ==='",
    "pm2 logs summit-backend --lines 20 --nostream | tail -20 || echo 'No logs available'"
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
    Write-Host "Waiting for response..." -ForegroundColor Gray
    
    Start-Sleep -Seconds 3
    
    $statusJson = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output json 2>&1
    
    $statusJson = $statusJson -replace '[^\x00-\x7F]', '?'
    $statusResult = $statusJson | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "Status: $($statusResult.Status)" -ForegroundColor $(if ($statusResult.Status -eq "Success") { "Green" } else { "Red" })
    Write-Host ""
    Write-Host "Output:" -ForegroundColor Cyan
    if ($statusResult.StandardOutputContent) {
        $output = $statusResult.StandardOutputContent -replace '[^\x20-\x7E\n\r]', '?'
        Write-Host $output
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
