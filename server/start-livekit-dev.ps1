# Quick script to start LiveKit server for development
# This uses Docker to run LiveKit in development mode

Write-Host "Starting LiveKit server in development mode..." -ForegroundColor Cyan

# Check if Docker is available
$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerAvailable) {
    Write-Host "Using Docker to run LiveKit..." -ForegroundColor Green
    
    # Create docker-compose.yml if it doesn't exist
    if (-not (Test-Path "docker-compose.yml")) {
        @"
version: '3.8'
services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"
      - "7881:7881"
      - "50000-60000:50000-60000/udp"
    command: --dev
    environment:
      - LIVEKIT_KEYS=devkey: devsecret
"@ | Out-File -FilePath "docker-compose.yml" -Encoding utf8
        Write-Host "Created docker-compose.yml" -ForegroundColor Yellow
    }
    
    Write-Host "Starting LiveKit server on port 7880..." -ForegroundColor Green
    docker-compose up -d livekit
    
    Write-Host "LiveKit server should be running!" -ForegroundColor Green
    Write-Host "API Key: devkey" -ForegroundColor Cyan
    Write-Host "API Secret: devsecret" -ForegroundColor Cyan
    Write-Host "URL: ws://localhost:7880" -ForegroundColor Cyan
    Write-Host "`nTo stop: docker-compose down" -ForegroundColor Yellow
} else {
    Write-Host "Docker not found. Please install Docker Desktop or:" -ForegroundColor Yellow
    Write-Host "1. Download LiveKit server from: https://github.com/livekit/livekit/releases" -ForegroundColor Yellow
    Write-Host "2. Extract and run: livekit-server --dev" -ForegroundColor Yellow
    Write-Host "3. Or use LiveKit Cloud: https://cloud.livekit.io/" -ForegroundColor Yellow
}

