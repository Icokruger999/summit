#!/bin/bash
set -e
echo "=== Summit Backend Deployment ==="
sudo mkdir -p /opt/summit-backend
sudo chown ubuntu:ubuntu /opt/summit-backend 2>/dev/null || sudo chown ec2-user:ec2-user /opt/summit-backend
cd /opt/summit-backend
echo "Downloading package..."
aws s3 cp s3://codingeverest-deployments/summit/server-20260108131657.zip server.zip --region eu-west-1
echo "Extracting..."
unzip -o server.zip && rm server.zip
echo "Installing dependencies..."
npm install --production
echo "Building..."
npm run build
echo "Creating .env..."
cat > .env << 'ENVEOF'
PORT=3001
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=summit-secret-production
ENVEOF
echo "Installing PM2..."
if ! command -v pm2 &> /dev/null; then sudo npm install -g pm2; fi
echo "Starting backend on port 3001..."
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
pm2 start dist/index.js --name summit-backend
pm2 save && pm2 startup
echo ""
echo "=== Deployment Complete ==="
pm2 status
