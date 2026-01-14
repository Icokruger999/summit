# Fix CORS Issue - Rebuild and Restart Server
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Fixing CORS Issue - Rebuilding and Restarting Server" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

$commands = @(
    "cd $ServerPath",
    "echo 'Step 1: Checking current status...'",
    "pm2 status summit-backend || echo 'Server not running'",
    "echo ''",
    "echo 'Step 2: Rebuilding server...'",
    "npm run build",
    "echo ''",
    "echo 'Step 3: Restarting server with PM2...'",
    "pm2 restart summit-backend || pm2 start ecosystem.config.cjs --env production",
    "pm2 save",
    "echo ''",
    "echo 'Step 4: Verifying server is running...'",
    "sleep 2",
    "pm2 status summit-backend",
    "echo ''",
    "echo 'CORS fix complete!'"
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
    Write-Host "Rebuilding and restarting server (this may take 30-60 seconds)..." -ForegroundColor Yellow
    
    # Poll for completion
    $maxWait = 90
    $waited = 0
    $status = "InProgress"
    
    while ($status -eq "InProgress" -and $waited -lt $maxWait) {
        Start-Sleep -Seconds 5
        $waited += 5
        
        $statusJson = aws ssm get-command-invocation `
            --command-id $commandId `
            --instance-id $InstanceId `
            --region $Region `
            --output json 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $statusJson = $statusJson -replace '[^\x00-\x7F]', '?'
            $statusObj = $statusJson | ConvertFrom-Json
            if ($statusObj.Status) {
                $status = $statusObj.Status
                if ($status -ne "InProgress") {
                    break
                }
            }
        }
        
        if ($waited % 15 -eq 0) {
            Write-Host "  Still processing... (${waited}s)" -ForegroundColor Gray
        }
    }
    
    # Get final status
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
    
    if ($statusResult.StandardErrorContent) {
        Write-Host ""
        Write-Host "Errors:" -ForegroundColor Yellow
        Write-Host $statusResult.StandardErrorContent
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
