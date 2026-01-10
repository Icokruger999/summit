# Deploy Summit to Your EC2 Instance

**EC2 Instance**: codingeverest (i-06bc5b2218c041802)
**DNS**: Route 53 (same setup as Milo)

## 🎯 Plan

1. Deploy Summit backend to EC2 on port 4000 (Milo uses 3000, 5000, 5001)
2. Configure Nginx for api.codingeverest.com
3. Set up Route 53 DNS records
4. Deploy frontend to Amplify
5. Update landing page button

---

## Part 1: EC2 Backend Deployment

### Step 1: Connect to EC2

```bash
# Get your EC2 IP first (from AWS Console)
# Then SSH:
ssh -i your-key.pem ubuntu@YOUR-EC2-IP
# or
ssh -i your-key.pem ec2-user@YOUR-EC2-IP
```

### Step 2: Check Current Setup (Don't Touch Milo!)

```bash
# See what's running
pm2 list

# Check ports in use
sudo netstat -tlnp | grep LISTEN

# This should show Milo on ports 3000, 5000, 5001
# We'll use port 4000 for Summit
```

### Step 3: Create Summit Directory

```bash
# Create new directory (separate from Milo)
sudo mkdir -p /var/www/summit
sudo chown $USER:$USER /var/www/summit
```

### Step 4: Upload Backend Files

**From your local machine** (in a new terminal):

```bash
# Navigate to your project
cd C:\CodingE-Chat

# Build the backend
cd server
npm install
npm run build

# Create a deployment package
mkdir deploy-package
cp -r dist deploy-package/
cp package.json package-lock.json deploy-package/

# Upload to EC2 (replace with your key and IP)
scp -i your-key.pem -r deploy-package/* ubuntu@YOUR-EC2-IP:/var/www/summit/
```

Or use WinSCP/FileZilla to upload these files to `/var/www/summit/`

### Step 5: Configure Environment

**Back on EC2:**

```bash
cd /var/www/summit

# Create .env file
cat > .env << 'EOF'
PORT=4000
NODE_ENV=production

# Database (AWS RDS)
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122

# Generate secure JWT secret
JWT_SECRET=REPLACE_WITH_SECURE_STRING

# CORS (allow Amplify)
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com

# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=wss://livekit.codingeverest.com
EOF

# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/REPLACE_WITH_SECURE_STRING/$JWT_SECRET/" .env

# Install dependencies
npm install --production

# Start with PM2 (won't affect Milo)
pm2 start dist/index.js --name summit-backend
pm2 save

# Verify
pm2 list
curl http://localhost:4000/health
```

### Step 6: Configure Nginx

**Check existing Nginx config first:**

```bash
# See existing sites
ls -la /etc/nginx/sites-enabled/

# Backup existing config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
```

**Create new Summit API config:**

```bash
sudo nano /etc/nginx/sites-available/summit-api
```

