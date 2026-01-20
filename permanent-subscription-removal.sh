#!/bin/bash
set -e

cd /var/www/summit/server

echo "=== Removing subscription middleware from SOURCE ==="
cd src
# Remove any subscription middleware imports/usage
sed -i '/checkSubscriptionAccess/d' index.ts
sed -i '/subscription\.js/d' index.ts

echo "=== Source cleaned ==="
cat index.ts | grep -i subscription || echo "✓ No subscription references in source"

cd /var/www/summit/server

echo ""
echo "=== Rebuilding from clean source ==="
rm -rf dist
npm run build 2>&1 | tail -30

echo ""
echo "=== Verifying dist/index.js ==="
grep -i "checkSubscriptionAccess" dist/index.js && echo "❌ Still in dist!" || echo "✓ Clean dist"

echo ""
echo "=== Restarting PM2 ==="
pm2 restart summit-backend
sleep 3
pm2 status

echo ""
echo "=== Testing ==="
curl -s https://summit.api.codingeverest.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | head -c 200

echo ""
echo "=== DONE ==="
