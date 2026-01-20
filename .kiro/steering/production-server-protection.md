---
inclusion: always
---

# 🚨 CRITICAL: Production Server Protection Rules

## ABSOLUTE PROHIBITIONS - NEVER VIOLATE

You are an AI assistant working with a LIVE PRODUCTION SERVER. Any mistakes can cause downtime for real users.

### ⛔ NEVER DO THESE THINGS:

1. **NEVER edit files directly on the production server** (`/var/www/summit/`)
   - Do NOT use SSM commands to modify `index.js`
   - Do NOT edit `.env` files on the server
   - Do NOT modify nginx configuration files
   - All changes MUST go through local development first

2. **NEVER change these critical configurations:**
   ```javascript
   // Chime SDK - MUST have quotes around region
   region: 'us-east-1'  // ✅ CORRECT
   region: us-east-1    // ❌ WRONG - causes crash
   
   // Server port - MUST be 4000
   const PORT = 4000;
   
   // Nginx proxy - MUST point to 127.0.0.1:4000
   proxy_pass http://127.0.0.1:4000;
   
   // Database port - MUST be 6432 (PgBouncer)
   DB_PORT=6432
   ```

3. **NEVER restart services without checking health first**
   - Always run `python summit/test-health.py` before changes
   - Always run `python summit/validate-config.py` after changes
   - Monitor for at least 5 minutes after any restart

### ✅ CORRECT WORKFLOW FOR CHANGES:

1. Make changes in `summit/server/src/` (local development)
2. Test locally
3. Build: `cd summit/server && npm run build`
4. Use deployment scripts (never manual edits)
5. Validate: `python summit/validate-config.py`
6. Test health: `python summit/test-health.py`
7. Monitor for 10 minutes

### 🔍 BEFORE ANY SERVER OPERATION:

Always check these first:
```bash
python summit/check-instance-status.py
python summit/check-pm2-status.py
python summit/test-health.py
```

### 🚨 IF SERVER IS DOWN:

1. Run: `python summit/validate-config.py` to identify issues
2. If region syntax error: `python summit/fix-region-quotes.py`
3. Restart: Use the fix script, NOT manual commands
4. Verify: `python summit/test-health.py`

### 📋 AVAILABLE PROTECTION TOOLS:

- `summit/CRITICAL_SERVER_PROTECTION.md` - Full documentation
- `summit/protect-production-files.py` - Lock down files
- `summit/validate-config.py` - Check configuration
- `summit/monitor-server-health.py` - Continuous monitoring
- `summit/test-health.py` - Quick health check

### ⚠️ WHEN USER ASKS TO MODIFY SERVER:

**ALWAYS respond with:**
"I cannot modify the production server directly. This could cause downtime. Instead, I can:
1. Make changes in the local development environment
2. Test them locally
3. Create a deployment script
4. Guide you through safe deployment

Would you like me to proceed with the safe approach?"

### 🔒 FILE PROTECTION STATUS:

Production files are now READ-ONLY to prevent accidental changes:
- `/var/www/summit/index.js` - Protected
- `/var/www/summit/.env` - Protected  
- `/etc/nginx/sites-enabled/summit.api.codingeverest.com` - Protected

To make emergency changes, permissions must be explicitly changed first.

---

**REMEMBER: The production server serves REAL USERS. Downtime is NOT acceptable.**
**When in doubt, DO NOT make the change. Ask the user first.**
