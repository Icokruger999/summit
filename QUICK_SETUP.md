# Summit Quick Setup - Amplify + EC2

**Fast track deployment guide - 15 minutes**

## 🎯 What You Need

- ✅ AWS Amplify account
- ✅ EC2 instance IP address
- ✅ Namecheap login
- ✅ SSH access to EC2

## ⚡ 3-Step Deployment

### Step 1: Deploy Backend to EC2 (5 minutes)

```bash
# SSH into EC2
ssh ubuntu@YOUR-EC2-IP

# Install PM2 if needed
sudo npm install -g pm2

# Create directory
sudo mkdir -p /var/www/summit
sudo chown $USER:$USER /var/www/summit
```

Upload files from your local machine:

```bash
# From your local machine (in project root)
cd server
npm install
npm run build

# Upload to EC2
scp -r dist package*.json ubuntu@YOUR-EC2-IP:/var/www/summit/
```

Back on EC2:

```bash
cd /var/www/summit

# Create .env file
cat > .env << 'EOF'
PORT=4000
NODE_ENV=production
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=wss://livekit.codingeverest.com
EOF

# Install and start
npm install --production
pm2 start dist/index.js --name summit-backend
pm2 save

# Test
curl http://localhost:4000/health
```

### Step 2: Configure DNS (2 minutes)

**Namecheap:**

1. Log into Namecheap
2. Domain List → Manage codingeverest.com
3. Advanced DNS → Add Record:

```
Type: A Record
Host: api
Value: YOUR-EC2-IP
TTL: Automatic
```

Wait 5 minutes, then test:

```bash
nslookup api.codingeverest.com
```

### Step 3: Deploy Frontend to Amplify (5 minutes)

**Update API URL first:**

Edit `amplify-summit/index.html` line ~176:
```javascript
const API_URL = 'https://api.codingeverest.com/api';
```

Edit `amplify-summit/app/index.html` line ~89:
```javascript
const API_URL = 'https://api.codingeverest.com/api';
```

**Deploy:**

1. Go to AWS Amplify Console
2. New app → Deploy without Git
3. Name: "Summit Login"
4. Drag `amplify-summit` folder
5. Wait for deployment

**Add Custom Domain:**

1. Domain management → Add domain
2. Enter: `summit.codingeverest.com`
3. Copy the CNAME value provided

**Update Namecheap DNS:**

```
Type: CNAME
Host: summit
Value: [Amplify-provided-value]
TTL: Automatic
```

### Step 4: Set Up Nginx + SSL (5 minutes)

On EC2:

```bash
# Install Nginx and Certbot
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# Create config
sudo nano /etc/nginx/sites-available/summit-api
```

Paste this:

```nginx
server {
    listen 80;
    server_name api.codingeverest.com;
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
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
    }
}
```

Save and enable:

```bash
sudo ln -s /etc/nginx/sites-available/summit-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate (after DNS propagates)
sudo certbot --nginx -d api.codingeverest.com

# Configure firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**Also update EC2 Security Group in AWS Console:**
- Add inbound rule: HTTP (80)
- Add inbound rule: HTTPS (443)

### Step 5: Update Landing Page (2 minutes)

In your existing Amplify landing page, add:

```html
<a href="https://summit.codingeverest.com" class="btn btn-primary">
    Login to Summit
</a>
```

Or use one of the designs from `LANDING_PAGE_BUTTON_CODE.html`

## ✅ Testing

```bash
# Test API
curl https://api.codingeverest.com/api/auth/health

# Test login page
# Visit: https://summit.codingeverest.com

# Create account and login
```

## 🎉 Done!

Your setup:
- ✅ Backend: `https://api.codingeverest.com`
- ✅ Frontend: `https://summit.codingeverest.com`
- ✅ Landing: `https://www.codingeverest.com` (with Summit button)

## 🆘 Quick Troubleshooting

**Backend not working?**
```bash
pm2 logs summit-backend
```

**CORS errors?**
```bash
cd /var/www/summit
nano .env
# Add: CORS_ORIGIN=https://summit.codingeverest.com
pm2 restart summit-backend
```

**502 Gateway?**
```bash
# Check backend is running
curl http://localhost:4000/health
pm2 status

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

**DNS not working?**
```bash
nslookup api.codingeverest.com
nslookup summit.codingeverest.com
# Wait 15 minutes for propagation
```

## 📚 Full Documentation

For detailed guides:
- Complete guide: `AMPLIFY_EC2_DEPLOYMENT_GUIDE.md`
- Amplify files: `amplify-summit/README.md`
- Button code: `LANDING_PAGE_BUTTON_CODE.html`

---

**Need help?** Check the full guide or PM2 logs!

