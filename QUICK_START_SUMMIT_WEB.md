# Quick Start: Summit Web Integration

This is a quick reference guide to get Summit running on www.codingeverest.com.

## 🎯 What Changed

1. **Port Changed**: Summit backend now uses port **4000** (was 3000) to avoid Milo conflicts
2. **New Web Login**: Professional login page at `/summit/login`
3. **API Endpoints**: All APIs accessible via `/summit/api/*`
4. **AWS RDS**: Already configured to use your existing database

## 🚀 Quick Deploy (5 minutes)

### On Your Development Machine:

```bash
# 1. Build the backend
cd server
npm install
npm run build

# 2. Create production environment file
cp .env.production .env
# Edit .env and change JWT_SECRET to something secure

# 3. Deploy files to server (choose one method):

# Method A: Using the deployment script
./deploy-summit-web.sh ubuntu codingeverest.com /var/www/summit

# Method B: Manual SCP
scp -r server/dist server/package*.json server/.env \
  your-user@codingeverest.com:/var/www/summit/
scp -r web-login nginx-summit.conf \
  your-user@codingeverest.com:/var/www/summit/
```

### On Your Server:

```bash
# 1. SSH into your server
ssh your-user@codingeverest.com

# 2. Install dependencies
cd /var/www/summit
npm install --production

# 3. Configure Nginx
sudo cp nginx-summit.conf /etc/nginx/conf.d/summit-locations.conf
sudo nginx -t
sudo systemctl reload nginx

# 4. Start Summit
pm2 start dist/index.js --name summit-backend
pm2 save

# 5. Test it
curl http://localhost:4000/health
curl https://www.codingeverest.com/summit/api/auth/health
```

## 🌐 Update Your Landing Page

Add this to your landing page where you want the Summit login button:

```html
<a href="/summit/login" class="btn btn-primary">Login to Summit</a>
```

See `web-login/landing-page-snippet.html` for more styling options.

## ✅ Test Checklist

- [ ] Backend running on port 4000: `pm2 status`
- [ ] Health check works: `curl http://localhost:4000/health`
- [ ] Nginx proxy works: `curl https://www.codingeverest.com/summit/api/auth/health`
- [ ] Login page loads: Open `https://www.codingeverest.com/summit/login`
- [ ] Can create account
- [ ] Can login
- [ ] Milo apps still work (ports 3000, 5000, 5001)

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `server/.env` | Environment variables (DB, JWT, etc.) |
| `nginx-summit.conf` | Nginx reverse proxy config |
| `web-login/index.html` | Login page |
| `server/start-production.sh` | Production startup script |

## 📊 Port Map

```
Milo Apps:     3000, 5000, 5001  (unchanged)
Summit API:    4000              (NEW - no external access)
LiveKit:       7880              (optional)

External URLs:
https://www.codingeverest.com/summit/login    → Web login page
https://www.codingeverest.com/summit/api      → Proxies to :4000
https://www.codingeverest.com/summit/ws       → WebSocket proxy
```

## 🛠️ Common Commands

```bash
# View logs
pm2 logs summit-backend

# Restart Summit
pm2 restart summit-backend

# Stop Summit
pm2 stop summit-backend

# Check what's running
pm2 status

# Test API directly
curl http://localhost:4000/health

# Test via Nginx
curl https://www.codingeverest.com/summit/api/auth/health

# Check Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔒 Security Notes

1. **Change JWT_SECRET** in `.env` to a random string
2. **Firewall**: Port 4000 should NOT be accessible externally
3. **SSL**: Nginx handles HTTPS termination
4. **CORS**: Configured for codingeverest.com only

## 🆘 Troubleshooting

**Backend won't start?**
```bash
pm2 logs summit-backend
# Check database connection in logs
```

**502 Bad Gateway?**
```bash
# Check if backend is running
pm2 status
curl http://localhost:4000/health
```

**Login page not found?**
```bash
# Check file location
ls -la /var/www/summit/web-login/
# Check Nginx config
sudo nginx -t
```

**Can't connect to database?**
```bash
# Test database connectivity
cd /var/www/summit/database
node test-connection.cjs
```

## 📚 Full Documentation

For detailed information, see: `SUMMIT_WEB_INTEGRATION.md`

## 🎉 Success!

If everything works, you should be able to:

1. Visit https://www.codingeverest.com
2. Click the Summit login button
3. Create an account or login
4. Access Summit features

Your Milo applications continue to work normally on their original ports!

