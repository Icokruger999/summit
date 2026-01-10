# Summit Web Deployment Checklist

Use this checklist to deploy Summit to www.codingeverest.com

## ✅ Pre-Deployment

- [ ] Review `QUICK_START_SUMMIT_WEB.md` for overview
- [ ] Verify AWS RDS database is accessible
- [ ] Ensure you have SSH access to web server
- [ ] Confirm Milo apps are running on ports 3000, 5000, 5001
- [ ] Install PM2 on server: `npm install -g pm2`

## 🔧 Configuration

- [ ] Copy `server/.env.production` to `server/.env`
- [ ] Generate secure JWT_SECRET: `openssl rand -base64 32`
- [ ] Update JWT_SECRET in `server/.env`
- [ ] Verify database credentials in `.env`
- [ ] Update CORS_ORIGIN to your domain

## 🏗️ Build & Deploy

- [ ] Build backend: `cd server && npm install && npm run build`
- [ ] Deploy files to server (use `deploy-summit-web.sh` or manual SCP)
- [ ] Install dependencies on server: `npm install --production`
- [ ] Make startup script executable: `chmod +x start-production.sh`

## 🌐 Nginx Configuration

- [ ] Copy `nginx-summit.conf` to server
- [ ] Add to Nginx config or include file
- [ ] Test Nginx config: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] Verify no errors in Nginx logs

## 🚀 Start Services

- [ ] Start Summit backend: `./start-production.sh` or `pm2 start dist/index.js --name summit-backend`
- [ ] Verify PM2 status: `pm2 status`
- [ ] Check backend logs: `pm2 logs summit-backend`
- [ ] Save PM2 config: `pm2 save`
- [ ] Enable PM2 startup: `pm2 startup` (follow instructions)

## 🧪 Testing

### Backend Tests
- [ ] Local health check: `curl http://localhost:4000/health`
- [ ] Remote health check: `curl https://www.codingeverest.com/summit/api/auth/health`
- [ ] Check response: Should return `{"status":"ok"}`

### Web Interface Tests
- [ ] Login page loads: `https://www.codingeverest.com/summit/login`
- [ ] Page displays correctly on desktop
- [ ] Page displays correctly on mobile
- [ ] No console errors in browser

### Authentication Tests
- [ ] Create new account via web interface
- [ ] Verify account created in database
- [ ] Login with new account
- [ ] Verify JWT token stored in localStorage
- [ ] Test logout/login again

### Integration Tests
- [ ] WebSocket connection works
- [ ] API calls work from web interface
- [ ] Database queries work
- [ ] File uploads work (if applicable)

## 🎨 Landing Page Update

- [ ] Open your codingeverest.com landing page source
- [ ] Locate "Download Summit" placeholder
- [ ] Replace with login button (see `web-login/landing-page-snippet.html`)
- [ ] Test button link: `/summit/login`
- [ ] Verify button styling matches your site
- [ ] Deploy landing page changes

## 🔒 Security Verification

- [ ] Port 4000 NOT accessible from internet
- [ ] HTTPS works (not HTTP)
- [ ] SSL certificates valid
- [ ] CORS configured correctly
- [ ] JWT_SECRET is strong and unique
- [ ] Database credentials secured
- [ ] Firewall rules in place

## ✅ Final Checks

### Service Status
- [ ] Summit backend running: `pm2 status`
- [ ] No errors in logs: `pm2 logs summit-backend --lines 50`
- [ ] Milo apps still working on original ports
- [ ] LiveKit running (if applicable)

### URLs Working
- [ ] https://www.codingeverest.com/summit/login
- [ ] https://www.codingeverest.com/summit/api/auth/health
- [ ] https://www.codingeverest.com (main site)
- [ ] Your Milo app URLs

### Database
- [ ] Can connect to AWS RDS
- [ ] Tables exist and are correct
- [ ] Test user account created successfully

## 📊 Monitoring Setup

- [ ] Set up log rotation for PM2
- [ ] Configure error alerts (optional)
- [ ] Set up uptime monitoring (optional)
- [ ] Configure database backups
- [ ] Document recovery procedures

## 📝 Documentation

- [ ] Update internal docs with Summit URL
- [ ] Create user guide for login process
- [ ] Document admin procedures
- [ ] Save deployment credentials securely

## 🎉 Launch

- [ ] Announce Summit availability
- [ ] Share login URL with team
- [ ] Monitor logs for issues
- [ ] Gather user feedback

## 🆘 Rollback Plan (If Needed)

If something goes wrong:

```bash
# Stop Summit backend
pm2 stop summit-backend
pm2 delete summit-backend

# Remove Nginx configuration
sudo rm /etc/nginx/conf.d/summit-locations.conf
sudo nginx -t
sudo systemctl reload nginx

# Milo apps should continue working normally
```

## 📞 Support Resources

- **Quick Start**: `QUICK_START_SUMMIT_WEB.md`
- **Full Guide**: `SUMMIT_WEB_INTEGRATION.md`
- **Web Login**: `web-login/README.md`
- **Server Logs**: `pm2 logs summit-backend`
- **Nginx Logs**: `/var/log/nginx/error.log`

## 🔄 Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Verify user registrations work
- [ ] Test video calls (if applicable)
- [ ] Optimize performance if needed
- [ ] Schedule regular backups

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Summit URL**: https://www.codingeverest.com/summit/login

**Backend Port**: 4000 (internal only)

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Issues

**Notes**:
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

