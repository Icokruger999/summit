#!/bin/bash
# Check Chime endpoints in production

echo "Checking Chime endpoints structure..."
grep -n "app\.\(post\|get\|delete\).*chime" /var/www/summit/index.js | head -20
