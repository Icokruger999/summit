# Initialize Database Schema via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"

Write-Host "Initializing Database Schema via SSM" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "database/complete_schema.sql")) {
    Write-Host "Schema file not found: database/complete_schema.sql" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading schema file and initializing database..." -ForegroundColor Yellow

$schemaContent = Get-Content "database/complete_schema.sql" -Raw -Encoding UTF8

# Base64 encode to avoid escaping issues
$bytes = [System.Text.Encoding]::UTF8.GetBytes($schemaContent)
$base64Content = [Convert]::ToBase64String($bytes)

# Create commands to upload and execute schema using base64 decode
$commands = @(
    "cd /home/ubuntu",
    "echo '$base64Content' | base64 -d > /tmp/schema_init.sql",
    "sudo -u postgres psql -d summit -f /tmp/schema_init.sql 2>&1",
    "sudo -u postgres psql -d summit -c '\dt' 2>&1",
    "rm -f /tmp/schema_init.sql",
    "echo 'Schema initialization complete'"
)

# Use SSM send-command with JSON file to avoid command-line length limits
$jsonObj = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = $commands
    }
} | ConvertTo-Json -Depth 10 -Compress

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
    Write-Host "Waiting for completion (checking every 3 seconds)..." -ForegroundColor Yellow
    
    # Quick polling - check every 3 seconds, max 60 seconds
    $maxWait = 60
    $waited = 0
    $status = "InProgress"
    
    while ($status -eq "InProgress" -and $waited -lt $maxWait) {
        Start-Sleep -Seconds 3
        $waited += 3
        
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
        
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    Write-Host ""
    
    # Get status
    $statusResult = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "Status: $($statusResult.Status)" -ForegroundColor $(if ($statusResult.Status -eq "Success") { "Green" } else { "Red" })
    Write-Host ""
    Write-Host "Output:" -ForegroundColor Cyan
    Write-Host $statusResult.StandardOutputContent
    
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
