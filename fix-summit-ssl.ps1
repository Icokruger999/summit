# Fix SSL Certificate for summit.codingeverest.com
# This script helps configure the domain in Amplify

$appId = "d1mhd5fnnjyucj"
$region = "eu-west-1"
$domain = "summit.codingeverest.com"
$rootDomain = "codingeverest.com"
$subdomain = "summit"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Fix SSL Certificate for Summit Domain" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "App ID: $appId" -ForegroundColor Yellow
Write-Host "Domain: $domain" -ForegroundColor Yellow
Write-Host ""

# Check current domain associations
Write-Host "[1/3] Checking current domain configuration..." -ForegroundColor Green
try {
    $domains = aws amplify list-domain-associations --app-id $appId --region $region --output json 2>$null | ConvertFrom-Json
    if ($domains.domainAssociations -and $domains.domainAssociations.Count -gt 0) {
        Write-Host "✅ Found domain associations:" -ForegroundColor Green
        $domains.domainAssociations | ForEach-Object {
            Write-Host "  - $($_.domainName)" -ForegroundColor White
            if ($_.subDomainSettings) {
                $_.subDomainSettings | ForEach-Object {
                    Write-Host "    └─ $($_.prefix).$($_.domainName)" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "❌ No domains configured in Amplify!" -ForegroundColor Red
        Write-Host ""
        Write-Host "This is why SSL is failing." -ForegroundColor Yellow
        Write-Host "You need to add the domain in Amplify Console." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Manual Steps:" -ForegroundColor Cyan
        Write-Host "1. Go to: https://console.aws.amazon.com/amplify/home?region=$region#/$appId" -ForegroundColor White
        Write-Host "2. Click 'Domain management' (left sidebar)" -ForegroundColor White
        Write-Host "3. Click 'Add domain'" -ForegroundColor White
        Write-Host "4. Enter: $rootDomain" -ForegroundColor White
        Write-Host "5. Click 'Configure domain'" -ForegroundColor White
        Write-Host "6. Click 'Add subdomain'" -ForegroundColor White
        Write-Host "7. Prefix: $subdomain" -ForegroundColor White
        Write-Host "8. Branch: main (or your default branch)" -ForegroundColor White
        Write-Host "9. Click 'Save'" -ForegroundColor White
        Write-Host ""
        Write-Host "Amplify will:" -ForegroundColor Cyan
        Write-Host "  - Request SSL certificate (10-30 minutes)" -ForegroundColor White
        Write-Host "  - Provide CloudFront URL (may need to update Route 53)" -ForegroundColor White
        Write-Host "  - Enable HTTPS automatically" -ForegroundColor White
    }
} catch {
    Write-Host "Could not check domain associations. Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2/3] Checking Route 53 DNS record..." -ForegroundColor Green
$zoneId = "Z024513220PNY1F3PO6K5"
try {
    $records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Name=='$domain.']" --output json | ConvertFrom-Json
    if ($records) {
        Write-Host "✅ Current DNS record:" -ForegroundColor Green
        Write-Host "  Type: $($records[0].Type)" -ForegroundColor White
        Write-Host "  Value: $($records[0].ResourceRecords[0].Value)" -ForegroundColor White
        Write-Host ""
        if ($records[0].ResourceRecords[0].Value -like "*.amplifyapp.com") {
            Write-Host "⚠️  Note: This points to Amplify default URL" -ForegroundColor Yellow
            Write-Host "   After adding domain in Amplify, you may need to update this" -ForegroundColor Yellow
            Write-Host "   to point to the CloudFront URL that Amplify provides." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ No DNS record found for $domain" -ForegroundColor Red
    }
} catch {
    Write-Host "Could not check DNS records. Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/3] Testing SSL connection..." -ForegroundColor Green
try {
    $test = Invoke-WebRequest -Uri "https://$domain" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($test.StatusCode -eq 200) {
        Write-Host "✅ HTTPS is working!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ HTTPS connection failed (expected if SSL not configured)" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Add domain in Amplify Console (see steps above)" -ForegroundColor Yellow
Write-Host "2. Wait for SSL certificate (10-30 minutes)" -ForegroundColor Yellow
Write-Host "3. Update Route 53 if Amplify provides CloudFront URL" -ForegroundColor Yellow
Write-Host "4. Wait for DNS propagation (5-10 minutes)" -ForegroundColor Yellow
Write-Host "5. Test: https://$domain" -ForegroundColor Yellow
Write-Host ""
Write-Host "Temporary workaround:" -ForegroundColor Cyan
Write-Host "  Use: https://d1mhd5fnnjyucj.amplifyapp.com" -ForegroundColor White
Write-Host "  (This works immediately with SSL)" -ForegroundColor Gray
Write-Host ""

