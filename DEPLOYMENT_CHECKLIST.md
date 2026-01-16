# Summit Deployment Checklist

Use this checklist to ensure everything is configured correctly before deploying.

## Pre-Deployment

### Database Setup
- [ ] PostgreSQL installed on EC2 instance
- [ ] PgBouncer installed and configured
- [ ] Database `summit` created
- [ ] User `summit_user` created with password
- [ ] Database schema initialized (`database/complete_schema.sql`)
- [ ] PgBouncer running: `sudo systemctl status pgbouncer`
- [ ] PostgreSQL running: `sudo systemctl status postgresql`
- [ ] Connection test passes: `psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 1;"`

### Backend Configuration
- [ ] Node.js 18+ installed
- [ ] PM2 installed globally: `npm install -g pm2`
- [ ] Server dependencies installed: `cd server && npm install`
- [ ] `.env` file created from `.env.example`
- [ ] Environment variables configured:
  - [ ] `DB_HOST=127.0.0.1`
  - [ ] `DB_PORT=6432`
  - [ ] `DB_NAME=summit`
  - [ ] `DB_USER=summit_user`
  - [ ] `DB_PASSWORD=<secure_password>`
  - [ ] `JWT_SECRET=<secure_random_string>`
  - [ ] `CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com`
  - [ ] `PORT=3000` (or your preferred port, NOT 5000 or 50001)
  - [ ] `NODE_ENV=production`
  - [ ] LiveKit credentials configured

### Frontend Configuration
- [ ] Frontend deployed to Amplify
- [ ] `VITE_SERVER_URL` set in Amplify environment variables
- [ ] `VITE_SERVER_URL=https://api.codingeverest.com` (or your API domain)
- [ ] Build successful
- [ ] SSL certificate active

### DNS Configuration
- [ ] `summit.codingeverest.com` points to Amplify
- [ ] `api.codingeverest.com` points to EC2 instance
- [ ] SSL certificates valid

### Nginx Configuration (if using)
- [ ] Nginx installed
- [ ] Reverse proxy configured for port 3000
- [ ] SSL configured (Let's Encrypt)
- [ ] WebSocket upgrade headers configured
- [ ] CORS headers configured

## Deployment Steps

### 1. Build Backend
```bash
cd /path/to/summit/server
npm install
npm run build
```

### 2. Start Backend with PM2
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup  # Follow instructions
```

### 3. Verify Backend
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs summit-backend --lines 50

# Test health endpoint
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### 4. Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "testpass123"
  }'
# Expected: Returns token and user data
```

### 5. Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
# Expected: Returns token and user data
```

### 6. Deploy Frontend
```bash
cd /path/to/summit/desktop
npm install
npm run build:web
# Upload dist/ to Amplify or trigger build
```

### 7. Test Frontend
- [ ] Visit `https://summit.codingeverest.com`
- [ ] Click "Sign up"
- [ ] Fill in registration form
- [ ] Submit and verify auto-login
- [ ] Check browser console for errors
- [ ] Test logout and login

## Post-Deployment Verification

### Backend Health
- [ ] Health endpoint responds: `curl https://api.codingeverest.com/health`
- [ ] PM2 process online: `pm2 status`
- [ ] No errors in logs: `pm2 logs summit-backend --lines 100`
- [ ] Database connections stable: Check PgBouncer stats

### Frontend Health
- [ ] Site loads without errors
- [ ] Registration works
- [ ] Login works
- [ ] No CORS errors in browser console
- [ ] WebSocket connects successfully
- [ ] Trial banner shows correct time remaining

### Database Health
```bash
# Check PgBouncer stats
psql -h 127.0.0.1 -p 6432 -U postgres -d pgbouncer -c "SHOW STATS;"

# Check active connections
psql -h 127.0.0.1 -p 6432 -U postgres -d pgbouncer -c "SHOW POOLS;"

# Check recent users
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;"
```

### Security Checks
- [ ] JWT_SECRET is not default value
- [ ] Database password is secure
- [ ] CORS only allows production domains
- [ ] No localhost in CORS_ORIGIN
- [ ] SSL certificates valid
- [ ] Firewall configured correctly
- [ ] Only necessary ports open

## Monitoring Setup

### PM2 Monitoring
```bash
# View real-time monitoring
pm2 monit

# View logs
pm2 logs summit-backend

# View detailed info
pm2 show summit-backend
```

### Database Monitoring
```bash
# Check database size
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT pg_size_pretty(pg_database_size('summit'));"

# Check active connections
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries (if enabled)
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### Log Monitoring
```bash
# PM2 logs
tail -f /path/to/summit/server/logs/pm2-combined.log

# PgBouncer logs
sudo tail -f /var/log/pgbouncer/pgbouncer.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Nginx logs (if using)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Issue: CORS Error
**Check:**
```bash
grep CORS_ORIGIN /path/to/summit/server/.env
pm2 logs summit-backend | grep CORS
```
**Fix:**
```bash
# Update CORS_ORIGIN in .env
nano /path/to/summit/server/.env
# Restart
pm2 restart summit-backend
```

### Issue: Database Connection Failed
**Check:**
```bash
sudo systemctl status pgbouncer
sudo systemctl status postgresql
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 1;"
```
**Fix:**
```bash
sudo systemctl start pgbouncer
sudo systemctl start postgresql
```

### Issue: Server Won't Start
**Check:**
```bash
pm2 logs summit-backend --err --lines 50
```
**Common causes:**
- Missing environment variables
- Port already in use
- Database connection failed
- JWT_SECRET not set

### Issue: Registration Fails
**Check:**
```bash
# Test endpoint directly
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","password":"test123"}'

# Check logs
pm2 logs summit-backend --lines 50
```

## Rollback Plan

If deployment fails:

1. **Stop new backend:**
   ```bash
   pm2 stop summit-backend
   ```

2. **Restore previous version:**
   ```bash
   cd /path/to/summit/server
   git checkout <previous-commit>
   npm install
   npm run build
   pm2 restart summit-backend
   ```

3. **Verify rollback:**
   ```bash
   curl http://localhost:3000/health
   pm2 logs summit-backend
   ```

## Success Criteria

✅ All checklist items completed
✅ Backend health endpoint responds
✅ Frontend loads without errors
✅ Registration works end-to-end
✅ Login works end-to-end
✅ No CORS errors
✅ Database connections stable
✅ PM2 process online and stable
✅ Logs show no errors
✅ Trial system working correctly

## Next Steps After Deployment

1. Monitor logs for first 24 hours
2. Test all major features
3. Set up automated backups
4. Configure monitoring alerts
5. Document any issues encountered
6. Update team on deployment status

## Support

For issues, check:
- [TEST_SIGNIN.md](./TEST_SIGNIN.md) - Testing guide
- [EC2_DATABASE_SETUP.md](./EC2_DATABASE_SETUP.md) - Database setup
- [REGISTRATION_UPDATE_SUMMARY.md](./REGISTRATION_UPDATE_SUMMARY.md) - Recent changes
- PM2 logs: `pm2 logs summit-backend`
- Database logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
