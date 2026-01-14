# Deploy Temp Password Feature to EC2 via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Deploying Temp Password Feature to EC2" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

# Step 1: Pull latest code from Git
Write-Host "Step 1: Pulling latest code from Git..." -ForegroundColor Yellow
$gitCommands = @(
    "cd /var/www/summit",
    "git pull origin main",
    "echo 'Git pull complete'"
)

$gitJson = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = $gitCommands
    }
} | ConvertTo-Json -Depth 10

$tempJson1 = [System.IO.Path]::GetTempFileName() + ".json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempJson1, $gitJson, $utf8NoBom)

try {
    $result1 = aws ssm send-command `
        --cli-input-json file://$tempJson1 `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    $commandId1 = $result1.Command.CommandId
    Write-Host "  Command ID: $commandId1" -ForegroundColor Gray
    
    Start-Sleep -Seconds 5
    
    $status1 = aws ssm get-command-invocation `
        --command-id $commandId1 `
        --instance-id $InstanceId `
        --region $Region `
        --query 'Status' `
        --output text 2>&1
    
    Write-Host "  Status: $status1" -ForegroundColor $(if ($status1 -eq "Success") { "Green" } else { "Red" })
    Write-Host ""
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson1 -ErrorAction SilentlyContinue
}

# Step 2: Install AWS SES dependency
Write-Host "Step 2: Installing AWS SES dependency..." -ForegroundColor Yellow
$installCommands = @(
    "cd $ServerPath",
    "npm install @aws-sdk/client-ses@^3.490.0",
    "echo 'Dependency installation complete'"
)

$installJson = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = $installCommands
    }
} | ConvertTo-Json -Depth 10

$tempJson2 = [System.IO.Path]::GetTempFileName() + ".json"
[System.IO.File]::WriteAllText($tempJson2, $installJson, $utf8NoBom)

try {
    $result2 = aws ssm send-command `
        --cli-input-json file://$tempJson2 `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    $commandId2 = $result2.Command.CommandId
    Write-Host "  Command ID: $commandId2" -ForegroundColor Gray
    Write-Host "  Installing (this may take 30-60 seconds)..." -ForegroundColor Gray
    
    $maxWait = 90
    $waited = 0
    $status2 = "InProgress"
    
    while ($status2 -eq "InProgress" -and $waited -lt $maxWait) {
        Start-Sleep -Seconds 5
        $waited += 5
        
        $statusResult = aws ssm get-command-invocation `
            --command-id $commandId2 `
            --instance-id $InstanceId `
            --region $Region `
            --output json 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $statusObj = $statusResult | ConvertFrom-Json
            if ($statusObj.Status) {
                $status2 = $statusObj.Status
                if ($status2 -ne "InProgress") {
                    break
                }
            }
        }
        
        if ($waited % 15 -eq 0) {
            Write-Host "    Still installing... (${waited}s)" -ForegroundColor Gray
        }
    }
    
    $status2 = aws ssm get-command-invocation `
        --command-id $commandId2 `
        --instance-id $InstanceId `
        --region $Region `
        --query 'Status' `
        --output text 2>&1
    
    Write-Host "  Status: $status2" -ForegroundColor $(if ($status2 -eq "Success") { "Green" } else { "Red" })
    
    if ($status2 -ne "Success") {
        Write-Host "  Error output:" -ForegroundColor Yellow
        $errorOutput = aws ssm get-command-invocation `
            --command-id $commandId2 `
            --instance-id $InstanceId `
            --region $Region `
            --query 'StandardErrorContent' `
            --output text 2>&1
        Write-Host $errorOutput
    }
    Write-Host ""
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson2 -ErrorAction SilentlyContinue
}

# Step 3: Run database migration
Write-Host "Step 3: Running database migration..." -ForegroundColor Yellow
$migrationCommands = @(
    "cd /var/www/summit",
    "sudo -u postgres psql -d summit -f database/migration_temp_password_signup.sql",
    "echo 'Migration complete'"
)

$migrationJson = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = $migrationCommands
    }
} | ConvertTo-Json -Depth 10

$tempJson3 = [System.IO.Path]::GetTempFileName() + ".json"
[System.IO.File]::WriteAllText($tempJson3, $migrationJson, $utf8NoBom)

try {
    $result3 = aws ssm send-command `
        --cli-input-json file://$tempJson3 `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    $commandId3 = $result3.Command.CommandId
    Write-Host "  Command ID: $commandId3" -ForegroundColor Gray
    
    Start-Sleep -Seconds 5
    
    $status3 = aws ssm get-command-invocation `
        --command-id $commandId3 `
        --instance-id $InstanceId `
        --region $Region `
        --query 'Status' `
        --output text 2>&1
    
    Write-Host "  Status: $status3" -ForegroundColor $(if ($status3 -eq "Success") { "Green" } else { "Red" })
    Write-Host ""
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson3 -ErrorAction SilentlyContinue
}

# Step 4: Rebuild and restart server
Write-Host "Step 4: Rebuilding and restarting server..." -ForegroundColor Yellow
$rebuildCommands = @(
    "cd $ServerPath",
    "npm run build",
    "pm2 restart summit-backend",
    "pm2 save",
    "echo 'Server rebuild and restart complete'"
)

$rebuildJson = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = $rebuildCommands
    }
} | ConvertTo-Json -Depth 10

$tempJson4 = [System.IO.Path]::GetTempFileName() + ".json"
[System.IO.File]::WriteAllText($tempJson4, $rebuildJson, $utf8NoBom)

try {
    $result4 = aws ssm send-command `
        --cli-input-json file://$tempJson4 `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    $commandId4 = $result4.Command.CommandId
    Write-Host "  Command ID: $commandId4" -ForegroundColor Gray
    Write-Host "  Rebuilding (this may take 30-60 seconds)..." -ForegroundColor Gray
    
    $maxWait = 90
    $waited = 0
    $status4 = "InProgress"
    
    while ($status4 -eq "InProgress" -and $waited -lt $maxWait) {
        Start-Sleep -Seconds 5
        $waited += 5
        
        $statusResult = aws ssm get-command-invocation `
            --command-id $commandId4 `
            --instance-id $InstanceId `
            --region $Region `
            --output json 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $statusObj = $statusResult | ConvertFrom-Json
            if ($statusObj.Status) {
                $status4 = $statusObj.Status
                if ($status4 -ne "InProgress") {
                    break
                }
            }
        }
        
        if ($waited % 15 -eq 0) {
            Write-Host "    Still rebuilding... (${waited}s)" -ForegroundColor Gray
        }
    }
    
    $status4 = aws ssm get-command-invocation `
        --command-id $commandId4 `
        --instance-id $InstanceId `
        --region $Region `
        --query 'Status' `
        --output text 2>&1
    
    Write-Host "  Status: $status4" -ForegroundColor $(if ($status4 -eq "Success") { "Green" } else { "Red" })
    Write-Host ""
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson4 -ErrorAction SilentlyContinue
}

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure AWS SES in server/.env:" -ForegroundColor Yellow
Write-Host "   - AWS_REGION=eu-west-1" -ForegroundColor Gray
Write-Host "   - AWS_SES_FROM_EMAIL=your-verified-email@domain.com" -ForegroundColor Gray
Write-Host "   - AWS_ACCESS_KEY_ID (optional if using IAM role)" -ForegroundColor Gray
Write-Host "   - AWS_SECRET_ACCESS_KEY (optional if using IAM role)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart server after updating .env:" -ForegroundColor Yellow
Write-Host "   pm2 restart summit-backend" -ForegroundColor Gray
Write-Host ""
