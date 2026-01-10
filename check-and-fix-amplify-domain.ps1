# Check Amplify Domain Status and Fix Route 53
# Run this AFTER adding the domain in Amplify Console

$appId = "d1mhd5fnnjyucj"
$region = "eu-west-1"
$zoneId = "Z024513220PNY1F3PO6K5"

Write-Host "=== Checking Amplify Domain Status ===" -ForegroundColor Cyan
Write-Host ""

# Check if domain is configured in Amplify
Write-Host "Checking Amplify domains..." -ForegroundColor Cyan
$domains = aws amplify list-domain-associations --app-id $appId --region $region --output json | ConvertFrom-Json

if ($domains.domainAssociations -and $domains.domainAssociations.Count -gt 0) {
    Write-Host "✅ Custom domain configured in Amplify!" -ForegroundColor Green
    Write-Host ""
    
    foreach ($domain in $domains.domainAssociations) {
        Write-Host "Domain: $($domain.domainName)" -ForegroundColor White
        
        if ($domain.domainName -eq "codingeverest.com") {
            # Get detailed domain info
            $domainDetail = aws amplify get-domain-association --app-id $appId --domain-name $domain.domainName --region $region --output json | ConvertFrom-Json
            
            Write-Host "  Subdomains:" -ForegroundColor Cyan
            foreach ($subdomain in $domainDetail.domainAssociation.subDomains) {
                Write-Host "    - $($subdomain.subDomainSetting.prefix) → $($subdomain.subDomainSetting.branchName)" -ForegroundColor White
                
                if ($subdomain.subDomainSetting.prefix -eq "summit") {
                    Write-Host ""
                    Write-Host "  ✅ Found summit subdomain!" -ForegroundColor Green
                    
                    # Get DNS records
                    Write-Host "  DNS Records:" -ForegroundColor Cyan
                    foreach ($dnsRecord in $subdomain.dnsRecord) {
                        Write-Host "    Type: $($dnsRecord.type)" -ForegroundColor White
                        Write-Host "    Name: $($dnsRecord.name)" -ForegroundColor White
                        Write-Host "    Value: $($dnsRecord.value)" -ForegroundColor Green
                        Write-Host ""
                        
                        if ($dnsRecord.type -eq "CNAME") {
                            $cloudFrontUrl = $dnsRecord.value
                            
                            Write-Host "  ✅ CloudFront URL: $cloudFrontUrl" -ForegroundColor Green
                            Write-Host ""
                            
                            # Check Route 53
                            Write-Host "Checking Route 53 record..." -ForegroundColor Cyan
                            $route53Records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Name=='summit.codingeverest.com.']" --output json | ConvertFrom-Json
                            
                            if ($route53Records -and $route53Records.Count -gt 0) {
                                $currentValue = $route53Records[0].ResourceRecords[0].Value
                                
                                Write-Host "  Current Route 53 value: $currentValue" -ForegroundColor Yellow
                                
                                if ($currentValue -ne $cloudFrontUrl) {
                                    Write-Host "  ❌ Route 53 points to wrong URL!" -ForegroundColor Red
                                    Write-Host "  Need to update to: $cloudFrontUrl" -ForegroundColor Yellow
                                    Write-Host ""
                                    
                                    $confirm = Read-Host "Update Route 53 now? (yes/no)"
                                    
                                    if ($confirm -eq "yes") {
                                        # Update Route 53
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
                                        
                                        $changeJson | Out-File -FilePath "route53-update.json" -Encoding ASCII
                                        
                                        Write-Host "  Updating Route 53..." -ForegroundColor Cyan
                                        $changeId = aws route53 change-resource-record-sets --hosted-zone-id $zoneId --change-batch file://route53-update.json --output text --query 'ChangeInfo.Id'
                                        
                                        if ($changeId) {
                                            Write-Host "  ✅ Route 53 updated!" -ForegroundColor Green
                                            Write-Host "  Change ID: $changeId" -ForegroundColor Gray
                                            Write-Host ""
                                            Write-Host "  ⏳ Wait 5-10 minutes for DNS propagation" -ForegroundColor Yellow
                                            Write-Host "  Then: https://summit.codingeverest.com" -ForegroundColor Cyan
                                        } else {
                                            Write-Host "  ❌ Failed to update Route 53" -ForegroundColor Red
                                        }
                                        
                                        Remove-Item "route53-update.json" -ErrorAction SilentlyContinue
                                    }
                                } else {
                                    Write-Host "  ✅ Route 53 is correct!" -ForegroundColor Green
                                    Write-Host ""
                                    Write-Host "  ⏳ Wait 5-10 minutes for DNS propagation" -ForegroundColor Yellow
                                    Write-Host "  Then: https://summit.codingeverest.com" -ForegroundColor Cyan
                                }
                            } else {
                                Write-Host "  ⚠️ Route 53 record not found" -ForegroundColor Yellow
                                Write-Host "  Need to create it..." -ForegroundColor Yellow
                            }
                        }
                    }
                }
            }
        }
    }
} else {
    Write-Host "❌ No custom domain configured in Amplify yet!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please add the domain first:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://console.aws.amazon.com/amplify/home?region=$region#/$appId" -ForegroundColor White
    Write-Host "2. Click 'Domain management'" -ForegroundColor White
    Write-Host "3. Click 'Add domain'" -ForegroundColor White
    Write-Host "4. Enter: codingeverest.com" -ForegroundColor White
    Write-Host "5. Add subdomain: summit" -ForegroundColor White
    Write-Host "6. Save" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use temporary URL (works now):" -ForegroundColor Yellow
    Write-Host "  https://d1mhd5fnnjyucj.amplifyapp.com" -ForegroundColor Cyan
}

