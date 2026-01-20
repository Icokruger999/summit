#!/bin/bash
cd /var/www/summit/server/dist

echo "=== Checking current index.js for subscription ==="
grep -n "checkSubscriptionAccess" index.js | head -5

echo ""
echo "=== Removing subscription middleware ==="
sed -i '/checkSubscriptionAccess/d' index.js
sed -i '/subscriptions_js_1/d' index.js

echo ""
echo "=== Verifying removal ==="
grep -n "checkSubscriptionAccess" index.js || echo "✓ Subscription middleware removed"

echo ""
echo "=== Restarting PM2 ==="
pm2 restart summit-backend
sleep 3
pm2 status

echo ""
echo "=== Testing API ==="
TOKEN=$(curl -s -X POST https://summit.api.codingeverest.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:30}..."

curl -s https://summit.api.codingeverest.com/api/chats \
  -H "Authorization: Bearer $TOKEN" | head -c 500

echo ""
echo "=== DONE ==="
