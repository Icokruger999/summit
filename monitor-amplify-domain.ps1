# Monitor Summit Amplify Domain Status
# Checks every 30 seconds until domain is fully configured

$summitAppId = "d1mhd5fnnjyucj"
$region = "eu-west-1"
$checkInterval = 30
$maxChecks = 60  # 30 minutes max

Write-Host "=== Monitoring Summit Amplify Domain ===" -ForegroundColor Cyan
Write-Host "Checking every $checkInterval seconds..." -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

$checkCount = 0
$lastStatus = ""

while ($checkCount -lt $maxChecks) {
    $checkCount++
    Write-Host "[Check $checkCount] $(Get-Date -Format 'HH:mm:ss') - Checking domain status..." -ForegroundColor Cyan
    
    try {
        $domains = aws amplify list-domain-associations --app-id $summitAppId --region $region --output json | ConvertFrom-Json
        
        if ($domains.domainAssociations -and $domains.domainAssociations.Count -gt 0) {
            foreach ($domain in $domains.domainAssociations) {
                $domainName = $domain.domainName
                $domainStatus = $domain.domainStatus
                
                Write-Host "`n  Domain: $domainName" -ForegroundColor White
                Write-Host "  Status: $domainStatus" -ForegroundColor $(if($domainStatus -eq "AVAILABLE"){"Green"}elseif($domainStatus -eq "PENDING_VERIFICATION"){"Yellow"}elseif($domainStatus -eq "PENDING_DEPLOYMENT"){"Yellow"}else{"Red"})
                
                # Get detailed info
                $domainDetail = aws amplify get-domain-association --app-id $summitAppId --domain-name $domainName --region $region --output json | ConvertFrom-Json
                
                foreach ($subdomain in $domainDetail.domainAssociation.subDomains) {
                    $prefix = $subdomain.subDomainSetting.prefix
                    $branch = $subdomain.subDomainSetting.branchName
                    $subdomainStatus = $subdomain.subDomainStatus
                    $dnsRecords = $subdomain.dnsRecord
                    
                    Write-Host "`n  Subdomain: $prefix -> $branch" -ForegroundColor Cyan
                    Write-Host "  Status: $subdomainStatus" -ForegroundColor $(if($subdomainStatus -eq "AVAILABLE"){"Green"}elseif($subdomainStatus -eq "PENDING_DEPLOYMENT"){"Yellow"}elseif($subdomainStatus -eq "PENDING_VERIFICATION"){"Yellow"}elseif($subdomainStatus -eq "PENDING_SSL_CERTIFICATE"){"Yellow"}else{"Red"})
                    
                    if ($dnsRecords) {
                        Write-Host "`n  DNS Records:" -ForegroundColor Cyan
                        foreach ($dnsRecord in $dnsRecords) {
                            Write-Host "    Type: $($dnsRecord.type)" -ForegroundColor Gray
                            Write-Host "    Name: $($dnsRecord.name)" -ForegroundColor Gray
                            Write-Host "    Value: $($dnsRecord.value)" -ForegroundColor Green
                            
                            # Check if Route 53 needs update
                            if ($dnsRecord.type -eq "CNAME" -and $dnsRecord.name -eq "summit.codingeverest.com") {
                                Write-Host "`n  ⚠️  Checking Route 53..." -ForegroundColor Yellow
                                
                                $zoneId = "Z024513220PNY1F3PO6K5"
                                $route53Records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Name=='summit.codingeverest.com.']" --output json | ConvertFrom-Json
                                
                                if ($route53Records -and $route53Records.Count -gt 0) {
                                    $currentValue = $route53Records[0].ResourceRecords[0].Value
                                    
                                    if ($currentValue -ne $dnsRecord.value) {
                                        Write-Host "    ⚠️  Route 53 needs update!" -ForegroundColor Red
                                        Write-Host "    Current: $currentValue" -ForegroundColor Yellow
                                        Write-Host "    Should be: $($dnsRecord.value)" -ForegroundColor Green
                                        Write-Host "`n    Updating Route 53..." -ForegroundColor Cyan
                                        
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
                                                                Value = $dnsRecord.value
                                                            }
                                                        )
                                                    }
                                                }
                                            )
                                        } | ConvertTo-Json -Depth 10
                                        
                                        $changeJson | Out-File -FilePath "route53-update-$(Get-Date -Format 'yyyyMMddHHmmss').json" -Encoding ASCII
                                        
                                        $changeId = aws route53 change-resource-record-sets --hosted-zone-id $zoneId --change-batch file:"route53-update-$(Get-Date -Format 'yyyyMMddHHmmss').json" --output text --query 'ChangeInfo.Id'
                                        
                                        if ($changeId) {
                                            Write-Host "    ✅ Route 53 updated! Change ID: $changeId" -ForegroundColor Green
                                        }
                                    } else {
                                        Write-Host "    ✅ Route 53 is correct!" -ForegroundColor Green
                                    }
                                }
                            }
                        }
                    }
                    
                    # Check if ready
                    if ($subdomainStatus -eq "AVAILABLE") {
                        Write-Host "`n  🎉 SUCCESS! Domain is AVAILABLE!" -ForegroundColor Green
                        Write-Host "  ✅ https://summit.codingeverest.com should be working!" -ForegroundColor Green
                        Write-Host "`n  Monitoring stopped - domain is ready!" -ForegroundColor Cyan
                        exit 0
                    }
                }
            }
            
            # Check if status changed
            $currentStatus = ($domains.domainAssociations | ForEach-Object { $_.domainStatus }) -join ", "
            if ($currentStatus -ne $lastStatus) {
                Write-Host "`n  Status changed: $lastStatus -> $currentStatus" -ForegroundColor Yellow
                $lastStatus = $currentStatus
            }
        } else {
            Write-Host "  ⏳ Domain not found yet - still processing..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ Error checking status: $_" -ForegroundColor Red
    }
    
    if ($checkCount -lt $maxChecks) {
        Write-Host "`n  Waiting $checkInterval seconds before next check...`n" -ForegroundColor Gray
        Start-Sleep -Seconds $checkInterval
    }
}

Write-Host "`n  ⏱️  Maximum checks reached. Status monitoring stopped." -ForegroundColor Yellow
Write-Host "  You can check manually in AWS Amplify Console" -ForegroundColor Gray

