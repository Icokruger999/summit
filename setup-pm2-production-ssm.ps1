# Setup PM2 for Production Server via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"

Write-Host "Setting up PM2 for Production Server via SSM" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "scripts/ec2-setup-pm2-production.sh")) {
    Write-Host "Setup script not found: scripts/ec2-setup-pm2-production.sh" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading and executing PM2 setup script..." -ForegroundColor Yellow

$scriptContent = Get-Content "scripts/ec2-setup-pm2-production.sh" -Raw -Encoding UTF8

# Base64 encode to avoid escaping issues
$bytes = [System.Text.Encoding]::UTF8.GetBytes($scriptContent)
$base64Content = [Convert]::ToBase64String($bytes)

# Create commands to upload and execute script
$commands = @(
    "cd /tmp",
    "echo '$base64Content' | base64 -d > setup-pm2.sh",
    "chmod +x setup-pm2.sh",
    "sudo bash setup-pm2.sh",
    "rm -f setup-pm2.sh",
    "echo 'PM2 setup complete'"
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
    Write-Host "Waiting for PM2 setup (this may take 1-2 minutes)..." -ForegroundColor Yellow
    
    # Poll for completion
    $maxWait = 120
    $waited = 0
    $status = "InProgress"
    
    while ($status -eq "InProgress" -and $waited -lt $maxWait) {
        Start-Sleep -Seconds 5
        $waited += 5
        
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
        
        if ($waited % 15 -eq 0) {
            Write-Host "  Still setting up... (${waited}s)" -ForegroundColor Gray
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
    # Remove emojis and special characters for Windows console compatibility
    $output = $statusResult.StandardOutputContent -replace '[^\x00-\x7F]', ''
    Write-Host $output
    
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
