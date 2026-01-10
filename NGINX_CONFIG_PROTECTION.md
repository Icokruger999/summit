# Nginx Configuration Protection

## Why Nginx Config is Safe from Other Deployments

### ✅ Config is Protected

**The nginx configuration will NOT be overwritten by backend deployments because:**

1. **Separate Deployment Scripts**
   - `deploy-summit-backend.json` - Only deploys backend code (server/)
   - `deploy-nginx-config.json` - Only deploys nginx config
   - These are separate and independent

2. **Backend Deployment Process**
   ```bash
   # deploy-summit-backend.json only does:
   cd /var/www/summit
   git pull origin main
   cd server
   npm run build
   pm2 restart summit
   ```
   - **Does NOT touch nginx config**
   - Only affects backend code

3. **Nginx Config is in Root Directory**
   - File: `summit-api-nginx.conf` (in repository root)
   - Backend deployments only change files in `server/` directory
   - Nginx config remains untouched

4. **Config is Preserved in GitHub**
   - File: `summit-api-nginx.conf`
   - Always available in repository
   - Can redeploy anytime

### 🔒 Backup Protection

**When deploying nginx config:**
1. Creates backup: `/etc/nginx/sites-available/summit-api.backup.TIMESTAMP`
2. If deployment fails, backup is restored
3. Multiple backups can exist (timestamped)

### 📝 Deployment Process

**To deploy nginx config:**
```bash
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters file://deploy-nginx-config.json \
  --region eu-west-1
```

**What it does:**
1. ✅ Backs up existing config
2. ✅ Pulls latest from GitHub
3. ✅ Verifies config file exists
4. ✅ Copies to `/etc/nginx/sites-available/summit-api`
5. ✅ Tests nginx syntax
6. ✅ Reloads nginx (if test passes)
7. ✅ Verifies WebSocket location exists
8. ✅ Restores backup if deployment fails

### 🚫 What Won't Overwrite It

- ✅ Backend deployments (`deploy-summit-backend.json`)
- ✅ Git pull (only reads, doesn't write to nginx)
- ✅ npm build (only affects server/dist/)
- ✅ pm2 restart (only restarts backend process)

### ⚠️ What WILL Overwrite It

- ❌ Running `deploy-nginx-config.json` again (intentional)
- ❌ Manual nginx config edits (intentional)
- ❌ Other nginx deployment scripts (if created)

### ✅ Best Practices

1. **Always backup before changes**
   - Script automatically creates backup

2. **Verify after deployment**
   - Script verifies WebSocket location exists

3. **Test before reloading**
   - Script tests nginx syntax first

4. **Keep config in GitHub**
   - File: `summit-api-nginx.conf`
   - Source of truth for nginx configuration

## File Locations

### On Server:
- Active config: `/etc/nginx/sites-available/summit-api`
- Backups: `/etc/nginx/sites-available/summit-api.backup.*`

### In GitHub:
- Source config: `summit-api-nginx.conf` (repository root)

## Redeployment

**To redeploy nginx config (updates):**
```bash
# Make changes to summit-api-nginx.conf in GitHub
git add summit-api-nginx.conf
git commit -m "Update: nginx config changes"
git push origin main

# Deploy to server
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters file://deploy-nginx-config.json \
  --region eu-west-1
```

## Verification

**Check if WebSocket config is deployed:**
```bash
# SSH into server or use SSM:
grep -A 5 'location /ws' /etc/nginx/sites-available/summit-api

# Should show:
# location /ws {
#     proxy_pass http://127.0.0.1:4000;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection "upgrade";
#     ...
```

