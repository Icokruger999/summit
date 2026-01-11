#!/bin/bash

# Summit Production Start Script
# This script ensures the server runs 24/7 with PM2 process manager
# NEVER uses ports 5000 or 50001

set -e  # Exit on error

echo "🚀 Starting Summit Backend in Production Mode..."

# Validate environment file exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "   Please copy .env.example to .env and configure it."
    exit 1
fi

# Check for required environment variables
source .env
required_vars=("PORT" "JWT_SECRET" "SUMMIT_DB_HOST" "DB_HOST" "CORS_ORIGIN")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ ERROR: Missing required environment variables:"
    printf '   - %s\n' "${missing_vars[@]}"
    echo "   Please check your .env file."
    exit 1
fi

# Validate PORT is not 5000 or 50001
if [ "$PORT" = "5000" ] || [ "$PORT" = "50001" ]; then
    echo "❌ ERROR: Port $PORT is not allowed. Ports 5000 and 50001 are reserved."
    echo "   Please set PORT to a different value (e.g., 3000) in your .env file."
    exit 1
fi

# Check for localhost in CORS_ORIGIN
if [[ "$CORS_ORIGIN" == *"localhost"* ]] || [[ "$CORS_ORIGIN" == *"127.0.0.1"* ]]; then
    echo "⚠️  WARNING: CORS_ORIGIN contains localhost. This should not be used in production."
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the application
echo "📦 Building application..."
npm run build

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ ERROR: PM2 is not installed!"
    echo "   Install it with: npm install -g pm2"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Stop existing instance if running
echo "🛑 Stopping existing instance (if any)..."
pm2 delete summit-backend 2>/dev/null || true

# Start with PM2
echo "▶️  Starting server with PM2 (24/7 mode)..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration for auto-start on reboot
pm2 save

# Setup PM2 startup script (run once)
if ! pm2 startup | grep -q "already"; then
    echo "⚙️  Setting up PM2 startup script..."
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
fi

echo ""
echo "✅ Summit backend started successfully!"
echo ""
echo "📊 Server Status:"
pm2 status summit-backend
echo ""
echo "📝 Useful commands:"
echo "   pm2 logs summit-backend    # View logs"
echo "   pm2 status                # Check status"
echo "   pm2 restart summit-backend # Restart server"
echo "   pm2 stop summit-backend   # Stop server"
echo ""
