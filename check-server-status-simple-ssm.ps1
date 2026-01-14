# Simple Server Status Check
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Checking Server Status" -ForegroundColor Cyan
Write-Host ""

# Simple commands that won't have encoding issues
$commands = @(
    "cd $ServerPath",
    "pm2 list | grep summit || echo 'NOT_RUNNING'",
    "grep CORS_ORIGIN .env || echo 'CORS_NOT_SET'",
    "test -f dist/index.js && echo 'BUILD_EXISTS' || echo 'BUILD_MISSING'"
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
    
    Start-Sleep -Seconds 3
    
    # Get status using AWS CLI directly and parse carefully
    $statusOutput = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output text `
        --query '[Status, StandardOutputContent]' 2>&1
    
    Write-Host ""
    Write-Host "Status Check Results:" -ForegroundColor Cyan
    Write-Host $statusOutput
    
    # Also get JSON to check status
    $statusJson = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output json 2>&1
    
    # Try to extract just the status
    if ($statusJson -match '"Status"\s*:\s*"([^"]+)"') {
        $actualStatus = $matches[1]
        Write-Host ""
        Write-Host "Command Status: $actualStatus" -ForegroundColor $(if ($actualStatus -eq "Success") { "Green" } else { "Red" })
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
