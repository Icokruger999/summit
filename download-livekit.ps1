# Download and Setup LiveKit Server for Windows
$ErrorActionPreference = "Stop"

$toolsDir = Join-Path $PSScriptRoot "tools"
# Get latest release URL from GitHub API
$latestUrl = "https://api.github.com/repos/livekit/livekit/releases/latest"
$zipFile = Join-Path $toolsDir "livekit.zip"
$exePath = Join-Path $toolsDir "livekit-server.exe"

Write-Host "Setting up LiveKit Server..." -ForegroundColor Cyan

# Create tools directory
if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
    Write-Host "Created tools directory" -ForegroundColor Green
}

# Check if already downloaded
if (Test-Path $exePath) {
    Write-Host "LiveKit server already exists!" -ForegroundColor Green
    Write-Host "Location: $exePath" -ForegroundColor Gray
    exit 0
}

# Get download URL from GitHub API
Write-Host "Finding latest LiveKit release..." -ForegroundColor Yellow
try {
    $release = Invoke-RestMethod -Uri $latestUrl -UseBasicParsing
    $windowsAsset = $release.assets | Where-Object { $_.name -like "*windows*amd64*.zip" } | Select-Object -First 1
    
    if (-not $windowsAsset) {
        throw "Windows release not found"
    }
    
    $downloadUrl = $windowsAsset.browser_download_url
    Write-Host "Found: $($windowsAsset.name)" -ForegroundColor Green
    Write-Host "Downloading..." -ForegroundColor Yellow
    
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green
    
    # Extract
    Write-Host "Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $zipFile -DestinationPath $toolsDir -Force
    
    # Cleanup
    Remove-Item $zipFile -Force
    
    Write-Host ""
    Write-Host "LiveKit server installed successfully!" -ForegroundColor Green
    Write-Host "Location: $exePath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next step: Run start-livekit.ps1 to start the server" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "Failed to download automatically. Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://github.com/livekit/livekit/releases/latest" -ForegroundColor Cyan
    Write-Host "2. Download: livekit-server_windows_amd64.zip" -ForegroundColor Cyan
    Write-Host "3. Extract livekit-server.exe to: $toolsDir" -ForegroundColor Cyan
    exit 1
}

