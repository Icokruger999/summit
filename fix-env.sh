#!/bin/bash
cd /var/www/summit/server || cd /opt/summit/server || exit 1

# Backup
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    DB_PASS=$(grep ^DB_PASSWORD= .env | cut -d= -f2)
else
    DB_PASS="CHANGE_ME"
fi

# Generate JWT
JWT_SEC=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)

# Create .env
cat > .env << EOF
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=summit
DB_USER=summit_user
DB_PASSWORD=$DB_PASS
JWT_SECRET=$JWT_SEC
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
EOF

echo "Config created"
grep -E '^(DB_HOST|DB_PORT|CORS_ORIGIN)=' .env
npm install --production
npm run build
pm2 stop summit-backend 2>/dev/null || true
pm2 delete summit-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
sleep 2
pm2 status
curl -s http://localhost:3000/health
echo ""
echo "Done!"
