# Deploy SMTP Email Service to EC2
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    [Parameter(Mandatory=$false)]
    [string]$SmtpPassword = ""
)

$InstanceId = "i-0fba58db502cc8d39"
$ServerPath = "/var/www/summit/server"

Write-Host "Deploying SMTP Email Service to EC2" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

# Step 1: Pull latest code
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

# Step 2: Install nodemailer
Write-Host "Step 2: Installing nodemailer..." -ForegroundColor Yellow
$installCommands = @(
    "cd $ServerPath",
    "npm install nodemailer@^6.9.8",
    "npm install --save-dev @types/nodemailer@^6.4.14",
    "echo 'Dependencies installed'"
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
    Write-Host ""
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempJson2 -ErrorAction SilentlyContinue
}

# Step 3: Update .env file
Write-Host "Step 3: Updating .env file with SMTP configuration..." -ForegroundColor Yellow

if ([string]::IsNullOrEmpty($SmtpPassword)) {
    Write-Host "  ⚠️  SMTP password not provided. Skipping .env update." -ForegroundColor Yellow
    Write-Host "  Please update .env manually with SMTP credentials." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Required .env variables:" -ForegroundColor Cyan
    Write-Host "    SMTP_HOST=mail.privateemail.com" -ForegroundColor Gray
    Write-Host "    SMTP_PORT=587" -ForegroundColor Gray
    Write-Host "    SMTP_EMAIL=info@streamyo.net" -ForegroundColor Gray
    Write-Host "    SMTP_PASSWORD=your-password" -ForegroundColor Gray
    Write-Host "    SMTP_FROM_NAME=Summit" -ForegroundColor Gray
    Write-Host "    FRONTEND_URL=https://summit.codingeverest.com" -ForegroundColor Gray
} else {
    $envCommands = @(
        "cd $ServerPath",
        "if [ ! -f .env ]; then echo 'ERROR: .env file not found' && exit 1; fi",
        "# Remove existing SMTP lines if present",
        "grep -v '^SMTP_HOST=' .env > .env.tmp || true",
        "grep -v '^SMTP_PORT=' .env.tmp > .env.tmp2 || true",
        "grep -v '^SMTP_EMAIL=' .env.tmp2 > .env.tmp || true",
        "grep -v '^SMTP_PASSWORD=' .env.tmp > .env.tmp2 || true",
        "grep -v '^SMTP_FROM_NAME=' .env.tmp2 > .env.tmp || true",
        "grep -v '^FRONTEND_URL=' .env.tmp > .env.tmp2 || true",
        "mv .env.tmp2 .env",
        "# Add new SMTP configuration",
        "echo 'SMTP_HOST=mail.privateemail.com' >> .env",
        "echo 'SMTP_PORT=587' >> .env",
        "echo 'SMTP_EMAIL=info@streamyo.net' >> .env",
        "echo 'SMTP_PASSWORD=$SmtpPassword' >> .env",
        "echo 'SMTP_FROM_NAME=Summit' >> .env",
        "echo 'FRONTEND_URL=https://summit.codingeverest.com' >> .env",
        "# Verify",
        "echo '--- Updated .env SMTP settings ---'",
        "grep -E '^SMTP_' .env || echo 'WARNING: SMTP settings not found'",
        "echo '.env updated'"
    )

    $envJson = @{
        InstanceIds = @($InstanceId)
        DocumentName = "AWS-RunShellScript"
        Parameters = @{
            commands = $envCommands
        }
    } | ConvertTo-Json -Depth 10

    $tempJson3 = [System.IO.Path]::GetTempFileName() + ".json"
    [System.IO.File]::WriteAllText($tempJson3, $envJson, $utf8NoBom)

    try {
        $result3 = aws ssm send-command `
            --cli-input-json file://$tempJson3 `
            --region $Region `
            --output json 2>&1 | ConvertFrom-Json
        
        $commandId3 = $result3.Command.CommandId
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
    } finally {
        Remove-Item $tempJson3 -ErrorAction SilentlyContinue
    }
}

# Step 4: Rebuild and restart
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

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
if ([string]::IsNullOrEmpty($SmtpPassword)) {
    Write-Host "1. Update .env file with SMTP password:" -ForegroundColor Yellow
    Write-Host "   SMTP_PASSWORD=your-password" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Restart server:" -ForegroundColor Yellow
    Write-Host "   pm2 restart summit-backend" -ForegroundColor Gray
} else {
    Write-Host "1. Test signup flow to verify emails are sending" -ForegroundColor Yellow
    Write-Host "2. Check server logs: pm2 logs summit-backend" -ForegroundColor Gray
}
Write-Host ""
