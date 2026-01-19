#!/bin/bash
sudo cp /var/www/summit/index.js.backup-before-chime-handlers /var/www/summit/index.js
pm2 restart summit-backend
sleep 4

TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."
echo ""
echo "Chats:"
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"
