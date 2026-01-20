---
inclusion: always
---

# Backend Deployment Rules - CRITICAL

## NEVER DO THESE THINGS:
1. **NEVER run `npm run build`** on the production server - this can corrupt the dist folder
2. **NEVER rebuild the entire backend** - only deploy individual file changes
3. **NEVER re-enable subscription middleware** - it was disabled intentionally
4. **NEVER use port 3000** - production runs on port 4000

## Production Server Details:
- EC2 Instance: `i-0fba58db502cc8d39`
- Region: `eu-west-1`
- Backend location: `/var/www/summit/dist/`
- PM2 process: `summit-backend`
- Port: **4000** (NOT 3000)
- API URL: `https://summit.api.codingeverest.com`

## How to Deploy Backend Changes:
1. Use SSM to run commands on the server
2. Use `sed` to modify individual files in `/var/www/summit/dist/`
3. Restart PM2 after changes: `pm2 restart summit-backend`
4. Always test with `curl http://localhost:4000/health` after changes

## Example - Deploying a single file change:
```bash
# Use sed to make targeted changes
sed -i 's/old_code/new_code/g' /var/www/summit/dist/routes/somefile.js

# Restart PM2
export HOME=/home/ubuntu
pm2 restart summit-backend
```

## If Server Breaks:
1. Restore from backup with chime: `cp -r /var/www/summit-backup-with-chime-1768948233/dist/* /var/www/summit/dist/`
   (This backup has: PostgreSQL presence, Chime routes, no Supabase, no subscription middleware)
2. Restart PM2: `export HOME=/home/ubuntu && pm2 restart summit-backend`
3. Test: `curl http://localhost:4000/health`

## Available Backups:
- `/var/www/summit-backup-with-chime-1768948233/dist/` - LATEST (has Chime, PostgreSQL, no Supabase)
- `/var/www/summit-backup-clean-1768947835/dist/` - Clean (no Chime, PostgreSQL, no Supabase)
- `/var/www/summit-backup-1768663852/server/dist/` - OLD (has Supabase - don't use)

## Subscription Middleware:
The subscription check was DISABLED. If it comes back after a restore, remove it:
```bash
sed -i 's/import { checkSubscriptionAccess } from ".\\/middleware\\/subscription.js";//g' /var/www/summit/dist/index.js
sed -i 's/checkSubscriptionAccess, //g' /var/www/summit/dist/index.js
```
