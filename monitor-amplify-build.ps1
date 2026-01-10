# Monitor Amplify Build and Site Status
# Continuously checks build status and tests site accessibility

$summitAppId = "d1mhd5fnnjyucj"
$region = "eu-west-1"
$branchName = "main"
$siteUrl = "https://d1mhd5fnnjyucj.amplifyapp.com/"
$checkInterval = 30
$maxChecks = 20

Write-Host "=== Monitoring Amplify Build and Site ===" -ForegroundColor Cyan
Write-Host "Checking every $checkInterval seconds..." -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

$checkCount = 0
$lastJobId = ""

while ($checkCount -lt $maxChecks) {
    $checkCount++
    $timestamp = Get-Date -Format 'HH:mm:ss'
    
    Write-Host "[$timestamp] Check #$checkCount" -ForegroundColor Cyan
    
    try {
        # Check build status
        $jobs = aws amplify list-jobs --app-id $summitAppId --branch-name $branchName --region $region --max-results 1 --output json 2>&1 | ConvertFrom-Json
        
        if ($jobs.jobSummaries -and $jobs.jobSummaries.Count -gt 0) {
            $latestJob = $jobs.jobSummaries[0]
            $currentJobId = $latestJob.jobId
            $status = $latestJob.status
            
            # Only show new builds
            if ($currentJobId -ne $lastJobId) {
                Write-Host "  Build: $currentJobId" -ForegroundColor White
                Write-Host "  Status: $status" -ForegroundColor $(if($status -eq "SUCCEED"){"Green"}elseif($status -eq "IN_PROGRESS"){"Yellow"}elseif($status -eq "FAILED"){"Red"}else{"Gray"})
                $lastJobId = $currentJobId
            }
            
            if ($status -eq "SUCCEED") {
                Write-Host "`n  ✅ Build succeeded! Testing site..." -ForegroundColor Green
                
                Start-Sleep -Seconds 5
                
                # Test site
                try {
                    $response = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
                    
                    if ($response.StatusCode -eq 200) {
                        Write-Host "`n  🎉 SUCCESS! Site is accessible!" -ForegroundColor Green
                        Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Green
                        Write-Host "  Content Length: $($response.Content.Length) bytes" -ForegroundColor White
                        
                        if ($response.Content -match "Summit") {
                            Write-Host "  ✅ Found 'Summit' in content - login page is working!" -ForegroundColor Green
                        }
                        
                        Write-Host "`n  ✅ Site URL: $siteUrl" -ForegroundColor Green
                        Write-Host "`n  Monitoring complete - site is working!" -ForegroundColor Cyan
                        break
                    } else {
                        Write-Host "  ⚠️  Unexpected status code: $($response.StatusCode)" -ForegroundColor Yellow
                    }
                } catch {
                    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
                        Write-Host "  ❌ Still getting 404 - build succeeded but files not deployed" -ForegroundColor Red
                    } else {
                        Write-Host "  ⚠️  Error testing site: $_" -ForegroundColor Yellow
                    }
                }
            } elseif ($status -eq "FAILED") {
                Write-Host "`n  ❌ Build failed!" -ForegroundColor Red
                Write-Host "  Check logs: https://console.aws.amazon.com/amplify/home?region=$region#/$summitAppId/$branchName/$currentJobId" -ForegroundColor Cyan
            } elseif ($status -eq "IN_PROGRESS") {
                Write-Host "  ⏳ Build in progress..." -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠️  No builds found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ Error checking status: $_" -ForegroundColor Red
    }
    
    if ($checkCount -lt $maxChecks) {
        Write-Host "  Waiting $checkInterval seconds...`n" -ForegroundColor Gray
        Start-Sleep -Seconds $checkInterval
    }
}

if ($checkCount -ge $maxChecks) {
    Write-Host "`n⏱️  Maximum checks reached. Monitoring stopped." -ForegroundColor Yellow
    Write-Host "Check manually: https://console.aws.amazon.com/amplify/home?region=$region#/$summitAppId/builds" -ForegroundColor Cyan
}

