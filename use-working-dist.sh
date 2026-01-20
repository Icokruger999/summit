#!/bin/bash
cd /var/www/summit/server

echo "=== Using last working dist backup ==="
# Find the most recent backup before the break
if [ -d "dist.backup.working" ]; then
    rm -rf dist
    cp -r dist.backup.working dist
    echo "✓ Restored from dist.backup.working"
else
    echo "No backup found, manually fixing dist/index.js"
    sed -i '/checkSubscriptionAccess/d' dist/index.js
    sed -i '/subscriptions_js_1/d' dist/index.js
fi

echo ""
echo "=== Verifying ==="
grep -n "checkSubscriptionAccess" dist/index.js || echo "✓ Clean"

echo ""
echo "=== Restarting ==="
pm2 restart summit-backend
sleep 2
pm2 logs summit-backend --lines 10 --nostream
