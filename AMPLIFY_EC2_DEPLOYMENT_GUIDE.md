# Summit Deployment Guide: Amplify + EC2

Complete guide to deploy Summit with frontend on Amplify and backend on EC2.

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Infrastructure                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Amplify App 1 (Existing)                                       │
│  www.codingeverest.com                                          │
│  └─ Landing Page                                                │
│     └─ [Login Button] → summit.codingeverest.com               │
│                                                                   │
│  Amplify App 2 (NEW)                                            │
│  summit.codingeverest.com                                       │
│  └─ Login Page → Calls api.codingeverest.com                   │
│  └─ /app → Dashboard (after login)                             │
│                                                                   │
│  EC2 Instance                                                    │
│  api.codingeverest.com                                          │
│  ├─ Summit Backend (port 4000) → RDS                           │
│  ├─ Milo Apps (ports 3000, 5000, 5001)                         │
│  └─ Nginx (reverse proxy)                                       │
│                                                                   │
│  AWS RDS                                                         │
│  codingeverest-new...rds.amazonaws.com                          │
│  └─ Summit Database                                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

- ✅ AWS Amplify account
- ✅ EC2 instance running
- ✅ Namecheap domain access
- ✅ SSH access to EC2
- ✅ Node.js 18+ on EC2
- ✅ PM2 installed on EC2

## Part 1: EC2 Backend Setup

### Step 1: Connect to EC2

```bash
ssh ubuntu@your-ec2-ip
# or
ssh ec2-user@your-ec2-ip
```

### Step 2: Install Prerequisites (if needed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# or
sudo yum update -y  # Amazon Linux

# Install Node.js 18 (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx (if not installed)
sudo apt install -y nginx
# or
sudo yum install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 3: Deploy Summit Backend

```bash
# Create directory
sudo mkdir -p /var/www/summit
sudo chown $USER:$USER /var/www/summit

# Upload files (from your local machine)
# Option A: Using SCP
scp -r server/dist server/package*.json ubuntu@your-ec2-ip:/var/www/summit/

# Option B: Using Git (if you have a repo)
cd /var/www/summit
git clone your-summit-repo.git .
cd server
npm install --production
npm run build
```

### Step 4: Configure Environment

```bash
cd /var/www/summit

# Create .env file
nano .env
```

Paste this content (update JWT_SECRET):

```env
PORT=4000
NODE_ENV=production

DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122

JWT_SECRET=YOUR_SECURE_RANDOM_STRING_HERE

CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com

LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=wss://livekit.codingeverest.com
```

Generate secure JWT_SECRET:
```bash
openssl rand -base64 32
```

### Step 5: Install Dependencies and Start

```bash
cd /var/www/summit
npm install --production

# Start with PM2
pm2 start dist/index.js --name summit-backend
pm2 save
pm2 startup  # Follow the instructions

# Check status
pm2 status
pm2 logs summit-backend

# Test locally
curl http://localhost:4000/health
```

### Step 6: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/summit-api
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name api.codingeverest.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.codingeverest.com;

    # We'll add SSL certs in the next step
    ssl_certificate /etc/letsencrypt/live/api.codingeverest.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.codingeverest.com/privkey.pem;

    # CORS for Amplify
    add_header 'Access-Control-Allow-Origin' 'https://summit.codingeverest.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # Preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://summit.codingeverest.com' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Length' 0;
        return 204;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/summit-api /etc/nginx/sites-enabled/
sudo nginx -t
```

### Step 7: Set Up SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu
# or
sudo yum install certbot python3-certbot-nginx -y  # Amazon Linux

# Get SSL certificate (after DNS is configured)
sudo certbot --nginx -d api.codingeverest.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 8: Configure Firewall

```bash
# Allow necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 4000/tcp  # Only if needed for direct access
sudo ufw enable

# Or for Amazon Linux
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**Also configure EC2 Security Group in AWS Console:**
- Allow inbound: Port 80 (HTTP)
- Allow inbound: Port 443 (HTTPS)
- Allow inbound: Port 22 (SSH) - from your IP only

### Step 9: Reload Nginx

```bash
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx

# Test
curl https://api.codingeverest.com/api/auth/health
```

## Part 2: Namecheap DNS Configuration

### Step 1: Log into Namecheap

1. Go to namecheap.com
2. Navigate to Domain List
3. Click "Manage" next to codingeverest.com

### Step 2: Add DNS Records

