#!/bin/bash
set -e

echo "🔄 Restoring backend to commit 3c62d34..."

# Stop backend
echo "1️⃣  Stopping backend..."
pm2 stop summit || true
sleep 2

# Fetch and checkout
echo "2️⃣  Fetching and checking out commit..."
cd /var/www/summit
git fetch origin
git checkout 3c62d34

# Install and build
echo "3️⃣  Installing dependencies..."
npm install --legacy-peer-deps

echo "4️⃣  Building backend..."
npm run build

# Start backend
echo "5️⃣  Starting backend..."
pm2 start summit
sleep 3

# Verify
echo "6️⃣  Backend status:"
pm2 status

echo "✅ Backend restoration complete!"
