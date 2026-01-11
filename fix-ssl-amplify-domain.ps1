# Fix SSL Certificate by Re-adding Domain in Amplify
# Note: Amplify domain management must be done via AWS Console
# This script provides instructions and can help with DNS records

$appId = "d1mhd5fnnjyucj"
$domain = "summit.codingeverest.com"
$region = "eu-west-1"
$zoneId = "Z024513220PNY1F3PO6K5"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Fix SSL Certificate for $domain" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get current domain status
Write-Host "[Step 1] Checking current domain status..." -ForegroundColor Green
try {
    $domainInfo = aws amplify list-domain-associations --app-id $appId --region $region --output json | ConvertFrom-Json
    $currentDomain = $domainInfo.domainAssociations | Where-Object { $_.domainName -eq $domain }
    
    if ($currentDomain) {
        Write-Host "✅ Domain found: $($currentDomain.domainName)" -ForegroundColor Green
        Write-Host "   Status: $($currentDomain.domainStatus)" -ForegroundColor $(if ($currentDomain.domainStatus -eq "FAILED") { "Red" } else { "Yellow" })
        
        if ($currentDomain.domainStatus -eq "FAILED") {
            Write-Host ""
            Write-Host "⚠️  Domain status is FAILED - needs to be re-added" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "============================================" -ForegroundColor Cyan
            Write-Host "MANUAL STEPS REQUIRED (AWS Console)" -ForegroundColor Yellow
            Write-Host "============================================" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Amplify domain management must be done via AWS Console:" -ForegroundColor White
            Write-Host ""
            Write-Host "1. REMOVE DOMAIN:" -ForegroundColor Cyan
            Write-Host "   - Go to: https://console.aws.amazon.com/amplify/home?region=$region#/$appId" -ForegroundColor White
            Write-Host "   - Click 'Domain management' (left sidebar)" -ForegroundColor White
            Write-Host "   - Click on '$domain'" -ForegroundColor White
            Write-Host "   - Click 'Remove domain' or delete it" -ForegroundColor White
            Write-Host "   - Wait 2-3 minutes" -ForegroundColor White
            Write-Host ""
            Write-Host "2. RE-ADD DOMAIN:" -ForegroundColor Cyan
            Write-Host "   - Click 'Add domain'" -ForegroundColor White
            Write-Host "   - Enter: $domain" -ForegroundColor White
            Write-Host "   - Click 'Configure domain'" -ForegroundColor White
            Write-Host "   - Select branch: main (or your default branch)" -ForegroundColor White
            Write-Host "   - Click 'Save'" -ForegroundColor White
            Write-Host ""
            Write-Host "3. ADD VALIDATION DNS RECORD:" -ForegroundColor Cyan
            Write-Host "   - Amplify will show a CNAME record for validation" -ForegroundColor White
            Write-Host "   - Copy the record details" -ForegroundColor White
            Write-Host "   - Run this script again with -AddValidationRecord parameter" -ForegroundColor White
            Write-Host "   - Or manually add to Route 53" -ForegroundColor White
            Write-Host ""
            Write-Host "4. WAIT FOR CERTIFICATE:" -ForegroundColor Cyan
            Write-Host "   - AWS will automatically validate (10-30 minutes)" -ForegroundColor White
            Write-Host "   - Certificate will be automatically attached" -ForegroundColor White
            Write-Host "   - Run this script again to check status" -ForegroundColor White
            Write-Host ""
            Write-Host "============================================" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "After you've re-added the domain in Console, press any key to continue..." -ForegroundColor Yellow
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
    } else {
        Write-Host "❌ Domain not found in Amplify" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error checking domain: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Check if domain was removed and can be monitored
Write-Host ""
Write-Host "[Step 2] Checking if domain needs to be added..." -ForegroundColor Green
try {
    $domainInfo = aws amplify list-domain-associations --app-id $appId --region $region --output json | ConvertFrom-Json
    $currentDomain = $domainInfo.domainAssociations | Where-Object { $_.domainName -eq $domain }
    
    if (-not $currentDomain) {
        Write-Host "✅ Domain has been removed - ready to be re-added in Console" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please re-add the domain in Amplify Console (see instructions above)" -ForegroundColor Yellow
    } else {
        Write-Host "Domain still exists with status: $($currentDomain.domainStatus)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Script complete" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

