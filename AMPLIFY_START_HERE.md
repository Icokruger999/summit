# 🎉 Summit Amplify + EC2 Setup - Ready!

Everything is ready to deploy Summit with frontend on Amplify and backend on EC2!

## 🎯 Your Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    After Deployment                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Landing Page (Amplify - Existing)                          │
│  www.codingeverest.com                                      │
│      └─ [Login Button] ──────┐                             │
│                                │                             │
│  Summit Frontend (Amplify - NEW)                            │
│  summit.codingeverest.com      │                            │
│      ├─ Login Page ←───────────┘                            │
│      └─ Dashboard                                           │
│          │                                                   │
│          │ API Calls                                        │
│          ↓                                                   │
│  Backend API (EC2)                                          │
│  api.codingeverest.com                                      │
│      ├─ Summit Backend (port 4000)                          │
│      ├─ Milo (ports 3000, 5000, 5001)                       │
│      └─ Connects to AWS RDS                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Files Created for You

### Amplify Frontend Files
```
amplify-summit/
├── index.html              ← Login page (ready to deploy)
├── app/index.html          ← Dashboard after login
├── amplify.yml             ← Amplify build config
└── README.md               ← Amplify deployment guide
```

### EC2 Backend Files
```
ec2-deployment/
├── nginx-ec2-summit.conf   ← Nginx config for EC2
└── env-template.txt        ← Environment variables template
```

### Landing Page Integration
```
LANDING_PAGE_BUTTON_CODE.html   ← 5 button design options
```

### Documentation
```
📘 AMPLIFY_EC2_DEPLOYMENT_GUIDE.md  ← Complete step-by-step guide
📘 QUICK_SETUP.md                   ← Fast 15-minute setup
📘 AMPLIFY_START_HERE.md            ← This file
```

## 🚀 Quick Start (Choose Your Path)

### Path 1: Super Quick (15 minutes) ⚡
**Follow:** `QUICK_SETUP.md`
- Fastest way to get running
- Essential steps only
- Perfect for testing

### Path 2: Complete Guide (30 minutes) 📚
**Follow:** `AMPLIFY_EC2_DEPLOYMENT_GUIDE.md`
- Detailed explanations
- Security best practices
- Production-ready
- Troubleshooting included

## 🎬 Deployment Steps Overview

### 1. Deploy Backend to EC2
- Upload files to `/var/www/summit`
- Configure environment variables
- Start with PM2
- Backend runs on port 4000

### 2. Configure DNS (Namecheap)
- Add A record: `api` → Your EC2 IP
- Add CNAME: `summit` → Amplify URL
- Wait 5-15 minutes

### 3. Set Up Nginx + SSL
- Configure reverse proxy
- Get Let's Encrypt SSL
- Enable CORS for Amplify

### 4. Deploy Frontend to Amplify
- Update API URL in HTML files
- Upload `amplify-summit` folder
- Add custom domain
- Amplify handles SSL automatically

### 5. Update Landing Page
- Add Summit login button
- Use designs from `LANDING_PAGE_BUTTON_CODE.html`
- Deploy updated landing page

## 📋 What You Need

Before starting:

- ✅ AWS Amplify account
- ✅ EC2 instance IP address (where Milo runs)
- ✅ SSH access to EC2
- ✅ Namecheap login credentials
- ✅ 30 minutes of time

## 🔧 Configuration Summary

### URLs You'll Use

| Purpose | URL |
|---------|-----|
| Landing Page | https://www.codingeverest.com |
| Summit Login | https://summit.codingeverest.com |
| Summit API | https://api.codingeverest.com |
| EC2 Backend | Port 4000 (internal only) |

### DNS Records (Namecheap)

| Type | Host | Value |
|------|------|-------|
| A Record | api | YOUR-EC2-IP |
| CNAME | summit | [Amplify provides this] |

### Ports

| Application | Port | Access |
|-------------|------|--------|
| Summit Backend | 4000 | Internal only |
| Milo Apps | 3000, 5000, 5001 | Unchanged |
| Nginx | 80, 443 | External (HTTPS) |

## 📝 Before You Deploy

### On Your EC2 Instance

Check these are installed:
```bash
node --version    # Should be 18+
npm --version
pm2 --version
nginx -v
```

If missing, install:
```bash
# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx
```

### Update API URLs

