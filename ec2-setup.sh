#!/bin/bash
set -e

echo "=== Summit Instance Setup Script ==="
echo "Started at: $(date)"
echo ""

# Update system
echo "ðŸ“¦ Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Install Node.js 18
echo "ðŸ“¦ Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
echo "ðŸ“¦ Installing PM2..."
npm install -g pm2

# Install Git
echo "ðŸ“¦ Installing Git..."
apt-get install -y git

# Install Nginx
echo "ðŸ“¦ Installing Nginx..."
apt-get install -y nginx

# Install PostgreSQL client (optional, for database access)
echo "ðŸ“¦ Installing PostgreSQL client..."
apt-get install -y postgresql-client

# Install AWS CLI
echo "ðŸ“¦ Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
apt-get install -y unzip
unzip -q awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Create directories
echo "ðŸ“ Creating directories..."
mkdir -p /var/www/summit
chown -R ubuntu:ubuntu /var/www/summit

# Clone repository (or prepare for manual copy)
echo "ðŸ“¦ Preparing for code deployment..."
cd /var/www/summit
# Repository will be cloned or code copied manually

echo ""
echo "âœ… System setup complete!"
echo "Next: Clone/copy Summit code to /var/www/summit"
echo ""
echo "To verify setup:"
echo "  node --version"
echo "  npm --version"
echo "  pm2 --version"
echo "  nginx -v"