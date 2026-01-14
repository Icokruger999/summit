#!/bin/bash

# Setup PM2 for Production Server on EC2
# This script ensures the server auto-starts on boot and auto-restarts on crashes

set -e

SERVER_PATH="/var/www/summit/server"
NODE_USER="${SUDO_USER:-$USER}"

echo "🚀 Setting up PM2 for Production Server"
echo "Server Path: $SERVER_PATH"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script needs sudo privileges. Please run with sudo."
    exit 1
fi

# Check if server directory exists
if [ ! -d "$SERVER_PATH" ]; then
    echo "❌ ERROR: Server directory not found: $SERVER_PATH"
    echo "   Please ensure the server is deployed to this location."
    exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
else
    echo "✅ PM2 already installed: $(pm2 --version)"
fi

# Navigate to server directory
cd "$SERVER_PATH"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found in $SERVER_PATH"
    echo "   The server may not start correctly without environment variables."
    echo "   Please ensure .env file is configured."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

# Stop existing PM2 instance if running
echo "🛑 Stopping existing PM2 instance (if any)..."
sudo -u "$NODE_USER" pm2 delete summit-backend 2>/dev/null || true

# Start with PM2
echo "▶️  Starting server with PM2..."
sudo -u "$NODE_USER" pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
sudo -u "$NODE_USER" pm2 save

# Setup PM2 startup script (auto-start on boot)
echo "⚙️  Setting up PM2 startup script for auto-start on boot..."
STARTUP_CMD=$(sudo -u "$NODE_USER" pm2 startup systemd -u "$NODE_USER" --hp "/home/$NODE_USER" | grep "sudo")
if [ ! -z "$STARTUP_CMD" ]; then
    eval "$STARTUP_CMD"
    echo "✅ PM2 startup script configured"
else
    echo "ℹ️  PM2 startup script may already be configured"
fi

# Enable PM2 on systemd
systemctl enable pm2-$NODE_USER 2>/dev/null || true

echo ""
echo "✅ PM2 setup complete!"
echo ""
echo "📊 Server Status:"
sudo -u "$NODE_USER" pm2 status
echo ""
echo "📝 Useful commands:"
echo "   pm2 status                # Check status"
echo "   pm2 logs summit-backend  # View logs"
echo "   pm2 restart summit-backend # Restart server"
echo "   pm2 stop summit-backend  # Stop server"
echo "   pm2 monit                # Monitor resources"
echo ""
echo "🔄 The server will now:"
echo "   ✅ Auto-start on system boot"
echo "   ✅ Auto-restart on crashes"
echo "   ✅ Auto-restart on memory limits"
echo "   ✅ Run 24/7 in production mode"
echo ""
