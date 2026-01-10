#!/bin/bash
cd /var/www/summit
echo "=== Fixing Summit Backend ==="
echo "Removing Supabase..."
sed -i '/"@supabase\/supabase-js":/d' package.json
echo "Installing dependencies..."
npm install --production
echo "Starting backend..."
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
pm2 start dist/index.js --name summit-backend
pm2 save
echo "Testing..."
sleep 2
curl http://localhost:4000/health
echo ""
pm2 list