Go to "Advanced DNS" tab and add these records:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | api | YOUR-EC2-IP | Automatic |
| CNAME | summit | (Amplify URL - we'll get this in Part 3) | Automatic |

**Example:**
- Type: `A Record`
- Host: `api`
- Value: `3.251.123.45` (your EC2 IP)
- TTL: `Automatic`

### Step 3: Verify DNS Propagation

Wait 5-15 minutes, then check:

```bash
# Check from your local machine
nslookup api.codingeverest.com
ping api.codingeverest.com
```

## Part 3: AWS Amplify Frontend Setup

### Step 1: Create New Amplify App

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Choose "Deploy without Git provider"
4. App name: `Summit Login`

### Step 2: Prepare Files for Upload

On your local machine:

```bash
cd amplify-summit/

# The folder should contain:
# - index.html (login page)
# - amplify.yml (build config)
# - app/ (folder with dashboard)
```

### Step 3: Update API URL

Edit `amplify-summit/index.html`:

```javascript
// Line ~176 - Update to your API domain
const API_URL = 'https://api.codingeverest.com/api';
```

Edit `amplify-summit/app/index.html`:

```javascript
// Line ~89 - Update to your API domain
const API_URL = 'https://api.codingeverest.com/api';
```

### Step 4: Deploy to Amplify

**Option A: Drag and Drop**

1. In Amplify Console, go to your new app
2. Drag the `amplify-summit` folder into the upload area
3. Wait for deployment (1-2 minutes)

**Option B: Amplify CLI**

```bash
npm install -g @aws-amplify/cli

cd amplify-summit
amplify init
amplify publish
```

### Step 5: Get Amplify URL

After deployment, you'll see a URL like:
```
https://main.d1234567890abc.amplifyapp.com
```

### Step 6: Add Custom Domain

1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Enter: `summit.codingeverest.com`
4. Follow the wizard
5. Amplify will provide CNAME records

### Step 7: Update Namecheap DNS

Go back to Namecheap DNS and update:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | summit | [Amplify-provided-value] | Automatic |

**Example:**
- Type: `CNAME`
- Host: `summit`
- Value: `d1234567890abc.amplifyapp.com`

### Step 8: Verify SSL Certificate

Amplify will automatically provision SSL certificate. Wait 5-10 minutes, then visit:

```
https://summit.codingeverest.com
```

## Part 4: Update Landing Page

### On Your Existing Amplify App (Landing Page)

Update your landing page HTML where the Summit placeholder is:

```html
<!-- Replace "Download Summit" with: -->
<a href="https://summit.codingeverest.com" 
   class="btn btn-primary"
   target="_blank">
    Login to Summit
</a>
```

Or if you want it in the same tab:

```html
<a href="https://summit.codingeverest.com" class="btn btn-primary">
    Login to Summit
</a>
```

Deploy the updated landing page to Amplify.

## Part 5: Testing

### Test 1: Backend Health Check

```bash
curl https://api.codingeverest.com/api/auth/health
# Expected: {"status":"ok"}
```

### Test 2: Login Page

Visit: `https://summit.codingeverest.com`

Should see the login page.

### Test 3: Register Account

1. Click "Create one"
2. Fill in details
3. Submit

Check browser console for any errors.

### Test 4: Login

1. Use the account you just created
2. Should redirect to `/app`
3. Should see welcome message

### Test 5: Landing Page Button

1. Visit: `https://www.codingeverest.com`
2. Click Summit login button
3. Should go to: `https://summit.codingeverest.com`

## 🎉 Success Criteria

✅ Backend running on EC2 (port 4000)
✅ API accessible at `https://api.codingeverest.com`
✅ Login page at `https://summit.codingeverest.com`
✅ Can create account
✅ Can login
✅ Landing page button works
✅ Milo apps still work (ports 3000, 5000, 5001)
✅ SSL certificates valid
✅ No CORS errors

## 🔧 Monitoring & Maintenance

### View Backend Logs

```bash
ssh ubuntu@your-ec2-ip
pm2 logs summit-backend
pm2 monit
```

### Restart Backend

```bash
pm2 restart summit-backend
```

### Update Backend

```bash
cd /var/www/summit
git pull  # or upload new files
npm install --production
npm run build
pm2 restart summit-backend
```

### Update Frontend

1. Make changes to `amplify-summit/index.html`
2. Re-upload to Amplify Console
3. Or use: `amplify publish`

### Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/summit-api-error.log
sudo tail -f /var/log/nginx/summit-api-access.log
```

## 🆘 Troubleshooting

### Backend Not Starting

```bash
pm2 logs summit-backend
# Check for database connection errors
cd /var/www/summit/database
node test-connection.cjs
```

### CORS Errors

1. Check CORS_ORIGIN in `/var/www/summit/.env`
2. Should include: `https://summit.codingeverest.com`
3. Restart: `pm2 restart summit-backend`

### SSL Certificate Issues

```bash
# Renew certificates
sudo certbot renew
sudo systemctl reload nginx
```

### DNS Not Resolving

```bash
# Check DNS
nslookup api.codingeverest.com
nslookup summit.codingeverest.com

# Wait 15-30 minutes for propagation
```

### Login Returns 502

```bash
# Check backend is running
curl http://localhost:4000/health

# Check PM2
pm2 status

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

## 📝 Quick Reference

### URLs
- Landing Page: `https://www.codingeverest.com`
- Summit Login: `https://summit.codingeverest.com`
- Summit API: `https://api.codingeverest.com`
- Summit App: `https://summit.codingeverest.com/app`

### Ports
- Summit Backend: 4000 (internal)
- Milo: 3000, 5000, 5001 (unchanged)
- Nginx: 80, 443 (external)

### SSH Commands
```bash
ssh ubuntu@your-ec2-ip
cd /var/www/summit
pm2 status
pm2 logs summit-backend
sudo systemctl reload nginx
```

---

**Need Help?**
- Backend logs: `pm2 logs summit-backend`
- Nginx logs: `sudo tail -f /var/log/nginx/summit-api-error.log`
- Test API: `curl https://api.codingeverest.com/api/auth/health`

