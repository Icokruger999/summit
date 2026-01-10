# Automatic LiveKit Setup Script for Windows
# This will download and start LiveKit server for you

Write-Host "🚀 Setting up LiveKit Server for Summit Chat..." -ForegroundColor Cyan
Write-Host ""

# Check if LiveKit is already downloaded
$livekitPath = "$PSScriptRoot\tools\livekit-server.exe"

if (Test-Path $livekitPath) {
    Write-Host "✅ LiveKit server found!" -ForegroundColor Green
} else {
    Write-Host "📦 Downloading LiveKit server..." -ForegroundColor Yellow
    
    # Create tools directory
    $toolsDir = "$PSScriptRoot\tools"
    if (-not (Test-Path $toolsDir)) {
        New-Item -ItemType Directory -Path $toolsDir | Out-Null
    }
    
    # Download URL for latest Windows release
    $downloadUrl = "https://github.com/livekit/livekit/releases/latest/download/livekit-server_windows_amd64.zip"
    $zipPath = "$toolsDir\livekit-server.zip"
    
    Write-Host "Downloading from: $downloadUrl" -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract
        Write-Host "Extracting..." -ForegroundColor Yellow
        Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
        Remove-Item $zipPath -Force
        
        Write-Host "✅ LiveKit server downloaded and extracted!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to download LiveKit automatically." -ForegroundColor Red
        Write-Host ""
        Write-Host "Please download manually:" -ForegroundColor Yellow
        Write-Host "1. Go to: https://github.com/livekit/livekit/releases/latest" -ForegroundColor Cyan
        Write-Host "2. Download: livekit-server_windows_amd64.zip" -ForegroundColor Cyan
        Write-Host "3. Extract to: $toolsDir" -ForegroundColor Cyan
        Write-Host "4. Run this script again" -ForegroundColor Cyan
        exit 1
    }
}

Write-Host ""
Write-Host "▶️  Starting LiveKit server in development mode..." -ForegroundColor Green
Write-Host "   (This will run on port 7880 with dev credentials)" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start LiveKit server
& $livekitPath --dev



