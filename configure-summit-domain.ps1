# Configure summit.codingeverest.com directly in Summit Amplify app
# This is separate from the milo app

$summitAppId = "d1mhd5fnnjyucj"
$region = "eu-west-1"

Write-Host "=== Configure Summit Custom Domain ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Separate apps:" -ForegroundColor Green
Write-Host "   - www.codingeverest.com -> Landing page (milo app)" -ForegroundColor White
Write-Host "   - summit.codingeverest.com -> Summit app (separate)" -ForegroundColor White
Write-Host ""

# Check current domain status
Write-Host "Checking current Summit app domains..." -ForegroundColor Cyan
$domains = aws amplify list-domain-associations --app-id $summitAppId --region $region --output json | ConvertFrom-Json

if ($domains.domainAssociations -and $domains.domainAssociations.Count -gt 0) {
    Write-Host "Found domains in Summit app:" -ForegroundColor Green
    foreach ($domain in $domains.domainAssociations) {
        Write-Host "   - $($domain.domainName)" -ForegroundColor White
        
        if ($domain.domainName -eq "codingeverest.com" -or $domain.domainName -eq "summit.codingeverest.com") {
            Write-Host "     Domain already configured!" -ForegroundColor Green
            
            $domainDetail = aws amplify get-domain-association --app-id $summitAppId --domain-name $domain.domainName --region $region --output json | ConvertFrom-Json
            
            $status = $domainDetail.domainAssociation.domainStatus
            $color = if($status -eq "AVAILABLE"){"Green"}else{"Yellow"}
            Write-Host "     Status: $status" -ForegroundColor $color
            
            foreach ($subdomain in $domainDetail.domainAssociation.subDomains) {
                Write-Host "       - $($subdomain.subDomainSetting.prefix) -> $($subdomain.subDomainSetting.branchName)" -ForegroundColor Gray
                Write-Host "         Status: $($subdomain.subDomainStatus)" -ForegroundColor $(if($subdomain.subDomainStatus -eq "AVAILABLE"){"Green"}else{"Yellow"})
                
                if ($subdomain.dnsRecord) {
                    foreach ($dnsRecord in $subdomain.dnsRecord) {
                        Write-Host "         DNS: $($dnsRecord.name) -> $($dnsRecord.value)" -ForegroundColor Cyan
                    }
                }
            }
        }
    }
} else {
    Write-Host "No custom domain configured in Summit app yet" -ForegroundColor Red
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to AWS Amplify Console:" -ForegroundColor Cyan
    Write-Host "   https://console.aws.amazon.com/amplify/home?region=$region#/$summitAppId" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Click 'Domain management' (left sidebar)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Click 'Add domain'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Try Option A (recommended):" -ForegroundColor Yellow
    Write-Host "   Enter: summit.codingeverest.com" -ForegroundColor White
    Write-Host "   (Since root domain is verified via milo app, this should work)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. If Option A doesn't work, try Option B:" -ForegroundColor Yellow
    Write-Host "   Enter: codingeverest.com" -ForegroundColor White
    Write-Host "   Then click 'Add subdomain'" -ForegroundColor White
    Write-Host "   Prefix: summit" -ForegroundColor White
    Write-Host "   Branch: main (or your branch)" -ForegroundColor White
    Write-Host ""
    Write-Host "6. Amplify will verify the domain and create SSL certificate (10-30 minutes)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "7. If Amplify shows a CloudFront URL, update Route 53 to point to it" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "8. Wait for DNS propagation (5-10 minutes)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "9. Test: https://summit.codingeverest.com" -ForegroundColor Green
    Write-Host ""
    Write-Host "--- OR ---" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Use default URL (works immediately):" -ForegroundColor Yellow
    Write-Host "   https://d1mhd5fnnjyucj.amplifyapp.com" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Add to landing page:" -ForegroundColor Yellow
    Write-Host '   <a href="https://d1mhd5fnnjyucj.amplifyapp.com">Login to Summit</a>' -ForegroundColor White
}

Write-Host ""
Write-Host "Current Route 53 record:" -ForegroundColor Cyan
$zoneId = "Z024513220PNY1F3PO6K5"
$route53Records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Name=='summit.codingeverest.com.']" --output json | ConvertFrom-Json

if ($route53Records -and $route53Records.Count -gt 0) {
    Write-Host "   summit.codingeverest.com -> $($route53Records[0].ResourceRecords[0].Value)" -ForegroundColor Green
} else {
    Write-Host "   Route 53 record not found" -ForegroundColor Red
}
