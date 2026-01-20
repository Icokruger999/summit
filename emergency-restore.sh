#!/bin/bash
set -e

echo "=== Emergency Restore ==="
cd /var/www/summit/server

# Stop PM2
pm2 stop summit-backend || true

# Pull from git to get working version
git fetch origin
git checkout origin/main -- src/routes/

# Rebuild
npm run build

# Restart
pm2 restart summit-backend
sleep 3

# Check status
pm2 status
echo ""
echo "Testing API..."
curl -s https://summit.api.codingeverest.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | head -c 200

echo ""
echo "=== Restore Complete ==="
