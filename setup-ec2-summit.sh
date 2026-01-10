#!/bin/bash
# Summit Setup Script for EC2
# Run this ON the EC2 instance after uploading files

set -e

echo "============================================"
echo "Summit Backend Setup on EC2"
echo "============================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Are you in /var/www/summit?"
    exit 1
fi

# Check if Milo is running (don't interfere)
echo "Checking existing services..."
pm2 list

echo ""
echo "This will install Summit on port 4000"
echo "Milo will continue running on ports 3000, 5000, 5001"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Generate JWT secret if not already set
if grep -q "WILL_BE_GENERATED_ON_SERVER" .env 2>/dev/null; then
    echo ""
    echo "Generating JWT secret..."
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/WILL_BE_GENERATED_ON_SERVER/$JWT_SECRET/" .env
    echo "JWT secret generated"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install --production

# Create uploads directory
echo ""
echo "Creating uploads directory..."
mkdir -p uploads

# Start with PM2
echo ""
echo "Starting Summit backend with PM2..."
pm2 start dist/index.js --name summit-backend
pm2 save

# Verify
echo ""
echo "Verifying installation..."
sleep 2
pm2 list

echo ""
echo "Testing health endpoint..."
sleep 1
curl -f http://localhost:4000/health || {
    echo "Health check failed!"
    pm2 logs summit-backend --lines 20
    exit 1
}

echo ""
echo "============================================"
echo "✅ Summit Backend Installed Successfully!"
echo "============================================"
echo ""
echo "Backend is running on port 4000"
echo ""
echo "Next steps:"
echo "1. Configure Nginx for api.codingeverest.com"
echo "2. Set up SSL with certbot"
echo "3. Configure Route 53 DNS"
echo "4. Deploy frontend to Amplify"
echo ""
echo "Useful commands:"
echo "  pm2 logs summit-backend    - View logs"
echo "  pm2 restart summit-backend - Restart"
echo "  pm2 stop summit-backend    - Stop"
echo ""

