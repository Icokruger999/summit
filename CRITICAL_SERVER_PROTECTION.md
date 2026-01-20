# 🚨 CRITICAL SERVER PROTECTION RULES 🚨

## ⛔ ABSOLUTE PROHIBITIONS - NEVER VIOLATE THESE

### 1. NEVER EDIT PRODUCTION SERVER FILES DIRECTLY
- **NEVER** modify `/var/www/summit/index.js` on the production server
- **NEVER** edit nginx configuration files on the server
- **NEVER** change environment variables in production `.env`
- **NEVER** restart services without explicit approval

### 2. PROTECTED CONFIGURATION VALUES
These values are LOCKED and must NEVER be changed:

```javascript
// Chime SDK Configuration - DO NOT MODIFY
region: 'us-east-1'  // MUST have quotes

// Database Configuration - DO NOT MODIFY
host: process.env.DB_HOST || '127.0.0.1'
port: parseInt(process.env.DB_PORT || '6432')

// Server Port - DO NOT MODIFY
PORT: 4000  // nginx proxies to this port

// Nginx Proxy Configuration - DO NOT MODIFY
proxy_pass http://127.0.0.1:4000;
```

### 3. DEPLOYMENT RULES
- All changes MUST go through the local `summit/server/` directory first
- Build and test locally before any deployment
- Use deployment scripts only - never manual edits
- Always create backups before deployment

### 4. MONITORING REQUIREMENTS
- Server must be monitored 24/7
- Automatic restart on failure (PM2 handles this)
- Health checks every 5 minutes
- Alert on any downtime

## 🔒 PROTECTION MECHANISMS

### File Protection Script
Location: `summit/protect-production-files.py`
- Makes critical files read-only
- Prevents accidental modifications
- Run after every deployment

### Health Monitor
Location: `summit/monitor-server-health.py`
- Checks server status every 5 minutes
- Auto-restarts if down
- Sends alerts on issues

### Configuration Validator
Location: `summit/validate-config.py`
- Validates all config files before deployment
- Checks for syntax errors
- Ensures required values are present

## 📋 EMERGENCY RECOVERY

If server goes down:
1. Run: `python summit/check-instance-status.py`
2. Run: `python summit/check-pm2-status.py`
3. Check logs: `python summit/check-nginx-config.py`
4. If needed: `python summit/fix-region-quotes.py`

## ⚠️ COMMON MISTAKES TO AVOID

1. ❌ Editing files via SSM/SSH directly
2. ❌ Changing region without quotes: `region: us-east-1`
3. ❌ Modifying nginx config without testing
4. ❌ Restarting services during peak hours
5. ❌ Deploying without backup

## ✅ CORRECT WORKFLOW

1. Make changes in `summit/server/src/`
2. Test locally
3. Build: `npm run build`
4. Deploy using deployment script
5. Verify health endpoint
6. Monitor for 10 minutes

---

**REMEMBER: The production server is LIVE. Any downtime affects real users.**
**When in doubt, DON'T make the change. Ask first.**
