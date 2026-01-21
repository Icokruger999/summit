# Build Summit Desktop Installer for Windows
# This script builds the Windows installer (.exe) for Summit Desktop

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summit Desktop - Windows Installer Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Rust is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$rustVersion = & rustc --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Rust is not installed!" -ForegroundColor Red
    Write-Host "Please install Rust from: https://rustup.rs/" -ForegroundColor Yellow
    Write-Host "Or run: winget install Rustlang.Rustup" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Rust installed: $rustVersion" -ForegroundColor Green

# Check if Node.js is installed
$nodeVersion = & node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green

Write-Host ""
Write-Host "Starting build process..." -ForegroundColor Yellow
Write-Host "⏱️  This will take 10-15 minutes for the first build" -ForegroundColor Yellow
Write-Host "⏱️  Subsequent builds will take 2-5 minutes" -ForegroundColor Yellow
Write-Host ""

# Navigate to desktop directory
Set-Location -Path "desktop"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Build the installer
Write-Host ""
Write-Host "Building Windows installer..." -ForegroundColor Yellow
npm run tauri:build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "1. Install Visual Studio C++ Build Tools" -ForegroundColor White
    Write-Host "2. Run: rustup update" -ForegroundColor White
    Write-Host "3. Restart your terminal" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installer location:" -ForegroundColor Cyan
Write-Host "  src-tauri\target\release\bundle\nsis\Summit_0.1.0_x64-setup.exe" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the installer on a clean machine" -ForegroundColor White
Write-Host "2. Upload to GitHub Releases or your hosting service" -ForegroundColor White
Write-Host "3. Update download URLs in src/pages/Download.tsx" -ForegroundColor White
Write-Host "4. Deploy to Amplify" -ForegroundColor White
Write-Host ""

# Return to original directory
Set-Location -Path ".."
