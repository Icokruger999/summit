# Production Deployment Guide

## Overview

This guide covers deploying the Summit backend server in production with 24/7 uptime guarantees.

## Key Rules

1. **Server runs 24/7** - Uses PM2 process manager with auto-restart
2. **Never use ports 5000 or 50001** - These ports are reserved
3. **No localhost in production** - All configurations use production URLs
4. **Environment variables required** - Must be set before deployment

## Prerequisites

- Node.js 18+ installed
- PM2 installed globally: `npm install -g pm2`
- PostgreSQL database accessible
- All environment variables configured in `.env`

## Deployment Steps

### 1. Prepare Environment Variables

Copy `.env.example` to `.env` and configure all required variables:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

**Required Variables:**
- `PORT` - Server port (default: 3000, NEVER 5000 or 50001)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Set to `production`
- `CORS_ORIGIN` - Comma-separated list of allowed origins (NO localhost)
- `JWT_SECRET` - Strong random secret key
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `SUMMIT_DB_HOST`, `SUMMIT_DB_PORT`, `SUMMIT_DB_NAME`, `SUMMIT_DB_USER`, `SUMMIT_DB_PASSWORD`
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`

### 2. Deploy on Linux/Unix

```bash
cd server
chmod +x start-production.sh
./start-production.sh
```

### 3. Deploy on Windows

```powershell
cd server
.\start-production.ps1
```

### 4. Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs summit-backend

# Test health endpoint
curl http://your-server:3000/health
```

## PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs summit-backend

# Restart server
pm2 restart summit-backend

# Stop server
pm2 stop summit-backend

# View detailed info
pm2 show summit-backend

# Monitor resources
pm2 monit
```

## Auto-Start on Reboot (Linux)

The startup script automatically configures PM2 to start on system boot. If you need to do it manually:

```bash
pm2 startup
# Follow the instructions shown
pm2 save
```

## Environment Variable Validation

The startup scripts automatically validate:
- ✅ Required variables are set
- ✅ PORT is not 5000 or 50001
- ✅ CORS_ORIGIN doesn't contain localhost (with warning)

## Troubleshooting

### Server won't start

1. Check environment variables:
   ```bash
   pm2 logs summit-backend --lines 50
   ```

2. Verify port is available:
   ```bash
   netstat -tulpn | grep :3000
   ```

3. Check database connectivity:
   ```bash
   # Test from server
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

### Server keeps restarting

1. Check PM2 logs for errors:
   ```bash
   pm2 logs summit-backend --err
   ```

2. Verify all environment variables are correct
3. Check database connection
4. Verify JWT_SECRET is set

### Port conflicts

If port 3000 is in use:
1. Change PORT in `.env` to another port (NOT 5000 or 50001)
2. Restart: `pm2 restart summit-backend`

## Security Checklist

- [ ] JWT_SECRET is a strong random string
- [ ] Database passwords are secure
- [ ] CORS_ORIGIN only includes production domains
- [ ] No localhost references in production config
- [ ] Firewall configured to allow only necessary ports
- [ ] HTTPS configured (via reverse proxy/load balancer)

## Monitoring

### Health Check Endpoint

The server exposes a health check endpoint:
```
GET /health
```

Returns: `{"status":"ok"}`

### PM2 Monitoring

PM2 automatically:
- Restarts on crash
- Limits memory usage (1GB)
- Logs all output
- Tracks uptime

### Log Files

Logs are stored in `server/logs/`:
- `pm2-error.log` - Error logs
- `pm2-out.log` - Standard output
- `pm2-combined.log` - Combined logs

## Updates and Redeployment

1. Pull latest code
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Restart: `pm2 restart summit-backend`

Or use the production start script which handles all steps automatically.

