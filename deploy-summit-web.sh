#!/bin/bash

# Summit Web Deployment Script
# This script helps deploy Summit to your production server

echo "============================================"
echo "Summit Web Deployment Script"
echo "============================================"
echo ""

# Configuration
SERVER_USER="${1:-root}"
SERVER_HOST="${2:-codingeverest.com}"
REMOTE_PATH="${3:-/var/www/summit}"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./deploy-summit-web.sh [user] [host] [remote_path]"
    echo "Example: ./deploy-summit-web.sh ubuntu codingeverest.com /var/www/summit"
    echo ""
    echo "Using defaults:"
    echo "  User: $SERVER_USER"
    echo "  Host: $SERVER_HOST"
    echo "  Path: $REMOTE_PATH"
    echo ""
    read -p "Continue with these settings? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Building backend..."
cd server
npm install
npm run build
cd ..

echo ""
echo "Creating deployment package..."
mkdir -p deploy-temp
cp -r server/dist deploy-temp/
cp server/package*.json deploy-temp/
cp server/.env.production deploy-temp/.env
cp -r web-login deploy-temp/
cp nginx-summit.conf deploy-temp/
cp server/start-production.sh deploy-temp/

echo ""
echo "Uploading to server..."
ssh $SERVER_USER@$SERVER_HOST "mkdir -p $REMOTE_PATH"
scp -r deploy-temp/* $SERVER_USER@$SERVER_HOST:$REMOTE_PATH/

echo ""
echo "Installing dependencies on server..."
ssh $SERVER_USER@$SERVER_HOST << EOF
cd $REMOTE_PATH
npm install --production
chmod +x start-production.sh

echo "Configuring Nginx..."
sudo cp nginx-summit.conf /etc/nginx/conf.d/summit-locations.conf
sudo nginx -t && sudo systemctl reload nginx

echo "Starting Summit backend..."
./start-production.sh
EOF

echo ""
echo "Cleaning up..."
rm -rf deploy-temp

echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Visit https://$SERVER_HOST/summit/api/auth/health to test API"
echo "2. Visit https://$SERVER_HOST/summit/login to test login page"
echo "3. Update your landing page with the login button"
echo ""
echo "Monitor logs: ssh $SERVER_USER@$SERVER_HOST 'pm2 logs summit-backend'"
echo ""