Before deploying to Amplify, edit these files:

**`amplify-summit/index.html` line ~176:**
```javascript
const API_URL = 'https://api.codingeverest.com/api';
```

**`amplify-summit/app/index.html` line ~89:**
```javascript
const API_URL = 'https://api.codingeverest.com/api';
```

## 🎨 Landing Page Button

Choose one design from `LANDING_PAGE_BUTTON_CODE.html`:

**Simple version:**
```html
<a href="https://summit.codingeverest.com" class="btn">
    Login to Summit
</a>
```

**Feature card version:**
```html
<div class="summit-card">
    <h3>Summit</h3>
    <p>Enterprise video conferencing</p>
    <a href="https://summit.codingeverest.com" class="btn">
        Access Summit
    </a>
</div>
```

## ✅ Success Checklist

After deployment, verify:

- [ ] Backend running: `pm2 status`
- [ ] API works: `curl https://api.codingeverest.com/api/auth/health`
- [ ] Login page loads: Visit `https://summit.codingeverest.com`
- [ ] Can create account
- [ ] Can login
- [ ] Dashboard shows after login
- [ ] Landing page button works
- [ ] Milo apps still work
- [ ] No CORS errors in browser console

## 🆘 Quick Troubleshooting

### Backend Issues
```bash
ssh ubuntu@YOUR-EC2-IP
pm2 logs summit-backend
```

### CORS Errors
```bash
# On EC2, edit .env
nano /var/www/summit/.env
# Ensure: CORS_ORIGIN=https://summit.codingeverest.com
pm2 restart summit-backend
```

### DNS Not Resolving
```bash
nslookup api.codingeverest.com
nslookup summit.codingeverest.com
# Wait 15-30 minutes for propagation
```

### Login Page 502 Error
```bash
# Check backend is running
curl http://localhost:4000/health

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

## 📚 File Reference

| File | Purpose |
|------|---------|
| `amplify-summit/index.html` | Login page for Amplify |
| `amplify-summit/app/index.html` | Dashboard page |
| `amplify-summit/amplify.yml` | Amplify build config |
| `ec2-deployment/nginx-ec2-summit.conf` | Nginx configuration |
| `ec2-deployment/env-template.txt` | Environment variables |
| `LANDING_PAGE_BUTTON_CODE.html` | Button designs |
| `QUICK_SETUP.md` | Fast 15-min guide |
| `AMPLIFY_EC2_DEPLOYMENT_GUIDE.md` | Complete guide |

## 🎯 Key Differences from Previous Approach

**Previous Plan:** Everything on one server
**Current Plan:** Frontend on Amplify, Backend on EC2

**Benefits:**
- ✅ Separate concerns (frontend/backend)
- ✅ Amplify handles CDN, SSL, scaling
- ✅ Backend stays on EC2 with RDS access
- ✅ Easy to update frontend independently
- ✅ Better for your Amplify-based infrastructure

**Considerations:**
- Need CORS configuration (included)
- DNS setup for api.codingeverest.com
- API URL in frontend points to api.codingeverest.com

## 🚀 Ready to Deploy?

1. **Quick:** Start with `QUICK_SETUP.md`
2. **Thorough:** Follow `AMPLIFY_EC2_DEPLOYMENT_GUIDE.md`
3. **Help:** Check troubleshooting sections in guides

## 🔒 Security Notes

- ✅ Port 4000 not exposed externally
- ✅ Nginx proxies API requests
- ✅ SSL on both Amplify and EC2
- ✅ CORS restricted to your domains
- ✅ JWT authentication
- ✅ Separate frontend/backend

## 📞 Support

If you need help:

1. Check `AMPLIFY_EC2_DEPLOYMENT_GUIDE.md`
2. View logs: `pm2 logs summit-backend`
3. Check Nginx: `sudo tail -f /var/log/nginx/error.log`
4. Test API: `curl https://api.codingeverest.com/api/auth/health`

---

## 🎉 What's Next?

After successful deployment:

1. Users visit www.codingeverest.com
2. Click "Login to Summit"
3. Go to summit.codingeverest.com
4. Create account or login
5. Access Summit features!

**Your Milo apps continue working normally on their ports!**

---

**Ready?** Open `QUICK_SETUP.md` or `AMPLIFY_EC2_DEPLOYMENT_GUIDE.md` and let's deploy! 🚀

