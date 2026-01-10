# Quick monitoring script - checks every 30 seconds
$summitAppId = "d1mhd5fnnjyucj"
$region = "eu-west-1"

Write-Host "Monitoring Summit domain... (Press Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host ""

$checkCount = 0

while ($true) {
    $checkCount++
    $timestamp = Get-Date -Format 'HH:mm:ss'
    
    try {
        $domainDetail = aws amplify get-domain-association --app-id $summitAppId --domain-name "summit.codingeverest.com" --region $region --output json | ConvertFrom-Json
        
        $domainStatus = $domainDetail.domainAssociation.domainStatus
        
        Write-Host "[$timestamp] Check #$checkCount - Status: $domainStatus" -ForegroundColor $(if($domainStatus -eq "AVAILABLE"){"Green"}elseif($domainStatus -eq "AWAITING_APP_CNAME"){"Yellow"}else{"Red"})
        
        # Check for DNS records
        $hasDNSRecords = $false
        foreach ($subdomain in $domainDetail.domainAssociation.subDomains) {
            if ($subdomain.dnsRecord) {
                foreach ($dnsRecord in $subdomain.dnsRecord) {
                    if ($dnsRecord.type -and $dnsRecord.value -and $dnsRecord.value -ne "") {
                        $hasDNSRecords = $true
                        Write-Host "  Found DNS Record:" -ForegroundColor Green
                        Write-Host "    Type: $($dnsRecord.type)" -ForegroundColor White
                        Write-Host "    Name: $($dnsRecord.name)" -ForegroundColor White
                        Write-Host "    Value: $($dnsRecord.value)" -ForegroundColor Green
                        
                        # Check if we need to update Route 53
                        if ($dnsRecord.type -eq "CNAME" -and ($dnsRecord.name -eq "summit.codingeverest.com" -or $dnsRecord.name -like "*summit*")) {
                            $zoneId = "Z024513220PNY1F3PO6K5"
                            $route53Records = aws route53 list-resource-record-sets --hosted-zone-id $zoneId --query "ResourceRecordSets[?Name=='summit.codingeverest.com.']" --output json | ConvertFrom-Json
                            
                            if ($route53Records -and $route53Records.Count -gt 0) {
                                $currentValue = $route53Records[0].ResourceRecords[0].Value
                                
                                if ($currentValue -ne $dnsRecord.value) {
                                    Write-Host "`n  Updating Route 53..." -ForegroundColor Yellow
                                    Write-Host "    Current: $currentValue" -ForegroundColor Gray
                                    Write-Host "    New: $($dnsRecord.value)" -ForegroundColor Green
                                    
                                    $changeJson = '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"summit.codingeverest.com","Type":"CNAME","TTL":300,"ResourceRecords":[{"Value":"' + $dnsRecord.value + '"}]}}]}'
                                    $changeJson | Out-File -FilePath "route53-temp.json" -Encoding ASCII -NoNewline
                                    
                                    $changeId = aws route53 change-resource-record-sets --hosted-zone-id $zoneId --change-batch file://route53-temp.json --output text --query 'ChangeInfo.Id'
                                    
                                    if ($changeId) {
                                        Write-Host "    Route 53 updated! Change ID: $changeId" -ForegroundColor Green
                                    }
                                    
                                    Remove-Item "route53-temp.json" -ErrorAction SilentlyContinue
                                }
                            }
                        }
                        
                        Write-Host ""
                    }
                }
            }
        }
        
        if (-not $hasDNSRecords) {
            Write-Host "  DNS records still being generated..." -ForegroundColor Yellow
        }
        
        # Check if domain is ready
        if ($domainStatus -eq "AVAILABLE") {
            Write-Host "`n  SUCCESS! Domain is AVAILABLE!" -ForegroundColor Green
            Write-Host "  https://summit.codingeverest.com should be working!" -ForegroundColor Green
            Write-Host "`nMonitoring complete!" -ForegroundColor Cyan
            break
        }
        
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
    
    Write-Host "  Waiting 30 seconds...`n" -ForegroundColor Gray
    Start-Sleep -Seconds 30
}

