# Add summit subdomain to milo app (which owns codingeverest.com)
# Then check and update Route 53

Write-Host "=== Add Summit Subdomain to Milo App ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will help you add 'summit' subdomain to the milo app." -ForegroundColor Yellow
Write-Host "Note: You need to add it manually in Amplify Console first!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Steps:" -ForegroundColor Cyan
Write-Host "1. Go to: https://console.aws.amazon.com/amplify/home?region=eu-west-1#/ddp21ao3xntn4" -ForegroundColor White
Write-Host "2. Click 'Domain management'" -ForegroundColor White
Write-Host "3. Find 'codingeverest.com'" -ForegroundColor White
Write-Host "4. Click 'Add subdomain'" -ForegroundColor White
Write-Host "5. Enter prefix: summit" -ForegroundColor White
Write-Host "6. Select branch (main/master)" -ForegroundColor White
Write-Host "7. Click 'Save'" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter after you've added the subdomain in Amplify Console..." -ForegroundColor Cyan
Read-Host

# Check if subdomain was added
Write-Host "`nChecking if subdomain was added..." -ForegroundColor Cyan

$miloAppId = "ddp21ao3xntn4"
$region = "eu-west-1"

$domainDetail = aws amplify get-domain-association --app-id $miloAppId --domain-name "codingeverest.com" --region $region --output json | ConvertFrom-Json

$summitSubdomain = $domainDetail.domainAssociation.subDomains | Where-Object { $_.subDomainSetting.prefix -eq "summit" }

if ($summitSubdomain) {
    Write-Host "✅ Summit subdomain found!" -ForegroundColor Green
    Write-Host ""
    
    # Get DNS record
    $cnameRecord = $summitSubdomain.dnsRecord | Where-Object { $_.type -eq "CNAME" }
    
    if ($cnameRecord) {
        $cloudFrontUrl = $cnameRecord.value
        Write-Host "CloudFront URL: $cloudFrontUrl" -ForegroundColor Green
        Write-Host ""
        
        # Check Route 53
        Write-Host "Checking Route 53..." -ForegroundColor Cyan
        $zoneId = "Z024513220PNY1F3PO6K5"
        $route53Records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Name=='summit.codingeverest.com.']" --output json | ConvertFrom-Json
        
        if ($route53Records -and $route53Records.Count -gt 0) {
            $currentValue = $route53Records[0].ResourceRecords[0].Value
            
            Write-Host "Current Route 53 value: $currentValue" -ForegroundColor Yellow
            
            if ($currentValue -ne $cloudFrontUrl) {
                Write-Host "Updating Route 53 to: $cloudFrontUrl" -ForegroundColor Cyan
                
                $changeJson = @{
                    Changes = @(
                        @{
                            Action = "UPSERT"
                            ResourceRecordSet = @{
                                Name = "summit.codingeverest.com"
                                Type = "CNAME"
                                TTL = 300
                                ResourceRecords = @(
                                    @{
                                        Value = $cloudFrontUrl
                                    }
                                )
                            }
                        }
                    )
                } | ConvertTo-Json -Depth 10
                
                $changeJson | Out-File -FilePath "route53-summit-fix.json" -Encoding ASCII
                
                $changeId = aws route53 change-resource-record-sets --hosted-zone-id $zoneId --change-batch file://route53-summit-fix.json --output text --query 'ChangeInfo.Id'
                
                if ($changeId) {
                    Write-Host "✅ Route 53 updated!" -ForegroundColor Green
                    Write-Host "Change ID: $changeId" -ForegroundColor Gray
                    Write-Host ""
                    Write-Host "⏳ Wait 5-10 minutes for DNS propagation" -ForegroundColor Yellow
                    Write-Host "Then: https://summit.codingeverest.com" -ForegroundColor Cyan
                }
                
                Remove-Item "route53-summit-fix.json" -ErrorAction SilentlyContinue
            } else {
                Write-Host "✅ Route 53 is already correct!" -ForegroundColor Green
                Write-Host ""
                Write-Host "⏳ Wait 5-10 minutes for DNS propagation" -ForegroundColor Yellow
                Write-Host "Then: https://summit.codingeverest.com" -ForegroundColor Cyan
            }
        }
    }
} else {
    Write-Host "❌ Summit subdomain not found yet!" -ForegroundColor Red
    Write-Host "Please add it in Amplify Console first." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or use the default URL (works immediately):" -ForegroundColor Yellow
    Write-Host "https://d1mhd5fnnjyucj.amplifyapp.com" -ForegroundColor Cyan
}

