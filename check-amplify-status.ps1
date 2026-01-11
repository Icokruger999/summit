# PowerShell Script to Check Amplify Status
# Requires AWS CLI to be installed and configured

Write-Host "=== Checking AWS Amplify Status ===" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI is not installed!" -ForegroundColor Red
    Write-Host "   Install from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ AWS CLI found" -ForegroundColor Green
Write-Host ""

# List Amplify apps
Write-Host "📋 Listing Amplify Apps..." -ForegroundColor Yellow
try {
    $apps = aws amplify list-apps --output json | ConvertFrom-Json
    if ($apps.apps.Count -eq 0) {
        Write-Host "❌ No Amplify apps found" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Found $($apps.apps.Count) app(s):" -ForegroundColor Green
    foreach ($app in $apps.apps) {
        Write-Host ""
        Write-Host "App Name: $($app.name)" -ForegroundColor Cyan
        Write-Host "  App ID: $($app.appId)" -ForegroundColor Gray
        Write-Host "  Default Domain: $($app.defaultDomain)" -ForegroundColor Gray
        Write-Host "  Platform: $($app.platform)" -ForegroundColor Gray
        
        # Get domains for this app
        Write-Host ""
        Write-Host "  📡 Checking domains..." -ForegroundColor Yellow
        try {
            $domains = aws amplify list-domain-associations --app-id $app.appId --output json | ConvertFrom-Json
            if ($domains.domainAssociations.Count -eq 0) {
                Write-Host "    ⚠️  No custom domains configured" -ForegroundColor Yellow
                Write-Host "    💡 Use default domain: https://$($app.defaultDomain)" -ForegroundColor Cyan
            } else {
                foreach ($domain in $domains.domainAssociations) {
                    Write-Host "    Domain: $($domain.domainName)" -ForegroundColor White
                    Write-Host "      Status: $($domain.domainStatus)" -ForegroundColor $(if ($domain.domainStatus -eq 'AVAILABLE') { 'Green' } else { 'Yellow' })
                    Write-Host "      Certificate Status: $($domain.certificateVerificationDNSRecord)" -ForegroundColor Gray
                    
                    # Check subdomains
                    if ($domain.subDomains) {
                        foreach ($subdomain in $domain.subDomains) {
                            Write-Host "        Subdomain: $($subdomain.subDomainSetting.prefix) - Status: $($subdomain.verified)" -ForegroundColor Gray
                        }
                    }
                }
            }
        } catch {
            Write-Host "    ❌ Error checking domains: $_" -ForegroundColor Red
        }
        
        # Get latest build
        Write-Host ""
        Write-Host "  🔨 Checking latest build..." -ForegroundColor Yellow
        try {
            $builds = aws amplify list-jobs --app-id $app.appId --branch-name main --max-results 1 --output json | ConvertFrom-Json
            if ($builds.jobSummaries.Count -gt 0) {
                $latestBuild = $builds.jobSummaries[0]
                Write-Host "    Job ID: $($latestBuild.jobId)" -ForegroundColor Gray
                Write-Host "    Status: $($latestBuild.status)" -ForegroundColor $(if ($latestBuild.status -eq 'SUCCEED') { 'Green' } elseif ($latestBuild.status -eq 'FAILED') { 'Red' } else { 'Yellow' })
                Write-Host "    Started: $($latestBuild.startTime)" -ForegroundColor Gray
            } else {
                Write-Host "    ⚠️  No builds found" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "    ❌ Error checking builds: $_" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Error listing apps: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure AWS CLI is configured with:" -ForegroundColor Yellow
    Write-Host "  aws configure" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "=== Check Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. If domain status is PENDING: Wait for certificate provisioning (1-2 hours)" -ForegroundColor White
Write-Host "  2. If domain status is FAILED: Check DNS records and re-add domain" -ForegroundColor White
Write-Host "  3. If no domain: Add domain in AWS Amplify Console" -ForegroundColor White
Write-Host "  4. If build failed: Check build logs in Amplify Console" -ForegroundColor White

