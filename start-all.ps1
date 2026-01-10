# Start all services: Backend, Frontend, and LiveKit
$ErrorActionPreference = "SilentlyContinue"

$rootDir = $PSScriptRoot
$serverDir = Join-Path $rootDir "server"
$desktopDir = Join-Path $rootDir "desktop"
$livekitExe = Join-Path $rootDir "tools\livekit-server.exe"

# Check if LiveKit is installed
if (-not (Test-Path $livekitExe)) {
    Write-Host "[!] LiveKit not found. Downloading..." -ForegroundColor Yellow
    & "$rootDir\download-livekit.ps1" | Out-Null
    if (-not (Test-Path $livekitExe)) {
        Write-Host "[ERROR] Failed to download LiveKit" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting services..." -ForegroundColor Cyan

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverDir'; npm run dev" -WindowStyle Minimized | Out-Null
Start-Sleep -Seconds 2

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$desktopDir'; npm run dev" -WindowStyle Minimized | Out-Null
Start-Sleep -Seconds 2

# Start LiveKit
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; .\start-livekit.ps1" -WindowStyle Minimized | Out-Null
Start-Sleep -Seconds 3

Write-Host "Waiting for services to start..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Verify services
$backend = netstat -ano | findstr ":4000" | findstr "LISTENING"
$frontend = netstat -ano | findstr ":5173" | findstr "LISTENING"
$livekit = netstat -ano | findstr ":7880" | findstr "LISTENING"

Write-Host ""
if ($backend) {
    Write-Host "[OK] Backend (port 4000)" -ForegroundColor Green
} else {
    Write-Host "[!] Backend not ready yet" -ForegroundColor Yellow
}

if ($frontend) {
    Write-Host "[OK] Frontend (port 5173)" -ForegroundColor Green
} else {
    Write-Host "[!] Frontend not ready yet" -ForegroundColor Yellow
}

if ($livekit) {
    Write-Host "[OK] LiveKit (port 7880)" -ForegroundColor Green
} else {
    Write-Host "[!] LiveKit not ready yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Open: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

