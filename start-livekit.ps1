# Start LiveKit Server for Development
$ErrorActionPreference = "Continue"

$toolsDir = Join-Path $PSScriptRoot "tools"
$exePath = Join-Path $toolsDir "livekit-server.exe"

# Check if LiveKit is installed
if (-not (Test-Path $exePath)) {
    Write-Host "[ERROR] LiveKit not found at: $exePath" -ForegroundColor Red
    Write-Host "Run: .\download-livekit.ps1" -ForegroundColor Yellow
    exit 1
}

# Check if port is already in use
$portInUse = netstat -ano | findstr ":7880" | findstr "LISTENING"
if ($portInUse) {
    Write-Host "Port 7880 already in use - LiveKit may already be running" -ForegroundColor Yellow
    Write-Host "Skipping startup..." -ForegroundColor Gray
    exit 0
}

# Use --dev mode for local development
# This automatically uses devkey/devsecret which matches our token generation
& $exePath --dev


