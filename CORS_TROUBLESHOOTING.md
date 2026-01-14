# CORS Troubleshooting Summary

## Problem
- Server process exists but port 3000 not listening
- CORS headers missing (`Access-Control-Allow-Origin`)
- Server not responding to requests

## What Was Fixed
1. ✅ Nginx config updated: `proxy_pass` changed from port 4000 → 3000
2. ✅ Nginx CORS headers removed (backend handles CORS)
3. ✅ CORS_ORIGIN set in .env: `https://summit.codingeverest.com`
4. ✅ Server rebuilt and restarted

## Current Status
- Server process running (PM2 shows process exists)
- Port 3000 NOT listening (server likely crashing on startup)
- CORS headers not present (because server not responding)

## Next Steps - Manual Verification

SSH into EC2 and run these commands:

```bash
# 1. Check PM2 status
pm2 status summit-backend

# 2. Check PM2 logs for errors
pm2 logs summit-backend --lines 50

# 3. Check if port 3000 is listening
netstat -tlnp | grep :3000
# OR
ss -tlnp | grep :3000

# 4. Test server directly
curl http://localhost:3000/health

# 5. Check if server process is actually running
ps aux | grep "node.*dist/index.js"

# 6. Try starting server manually (outside PM2) to see errors
cd /var/www/summit/server
node dist/index.js
```

## Likely Issues

1. **Database connection error** - Server might be crashing because it can't connect to PostgreSQL
2. **Missing environment variables** - Some required env var might be missing
3. **Port already in use** - Another process might be using port 3000
4. **Build errors** - The dist/index.js might have issues

## Quick Fix - If Server Won't Start

```bash
cd /var/www/summit/server

# Check .env file
cat .env | grep -E "(DB_|PORT|CORS)"

# Rebuild
npm run build

# Test build
node dist/index.js
# (Press Ctrl+C after seeing startup messages or errors)

# Restart with PM2
pm2 restart summit-backend
pm2 logs summit-backend
```

## CORS Configuration is Correct

The server code has:
- ✅ CORS middleware applied before routes
- ✅ OPTIONS preflight handling
- ✅ CORS_ORIGIN from .env or defaults
- ✅ Credentials enabled
- ✅ All necessary headers configured

The issue is the server is not starting/responding, not the CORS configuration itself.
