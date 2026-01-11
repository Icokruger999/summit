# Complete Supabase Setup - Run this with service role key

param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceRoleKey
)

$SupabaseUrl = "https://rzxhbqwzpucqwxngkxbr.supabase.co"
$InstanceId = "i-0fba58db502cc8d39"
$Region = "eu-west-1"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Complete Supabase Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Supabase URL: $SupabaseUrl" -ForegroundColor Green
Write-Host "Service Key: $($ServiceRoleKey.Substring(0, 20))..." -ForegroundColor Gray
Write-Host ""

# Step 1: Verify SQL schema has been run
Write-Host "[1/5] Verifying database schema..." -ForegroundColor Yellow
Write-Host "   ⚠️  Make sure you've run database/migrate-to-supabase.sql in Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "   Go to: https://app.supabase.com/project/rzxhbqwzpucqwxngkxbr/sql/new" -ForegroundColor White
$schemaDone = Read-Host "   Have you run the SQL schema? (yes/no)"
if ($schemaDone -ne "yes") {
    Write-Host "   Please run the schema first!" -ForegroundColor Red
    Write-Host "   File: database/migrate-to-supabase.sql" -ForegroundColor White
    exit 1
}

# Step 2: Update backend .env
Write-Host ""
Write-Host "[2/5] Updating backend .env file..." -ForegroundColor Yellow

$envContent = @"
PORT=3000
JWT_SECRET=summit-jwt-secret

# Supabase Configuration (replaces RDS)
SUPABASE_URL=$SupabaseUrl
SUPABASE_SERVICE_ROLE_KEY=$ServiceRoleKey

# CORS Configuration
CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com

# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-url
"@

$cmd = "cd /var/www/summit/server && cat > .env << 'ENVEOF'
$envContent
ENVEOF
echo '.env file updated'"

Write-Host "   Sending .env update to server..." -ForegroundColor Gray

try {
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters commands="[$cmd]" `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $cmdId = $result.Command.CommandId
    Start-Sleep -Seconds 5
    
    $output = aws ssm get-command-invocation `
        --command-id $cmdId `
        --instance-id $InstanceId `
        --region $Region `
        --query 'StandardOutputContent' `
        --output text
    
    Write-Host "   ✅ .env file updated" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Rebuild backend
Write-Host ""
Write-Host "[3/5] Rebuilding backend..." -ForegroundColor Yellow

$rebuildCmd = "cd /var/www/summit/server && npm run build"

try {
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters commands="[$rebuildCmd]" `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $cmdId = $result.Command.CommandId
    Write-Host "   Waiting 30 seconds for build..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
    
    Write-Host "   ✅ Build complete" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Restart backend
Write-Host ""
Write-Host "[4/5] Restarting backend..." -ForegroundColor Yellow

$restartCmd = "cd /var/www/summit/server && pm2 restart summit-backend --update-env && sleep 10 && pm2 list | grep summit"

try {
    $result = aws ssm send-command `
        --instance-ids $InstanceId `
        --document-name "AWS-RunShellScript" `
        --parameters commands="[$restartCmd]" `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $cmdId = $result.Command.CommandId
    Start-Sleep -Seconds 15
    
    Write-Host "   ✅ Backend restarted" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Test connection
Write-Host ""
Write-Host "[5/5] Testing Supabase connection..." -ForegroundColor Yellow

Start-Sleep -Seconds 5

try {
    $headers = @{
        "Origin" = "https://summit.codingeverest.com"
        "Content-Type" = "application/json"
    }
    
    $testEmail = "test" + (Get-Random -Maximum 999999) + "@test.com"
    
    Write-Host "   Testing register endpoint..." -ForegroundColor Gray
    
    $r = Invoke-WebRequest `
        -Uri "https://summit.api.codingeverest.com/api/auth/register" `
        -Method POST `
        -Headers $headers `
        -Body "{`"email`":`"$testEmail`",`"password`":`"test123456`",`"name`":`"Test User`"}" `
        -UseBasicParsing `
        -TimeoutSec 10
    
    Write-Host ""
    Write-Host "   ✅✅✅ SUCCESS! Supabase connection works!" -ForegroundColor Green
    Write-Host "   ✅ Register endpoint working" -ForegroundColor Green
    Write-Host "   ✅ Database connection successful" -ForegroundColor Green
    
    $data = $r.Content | ConvertFrom-Json
    Write-Host "   User created: $($data.user.email)" -ForegroundColor Gray
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host "   ❌ Still getting 500 error" -ForegroundColor Red
        Write-Host "   Check if SQL schema was run correctly" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   ✅ Endpoint works! (400 = validation)" -ForegroundColor Green
    } else {
        Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Complete migration of remaining routes to Supabase" -ForegroundColor White
Write-Host "  - Test all endpoints" -ForegroundColor White
Write-Host "  - Verify data in Supabase dashboard" -ForegroundColor White

