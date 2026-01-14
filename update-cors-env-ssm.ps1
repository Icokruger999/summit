# Update CORS_ORIGIN in Server .env file via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"
$CorsOrigin = "https://summit.codingeverest.com"

Write-Host "Updating CORS_ORIGIN in Server .env file via SSM" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host "CORS Origin: $CorsOrigin" -ForegroundColor Yellow
Write-Host ""

Write-Host "Updating .env file..." -ForegroundColor Yellow

# Commands to update CORS_ORIGIN in .env file
$commands = @(
    "cd $ServerPath",
    "if [ ! -f .env ]; then echo 'ERROR: .env file not found' && exit 1; fi",
    "# Remove existing CORS_ORIGIN line if present",
    "grep -v '^CORS_ORIGIN=' .env > .env.tmp || true",
    "mv .env.tmp .env",
    "# Add new CORS_ORIGIN",
    "echo 'CORS_ORIGIN=$CorsOrigin' >> .env",
    "# Verify the change",
    "echo '--- Updated .env CORS settings ---'",
    "grep '^CORS_ORIGIN=' .env || echo 'WARNING: CORS_ORIGIN not found in .env'",
    "echo '.env file updated with CORS_ORIGIN'"
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
# Use UTF8NoBOM to avoid BOM issues with AWS CLI
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
    
    # Poll for completion
    $maxWait = 30
    $waited = 0
    $status = "InProgress"
    
    while ($status -eq "InProgress" -and $waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        
        $statusResult = aws ssm get-command-invocation `
            --command-id $commandId `
            --instance-id $InstanceId `
            --region $Region `
            --output json 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $statusObj = $statusResult | ConvertFrom-Json
            if ($statusObj.Status) {
                $status = $statusObj.Status
                if ($status -ne "InProgress") {
                    break
                }
            }
        }
    }
    
    # Get final status
    $statusResult = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
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
    
    if ($statusResult.Status -eq "Success") {
        Write-Host ""
        Write-Host "Restarting server to apply CORS changes..." -ForegroundColor Yellow
        # Restart PM2 process
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
        
        $restartStatusJson = aws ssm get-command-invocation `
            --command-id $restartCommandId `
            --instance-id $InstanceId `
            --region $Region `
            --output json 2>&1
        
        $restartStatusJson = $restartStatusJson -replace '[^\x00-\x7F]', '?'
        $restartStatus = $restartStatusJson | ConvertFrom-Json
        
        Write-Host "Restart Status: $($restartStatus.Status)" -ForegroundColor $(if ($restartStatus.Status -eq "Success") { "Green" } else { "Yellow" })
        
        Remove-Item $restartJsonFile -ErrorAction SilentlyContinue
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
