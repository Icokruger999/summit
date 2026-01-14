# Verify CORS Fix - Using simple text output
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Verifying CORS Fix" -ForegroundColor Cyan
Write-Host ""

# Use simple commands that output plain text
$commands = @(
    "cd $ServerPath",
    "echo '=== PM2 Status ==='",
    "pm2 jlist | grep -o 'name.*summit-backend' && echo 'PM2_RUNNING' || echo 'PM2_NOT_RUNNING'",
    "echo ''",
    "echo '=== CORS Configuration ==='",
    "grep '^CORS_ORIGIN=' .env && echo 'CORS_SET' || echo 'CORS_NOT_SET'",
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
    Write-Host "Waiting for response..." -ForegroundColor Gray
    
    Start-Sleep -Seconds 5
    
    # Get status first
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --query 'Status' `
        --output text 2>&1
    
    Write-Host ""
    Write-Host "Command Status: $status" -ForegroundColor $(if ($status -eq "Success") { "Green" } else { "Red" })
    
    if ($status -eq "Success") {
        Write-Host ""
        Write-Host "Fetching output (may have encoding issues with PM2 output)..." -ForegroundColor Yellow
        
        # Try to get just the text parts we care about
        $outputRaw = aws ssm get-command-invocation `
            --command-id $commandId `
            --instance-id $InstanceId `
            --region $Region `
            --query 'StandardOutputContent' `
            --output text 2>&1
        
        # Filter out non-printable characters but keep newlines
        $outputClean = $outputRaw -replace '[^\x20-\x7E\n\r]', '?'
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $outputClean
        
        # Check for key indicators
        if ($outputClean -match 'PM2_RUNNING') {
            Write-Host ""
            Write-Host "[OK] PM2 is running" -ForegroundColor Green
        } elseif ($outputClean -match 'PM2_NOT_RUNNING') {
            Write-Host ""
            Write-Host "[FAIL] PM2 is NOT running" -ForegroundColor Red
        }
        
        if ($outputClean -match 'CORS_SET') {
            Write-Host "[OK] CORS_ORIGIN is set in .env" -ForegroundColor Green
        } elseif ($outputClean -match 'CORS_NOT_SET') {
            Write-Host "[FAIL] CORS_ORIGIN is NOT set" -ForegroundColor Red
        }
        
        if ($outputClean -match 'BUILD_OK') {
            Write-Host "[OK] Server build exists" -ForegroundColor Green
        } elseif ($outputClean -match 'BUILD_MISSING') {
            Write-Host "[FAIL] Server build is missing" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
