# Check AWS Access and SSM Readiness
# This script verifies your AWS setup for SSM access

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   AWS SSM Readiness Check" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allGood = $true

# Check 1: AWS CLI
Write-Host "1. Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "   ✅ AWS CLI installed: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ AWS CLI not found!" -ForegroundColor Red
    Write-Host "   → Install from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 2: Session Manager Plugin
Write-Host "2. Checking Session Manager Plugin..." -ForegroundColor Yellow
try {
    $ssmVersion = session-manager-plugin 2>&1 | Select-String "version"
    Write-Host "   ✅ Session Manager Plugin installed" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Session Manager Plugin not found" -ForegroundColor Yellow
    Write-Host "   → Download from: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 3: AWS Credentials
Write-Host "3. Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json 2>&1 | ConvertFrom-Json
    if ($identity.Account) {
        Write-Host "   ✅ Authenticated successfully!" -ForegroundColor Green
        Write-Host "   Account: $($identity.Account)" -ForegroundColor Gray
        Write-Host "   User/Role: $($identity.Arn)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Not authenticated" -ForegroundColor Red
        Write-Host "   → Run: aws configure" -ForegroundColor Yellow
        $allGood = $false
    }
} catch {
    Write-Host "   ❌ Authentication failed!" -ForegroundColor Red
    Write-Host "   → Run: aws configure" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check 4: Region Configuration
Write-Host "4. Checking AWS region..." -ForegroundColor Yellow
try {
    $region = aws configure get region
    if ($region) {
        Write-Host "   ✅ Region configured: $region" -ForegroundColor Green
        if ($region -ne "eu-west-1") {
            Write-Host "   ⚠️  Note: Your RDS is in eu-west-1" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  No default region set" -ForegroundColor Yellow
        Write-Host "   → Run: aws configure set region eu-west-1" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not determine region" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: EC2 Instances
Write-Host "5. Checking for EC2 instances..." -ForegroundColor Yellow
try {
    $instances = aws ec2 describe-instances `
        --filters "Name=instance-state-name,Values=running" `
        --query "Reservations[].Instances[].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name]" `
        --output json 2>&1 | ConvertFrom-Json
    
    if ($instances.Count -gt 0) {
        Write-Host "   ✅ Found $($instances.Count) running instance(s)" -ForegroundColor Green
        foreach ($inst in $instances) {
            $name = if ($inst[1]) { $inst[1] } else { "(no name)" }
            Write-Host "      • $($inst[0]) - $name" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  No running EC2 instances found" -ForegroundColor Yellow
        Write-Host "   → You may need to create an instance for backend deployment" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not list EC2 instances" -ForegroundColor Yellow
    Write-Host "   Error: $_" -ForegroundColor Gray
}
Write-Host ""

# Check 6: SSM Managed Instances
Write-Host "6. Checking SSM managed instances..." -ForegroundColor Yellow
try {
    $ssmInstances = aws ssm describe-instance-information `
        --output json 2>&1 | ConvertFrom-Json
    
    if ($ssmInstances.InstanceInformationList.Count -gt 0) {
        Write-Host "   ✅ Found $($ssmInstances.InstanceInformationList.Count) SSM-managed instance(s)" -ForegroundColor Green
        foreach ($inst in $ssmInstances.InstanceInformationList) {
            Write-Host "      • $($inst.InstanceId) - $($inst.PlatformName) ($($inst.PingStatus))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  No SSM-managed instances found" -ForegroundColor Yellow
        Write-Host "   → See AWS_SSM_SETUP.md to configure SSM access" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not list SSM instances" -ForegroundColor Yellow
    Write-Host "   Error: $_" -ForegroundColor Gray
}
Write-Host ""

# Check 7: Database Access
Write-Host "7. Checking database connectivity..." -ForegroundColor Yellow
$dbHost = "codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com"
Write-Host "   Database: $dbHost" -ForegroundColor Gray
try {
    $testResult = Test-NetConnection -ComputerName $dbHost -Port 5432 -WarningAction SilentlyContinue
    if ($testResult.TcpTestSucceeded) {
        Write-Host "   ✅ Database is reachable on port 5432" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Cannot reach database (this is normal if you're not on AWS network)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not test database connection" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "   ✅ All Critical Checks Passed!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "You're ready to use SSM! Run:" -ForegroundColor Green
    Write-Host "  .\aws\connect-ssm.ps1`n" -ForegroundColor White
} else {
    Write-Host "   ⚠️  Some Issues Found" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Please resolve the issues marked with ❌ above." -ForegroundColor Yellow
    Write-Host "See AWS_SSM_SETUP.md for detailed instructions.`n" -ForegroundColor White
}

# Provide next steps
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "   - AWS_SSM_SETUP.md - Complete setup guide" -ForegroundColor White
Write-Host "   - aws/README.md - Quick start guide" -ForegroundColor White
Write-Host "   - aws/ssm-commands.md - Command reference" -ForegroundColor White
Write-Host ""

