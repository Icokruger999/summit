# Update Server .env file with Database Credentials via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    [Parameter(Mandatory=$false)]
    [string]$ServerPath = "/var/www/summit/server"
)

$InstanceId = "i-0fba58db502cc8d39"
$DB_PASSWORD = "KUQoTLZJcHN0YYXS6qiGJS9B7"

Write-Host "Updating Server .env file via SSM" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host "Server Path: $ServerPath" -ForegroundColor Yellow
Write-Host ""

Write-Host "Sending .env update command..." -ForegroundColor Yellow

# Commands to update .env file
$commands = @(
    "cd $ServerPath",
    "if [ ! -f .env ]; then touch .env; fi",
    "grep -v '^DB_HOST=' .env > .env.tmp || true",
    "grep -v '^DB_PORT=' .env.tmp > .env.tmp2 || true",
    "grep -v '^DB_NAME=' .env.tmp2 > .env.tmp || true",
    "grep -v '^DB_USER=' .env.tmp > .env.tmp2 || true",
    "grep -v '^DB_PASSWORD=' .env.tmp2 > .env.tmp || true",
    "mv .env.tmp .env",
    "echo 'DB_HOST=127.0.0.1' >> .env",
    "echo 'DB_PORT=6432' >> .env",
    "echo 'DB_NAME=summit' >> .env",
    "echo 'DB_USER=summit_user' >> .env",
    "echo 'DB_PASSWORD=$DB_PASSWORD' >> .env",
    "cat .env | grep -E '^DB_'",
    "echo '.env file updated with database credentials'"
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
    
    # Quick polling
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
    
    # Get final status and output
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
