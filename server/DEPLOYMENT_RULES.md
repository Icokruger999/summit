# Production Deployment Rules

## ⚠️ CRITICAL RULES - MUST FOLLOW

### 1. Server Uptime (24/7)
- ✅ Server MUST run 24/7 using PM2 process manager
- ✅ Auto-restart on failure is configured
- ✅ PM2 startup script ensures server starts on system reboot
- ✅ Use `./start-production.sh` (Linux) or `.\start-production.ps1` (Windows)

### 2. Port Restrictions
- ❌ **NEVER use port 5000**
- ❌ **NEVER use port 50001**
- ✅ Default port: 3000 (configurable via `PORT` environment variable)
- ✅ Port validation is enforced at startup

### 3. No Localhost in Production
- ❌ **NO localhost references** in production configuration
- ❌ **NO 127.0.0.1** in CORS_ORIGIN
- ✅ All URLs must be production domains
- ✅ Server listens on `0.0.0.0` (all interfaces), not `localhost`

### 4. Environment Variables
- ✅ **ALL required variables MUST be set** before deployment
- ✅ Use `.env.example` as a template
- ✅ Variables are validated at startup
- ✅ Missing variables will prevent server from starting

### 5. Local Development Files Removed
- ❌ All local development scripts removed
- ❌ Docker compose files for local dev removed
- ❌ Local LiveKit setup guides removed
- ✅ Only production deployment files remain

## Required Environment Variables

All of these MUST be set in `server/.env`:

```env
# Server Configuration
PORT=3000                    # NEVER 5000 or 50001
HOST=0.0.0.0
NODE_ENV=production

# CORS (NO localhost)
CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com

# Security
JWT_SECRET=your-very-secure-random-secret

# Database
DB_HOST=your-db-host.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=secure-password

# Summit Database (REQUIRED)
SUMMIT_DB_HOST=summit-db.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
SUMMIT_DB_PORT=5432
SUMMIT_DB_NAME=Summit
SUMMIT_DB_USER=postgres
SUMMIT_DB_PASSWORD=secure-password

# LiveKit (Production)
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-livekit-domain.com

# Summit API
SUMMIT_API_KEY=your-api-key
```

## Deployment Checklist

Before deploying, verify:

- [ ] `.env` file exists and is configured
- [ ] `PORT` is set (NOT 5000 or 50001)
- [ ] `CORS_ORIGIN` contains only production domains (NO localhost)
- [ ] `JWT_SECRET` is a strong random string
- [ ] All database credentials are correct
- [ ] `SUMMIT_DB_HOST` is set
- [ ] `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set
- [ ] PM2 is installed globally
- [ ] Server builds successfully (`npm run build`)

## Startup Validation

The production startup scripts automatically validate:
1. ✅ `.env` file exists
2. ✅ Required variables are set
3. ✅ PORT is not 5000 or 50001
4. ✅ CORS_ORIGIN doesn't contain localhost (warning)
5. ✅ PM2 is installed
6. ✅ Application builds successfully

## Enforcement

These rules are enforced in code:
- Port validation in `server/src/index.ts`
- CORS localhost filtering in `server/src/index.ts`
- Environment variable validation in startup scripts
- JWT_SECRET validation in `server/src/index.ts`

## Violations

If any rule is violated:
- ❌ Server will NOT start
- ❌ Error messages will indicate the violation
- ❌ Fix the issue and restart

## 6. Amplify Synchronization (REQUIRED)
- ✅ **Amplify frontend MUST be deployed** whenever backend is updated
- ✅ Use `deploy-full-stack.ps1` to ensure both are in sync
- ✅ Frontend connects to backend on port 3000
- ✅ Environment variables must match between backend and frontend

## Deployment Workflow

**ALWAYS use the unified deployment script:**
```powershell
.\deploy-full-stack.ps1
```

This ensures:
- ✅ Backend updated via SSM (port 3000)
- ✅ Amplify frontend deployed automatically
- ✅ Both stay in sync

See `AMPLIFY_DEPLOYMENT_RULES.md` for complete Amplify deployment rules.

## Questions?

See `PRODUCTION_DEPLOYMENT.md` for detailed deployment instructions.

