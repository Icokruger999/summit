# Summit Production Start Script for Windows
# This script ensures the server runs 24/7 with PM2 process manager
# NEVER uses ports 5000 or 50001

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Summit Backend in Production Mode..." -ForegroundColor Cyan

# Validate environment file exists
if (-not (Test-Path .env)) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "   Please copy .env.example to .env and configure it." -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Write-Host "📋 Loading environment variables..." -ForegroundColor Cyan
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.+)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Check for required environment variables
$requiredVars = @("PORT", "JWT_SECRET", "SUMMIT_DB_HOST", "DB_HOST", "CORS_ORIGIN")
$missingVars = @()

foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if (-not $value) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ ERROR: Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Yellow
    }
    Write-Host "   Please check your .env file." -ForegroundColor Yellow
    exit 1
}

# Validate PORT is not 5000 or 50001
$port = [int][Environment]::GetEnvironmentVariable("PORT", "Process")
if ($port -eq 5000 -or $port -eq 50001) {
    Write-Host "❌ ERROR: Port $port is not allowed. Ports 5000 and 50001 are reserved." -ForegroundColor Red
    Write-Host "   Please set PORT to a different value (e.g., 3000) in your .env file." -ForegroundColor Yellow
    exit 1
}

# Check for localhost in CORS_ORIGIN
$corsOrigin = [Environment]::GetEnvironmentVariable("CORS_ORIGIN", "Process")
if ($corsOrigin -match "localhost" -or $corsOrigin -match "127\.0\.0\.1") {
    Write-Host "⚠️  WARNING: CORS_ORIGIN contains localhost. This should not be used in production." -ForegroundColor Yellow
    $response = Read-Host "   Continue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
}

# Build the application
Write-Host "📦 Building application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Check if PM2 is installed
$pm2Available = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Available) {
    Write-Host "❌ ERROR: PM2 is not installed!" -ForegroundColor Red
    Write-Host "   Install it with: npm install -g pm2" -ForegroundColor Yellow
    exit 1
}

# Create logs directory
if (-not (Test-Path logs)) {
    New-Item -ItemType Directory -Path logs | Out-Null
}

# Stop existing instance if running
Write-Host "🛑 Stopping existing instance (if any)..." -ForegroundColor Cyan
pm2 delete summit-backend 2>$null

# Start with PM2
Write-Host "▶️  Starting server with PM2 (24/7 mode)..." -ForegroundColor Cyan
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

Write-Host ""
Write-Host "✅ Summit backend started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Server Status:" -ForegroundColor Cyan
pm2 status summit-backend
Write-Host ""
Write-Host "📝 Useful commands:" -ForegroundColor Cyan
Write-Host "   pm2 logs summit-backend    # View logs" -ForegroundColor Gray
Write-Host "   pm2 status                 # Check status" -ForegroundColor Gray
Write-Host "   pm2 restart summit-backend # Restart server" -ForegroundColor Gray
Write-Host "   pm2 stop summit-backend    # Stop server" -ForegroundColor Gray
Write-Host ""
