# Production Server Deployment

## ⚠️ This is a Production Server

This server is configured for **production deployment only**. It runs 24/7 with PM2 process manager.

## Quick Start (Production)

### Linux/Unix:
```bash
cd server
./start-production.sh
```

### Windows:
```powershell
cd server
.\start-production.ps1
```

## Requirements

1. **PM2 installed**: `npm install -g pm2`
2. **Environment variables configured** in `server/.env`
3. **All required variables set** (see `server/.env.example`)

## Key Rules

- ✅ Server runs 24/7 with auto-restart
- ✅ Never uses ports 5000 or 50001
- ✅ No localhost in production configuration
- ✅ Environment variables must be set before deployment

## Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

**Required:**
- `PORT` - Server port (default: 3000, NEVER 5000 or 50001)
- `NODE_ENV=production`
- `CORS_ORIGIN` - Production domains only (NO localhost)
- `JWT_SECRET` - Strong random secret
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `SUMMIT_DB_HOST`, `SUMMIT_DB_PORT`, `SUMMIT_DB_NAME`, `SUMMIT_DB_USER`, `SUMMIT_DB_PASSWORD`
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`

## Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs summit-backend

# Test health endpoint
curl http://your-server:3000/health
```

## Management Commands

```bash
pm2 status                 # Check status
pm2 logs summit-backend   # View logs
pm2 restart summit-backend # Restart
pm2 stop summit-backend   # Stop
```

## Full Documentation

See `server/PRODUCTION_DEPLOYMENT.md` for complete deployment guide.

