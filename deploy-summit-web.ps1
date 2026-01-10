# Summit Web Deployment Script for Windows
# This script helps deploy Summit to your production server using PowerShell

param(
    [string]$ServerUser = "root",
    [string]$ServerHost = "codingeverest.com",
    [string]$RemotePath = "/var/www/summit"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Summit Web Deployment Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Deployment Configuration:" -ForegroundColor Yellow
Write-Host "  User: $ServerUser"
Write-Host "  Host: $ServerHost"
Write-Host "  Path: $RemotePath"
Write-Host ""

$confirm = Read-Host "Continue with deployment? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Deployment cancelled" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Building backend..." -ForegroundColor Cyan
Set-Location server
npm install
npm run build
Set-Location ..

Write-Host ""
Write-Host "Creating deployment package..." -ForegroundColor Cyan
New-Item -Path deploy-temp -ItemType Directory -Force | Out-Null
Copy-Item -Path server\dist -Destination deploy-temp\ -Recurse -Force
Copy-Item -Path server\package*.json -Destination deploy-temp\ -Force
Copy-Item -Path server\.env.production -Destination deploy-temp\.env -Force
Copy-Item -Path web-login -Destination deploy-temp\ -Recurse -Force
Copy-Item -Path nginx-summit.conf -Destination deploy-temp\ -Force
Copy-Item -Path server\start-production.sh -Destination deploy-temp\ -Force

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "MANUAL DEPLOYMENT STEPS" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "The files are ready in the 'deploy-temp' folder." -ForegroundColor Green
Write-Host ""
Write-Host "Please follow these steps to complete deployment:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Upload the files to your server:" -ForegroundColor White
Write-Host "   scp -r deploy-temp/* $ServerUser@$ServerHost`:$RemotePath/" -ForegroundColor Gray
Write-Host ""
Write-Host "2. SSH into your server:" -ForegroundColor White
Write-Host "   ssh $ServerUser@$ServerHost" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Run these commands on the server:" -ForegroundColor White
Write-Host "   cd $RemotePath" -ForegroundColor Gray
Write-Host "   npm install --production" -ForegroundColor Gray
Write-Host "   chmod +x start-production.sh" -ForegroundColor Gray
Write-Host "   sudo cp nginx-summit.conf /etc/nginx/conf.d/summit-locations.conf" -ForegroundColor Gray
Write-Host "   sudo nginx -t && sudo systemctl reload nginx" -ForegroundColor Gray
Write-Host "   ./start-production.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test the deployment:" -ForegroundColor White
Write-Host "   curl https://$ServerHost/summit/api/auth/health" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Clean up (optional):" -ForegroundColor White
Write-Host "   Remove-Item -Path deploy-temp -Recurse -Force" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Offer to open SSH client if available
$openSSH = Read-Host "Open SSH connection now? (y/n)"
if ($openSSH -eq 'y' -or $openSSH -eq 'Y') {
    Write-Host "Opening SSH connection..." -ForegroundColor Green
    ssh "$ServerUser@$ServerHost"
}

