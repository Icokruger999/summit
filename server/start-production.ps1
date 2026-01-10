# Summit Production Start Script for Windows
# This script starts the Summit backend in production mode

Write-Host "Starting Summit Backend in Production Mode..." -ForegroundColor Cyan

# Check if .env file exists
if (Test-Path .env) {
    Write-Host "Loading environment variables from .env" -ForegroundColor Green
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
}

# Build the application
Write-Host "Building application..." -ForegroundColor Cyan
npm run build

# Check if PM2 is available
$pm2Available = Get-Command pm2 -ErrorAction SilentlyContinue

if ($pm2Available) {
    Write-Host "Starting with PM2..." -ForegroundColor Cyan
    pm2 delete summit-backend 2>$null
    pm2 start dist/index.js --name summit-backend --time
    pm2 save
    Write-Host "Summit backend started with PM2" -ForegroundColor Green
} else {
    Write-Host "PM2 not found. Starting with node..." -ForegroundColor Yellow
    node dist/index.js
}

