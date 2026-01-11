# Monitor SSL Certificate Status
# Checks domain status and certificate validation progress

$appId = "d1mhd5fnnjyucj"
$domain = "summit.codingeverest.com"
$region = "eu-west-1"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Monitoring SSL Certificate Status" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$maxAttempts = 30  # Check for up to 30 minutes
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "[Check $attempt/$maxAttempts] Checking domain status..." -ForegroundColor Cyan
    
    try {
        $domainInfo = aws amplify get-domain-association --app-id $appId --domain-name $domain --region $region --output json | ConvertFrom-Json
        $status = $domainInfo.domainAssociation.domainStatus
        $statusReason = $domainInfo.domainAssociation.statusReason
        
        Write-Host "Status: $status" -ForegroundColor $(switch ($status) {
            "AVAILABLE" { "Green" }
            "PENDING_VERIFICATION" { "Yellow" }
            "PENDING_DEPLOYMENT" { "Yellow" }
            "FAILED" { "Red" }
            default { "White" }
        })
        
        if ($statusReason) {
            Write-Host "Reason: $statusReason" -ForegroundColor Gray
        }
        
        if ($status -eq "AVAILABLE") {
            Write-Host ""
            Write-Host "✅✅✅ SSL Certificate is READY! ✅✅✅" -ForegroundColor Green
            Write-Host ""
            Write-Host "Domain Status: AVAILABLE" -ForegroundColor Green
            Write-Host "HTTPS should now be working!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Test it: https://$domain" -ForegroundColor Cyan
            break
        } elseif ($status -eq "FAILED") {
            Write-Host ""
            Write-Host "❌ Domain status is FAILED" -ForegroundColor Red
            Write-Host "Reason: $statusReason" -ForegroundColor Red
            break
        } else {
            Write-Host "⏳ Still waiting... (Status: $status)" -ForegroundColor Yellow
            Write-Host "This can take 10-30 minutes. Waiting 60 seconds before next check..." -ForegroundColor Gray
            Write-Host ""
            Start-Sleep -Seconds 60
        }
    } catch {
        Write-Host "❌ Error checking status: $_" -ForegroundColor Red
        break
    }
}

if ($attempt -ge $maxAttempts) {
    Write-Host ""
    Write-Host "⚠️  Maximum checks reached. Status may still be pending." -ForegroundColor Yellow
    Write-Host "Check manually in Amplify Console:" -ForegroundColor Cyan
    Write-Host "https://console.aws.amazon.com/amplify/home?region=$region#/$appId" -ForegroundColor Gray
}

Write-Host ""