**Paste this (won't affect Milo):**

```nginx
# Summit API Backend
server {
    listen 80;
    server_name api.codingeverest.com;
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS for Amplify
        add_header 'Access-Control-Allow-Origin' 'https://summit.codingeverest.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
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

**Enable and test:**

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/summit-api /etc/nginx/sites-enabled/

# Test config (make sure no errors)
sudo nginx -t

# If OK, reload
sudo systemctl reload nginx

# Check it's working
curl http://localhost/api/auth/health
```

### Step 7: Set Up SSL

```bash
# Install certbot if not already
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate for api.codingeverest.com
# (Do this AFTER Route 53 DNS is configured)
sudo certbot --nginx -d api.codingeverest.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 8: Check Everything Still Works

```bash
# Check all services
pm2 list

# Should see:
# - Your Milo apps (unchanged)
# - summit-backend (new, port 4000)

# Check ports
sudo netstat -tlnp | grep LISTEN
# Should show: 3000, 4000, 5000, 5001 all running
```

---

## Part 2: Route 53 DNS Configuration

### In AWS Console → Route 53:

1. Go to Route 53
2. Select your hosted zone: `codingeverest.com`
3. Create record:

**For API:**
```
Record name: api
Record type: A
Value: [Your EC2 instance IP]
Routing policy: Simple
TTL: 300
```

**For Summit frontend (after Amplify deployment):**
```
Record name: summit
Record type: CNAME or A (Amplify will tell you)
Value: [Amplify provides this]
```

---

## Part 3: Prepare Amplify Frontend Files

**Update API URL in files:**

1. Edit `amplify-summit/index.html` around line 176:
```javascript
const API_URL = 'https://api.codingeverest.com/api';
```

2. Edit `amplify-summit/app/index.html` around line 89:
```javascript
const API_URL = 'https://api.codingeverest.com/api';
```

---

## Part 4: Deploy to Amplify

**I cannot directly create the Amplify app, but here's what to do:**

### Option A: Amplify Console (Drag & Drop)

1. Go to **AWS Amplify Console**
2. Click **"New app"** → **"Host web app"**
3. Choose **"Deploy without Git provider"**
4. App name: **"Summit Login"**
5. Drag the entire `amplify-summit` folder
6. Click **"Save and deploy"**
7. Wait 2-3 minutes

### Option B: ZIP Upload

```bash
# Create ZIP
cd amplify-summit
zip -r summit-frontend.zip .

# Upload in Amplify Console
```

### After Deployment:

1. **Get the Amplify URL** (something like `d123456.amplifyapp.com`)
2. **Add custom domain**:
   - In Amplify → Domain management
   - Add domain: `summit.codingeverest.com`
   - Amplify will provide DNS values
3. **Update Route 53**:
   - Add the CNAME/A record Amplify provides

---

## Part 5: Update Landing Page

**In your existing Amplify landing page app**, add this button where you want it:

```html
<a href="https://summit.codingeverest.com" 
   class="btn btn-primary"
   style="padding: 12px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
    Login to Summit →
</a>
```

Or use one of the designs from `LANDING_PAGE_BUTTON_CODE.html`

---

## ✅ Verification Checklist

After all steps:

- [ ] EC2: `pm2 list` shows summit-backend running
- [ ] EC2: Milo apps still running (unchanged)
- [ ] EC2: `curl http://localhost:4000/health` returns OK
- [ ] Nginx: `sudo nginx -t` has no errors
- [ ] DNS: `nslookup api.codingeverest.com` resolves
- [ ] API: `curl https://api.codingeverest.com/api/auth/health` returns OK
- [ ] Amplify: App deployed successfully
- [ ] DNS: `nslookup summit.codingeverest.com` resolves
- [ ] Frontend: Can visit `https://summit.codingeverest.com`
- [ ] Login: Can create account and login
- [ ] Landing: Button works from main site

---

## 🆘 Troubleshooting

### Backend Won't Start

```bash
pm2 logs summit-backend
# Check for errors
```

### Port Already in Use

```bash
sudo netstat -tlnp | grep 4000
# If something is on 4000, change PORT in .env to 4001
```

### Nginx Conflicts

```bash
# Test config
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/error.log
```

### DNS Not Resolving

```bash
# Check Route 53 records
nslookup api.codingeverest.com
nslookup summit.codingeverest.com

# Wait 5-10 minutes for DNS propagation
```

---

## 📝 Quick Commands Reference

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@EC2-IP

# Check services
pm2 list
pm2 logs summit-backend

# Restart Summit (won't affect Milo)
pm2 restart summit-backend

# Check Nginx
sudo nginx -t
sudo systemctl reload nginx

# View logs
pm2 logs summit-backend --lines 100
sudo tail -f /var/log/nginx/error.log
```

---

## 🎉 Success!

When everything works:
- Users visit www.codingeverest.com
- Click "Login to Summit" button
- Go to summit.codingeverest.com (Amplify)
- Login/register
- Frontend calls api.codingeverest.com (EC2 port 4000)
- Milo continues running normally on ports 3000, 5000, 5001

**No interference with Milo!** ✅

