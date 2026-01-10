# 🚀 Deploy Summit to Your EC2 Now

**Quick deployment guide for your specific setup**

## ✅ Ready to Deploy

I've built your backend - everything is ready!

**Your Setup:**
- EC2 Instance: codingeverest (i-06bc5b2218c041802)
- DNS: Route 53 (same as Milo)
- Backend: Built and ready in `server/dist`
- Frontend: Ready in `amplify-summit/`

---

## 🎯 3-Step Deployment

### Step 1: Deploy Backend to EC2 (10 minutes)

**A. Get Your EC2 Public IP:**

```bash
aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

Or get it from AWS EC2 Console.

**B. Upload Files to EC2:**

I've prepared a deployment script. Run this from PowerShell:

```powershell
.\deploy-to-codingeverest-ec2.ps1 -KeyPath "C:\path\to\your\key.pem" -EC2IP "YOUR-EC2-IP"
```

Or manually:

```powershell
# Create deployment package
New-Item -Path deploy-ec2-now -ItemType Directory -Force
Copy-Item -Path server\dist -Destination deploy-ec2-now\ -Recurse
Copy-Item -Path server\package.json, server\package-lock.json -Destination deploy-ec2-now\

# Create .env file
@"
PORT=4000
NODE_ENV=production
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=CHANGE_ME
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=wss://livekit.codingeverest.com
"@ | Out-File deploy-ec2-now\.env -Encoding UTF8

# Upload to EC2
scp -i "your-key.pem" -r deploy-ec2-now/* ubuntu@YOUR-EC2-IP:/tmp/summit/
```

**C. SSH and Setup:**

```bash
ssh -i "your-key.pem" ubuntu@YOUR-EC2-IP

# Create directory
sudo mkdir -p /var/www/summit
sudo chown $USER:$USER /var/www/summit

# Move files
mv /tmp/summit/* /var/www/summit/
cd /var/www/summit

# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/CHANGE_ME/$JWT_SECRET/" .env

# Install and start
npm install --production
pm2 start dist/index.js --name summit-backend
pm2 save

# Verify
pm2 list
curl http://localhost:4000/health
```

**D. Configure Nginx:**

```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/summit-api > /dev/null <<'EOF'
server {
    listen 80;
    server_name api.codingeverest.com;
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
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
EOF

# Enable and test
sudo ln -s /etc/nginx/sites-available/summit-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 2: Configure Route 53 DNS (5 minutes)

**Option A: AWS Console**

1. Go to Route 53 → Hosted zones
2. Select codingeverest.com
3. Create record:
   - Name: `api`
   - Type: `A`
   - Value: `[Your EC2 Public IP]`
   - TTL: `300`
4. Click Create

**Option B: AWS CLI**

```bash
# Get Zone ID
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='codingeverest.com.'].Id" --output text | cut -d'/' -f3)

# Get EC2 IP
EC2_IP=$(aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

# Create record
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "api.codingeverest.com",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "'$EC2_IP'"}]
    }
  }]
}'
```

**Wait 5 minutes, then test:**

```bash
nslookup api.codingeverest.com
curl http://api.codingeverest.com/api/auth/health
```

**Get SSL Certificate:**

```bash
# On EC2
sudo certbot --nginx -d api.codingeverest.com
```

---

### Step 3: Deploy Frontend to Amplify (10 minutes)

**A. Update API URLs:**

Already done! The files in `amplify-summit/` are ready.

**B. Deploy to Amplify:**

1. Go to **AWS Amplify Console**
2. Click **"New app"** → **"Host web app"**
3. Choose **"Deploy without Git provider"**
4. App name: **`Summit Login`**
5. Environment name: **`production`**
6. Drag and drop the **`amplify-summit`** folder
7. Click **"Save and deploy"**
8. Wait 2-3 minutes ⏳

**C. Add Custom Domain:**

1. In your new Amplify app → **"Domain management"**
2. Click **"Add domain"**
3. Enter: **`summit.codingeverest.com`**
4. Click **"Configure domain"**
5. Amplify will show DNS configuration

**D. Update Route 53:**

Amplify will tell you to create a CNAME record. Do it in Route 53:

**AWS Console:**
- Name: `summit`
- Type: `CNAME`  
- Value: `[Amplify provides this]` (like `d123abc.cloudfront.net`)

**AWS CLI:**

```bash
# Replace with Amplify-provided value
AMPLIFY_URL="d1234567890abc.cloudfront.net"

aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "summit.codingeverest.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "'$AMPLIFY_URL'"}]
    }
  }]
}'
```

**Wait 10 minutes, then test:**

```bash
nslookup summit.codingeverest.com
# Visit: https://summit.codingeverest.com
```

---

## ✅ Verification

After all steps:

```bash
# 1. Check backend
ssh -i "your-key.pem" ubuntu@YOUR-EC2-IP
pm2 status
# Should show: summit-backend (running)
# Should show: Your Milo apps (still running)

# 2. Test API
curl https://api.codingeverest.com/api/auth/health
# Should return: {"status":"ok"}

# 3. Test login page
# Visit: https://summit.codingeverest.com
# Should see the login page

# 4. Create account and login
# Try creating an account
```

---

## 🎨 Update Landing Page

In your existing Amplify landing page app, add this button:

```html
<a href="https://summit.codingeverest.com" 
   class="btn btn-primary"
   style="
       display: inline-block;
       padding: 12px 28px;
       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
       color: white;
       text-decoration: none;
       border-radius: 10px;
       font-weight: 600;
       transition: all 0.3s ease;
   ">
    Login to Summit →
</a>
```

Or choose a design from `LANDING_PAGE_BUTTON_CODE.html`

---

## 🆘 Troubleshooting

### Backend not starting?
```bash
pm2 logs summit-backend
```

### Port 4000 in use?
```bash
sudo netstat -tlnp | grep 4000
# If something else is using it, edit /var/www/summit/.env
# Change PORT=4000 to PORT=4001
pm2 restart summit-backend
```

### DNS not resolving?
```bash
# Wait 10-15 minutes for DNS propagation
nslookup api.codingeverest.com
nslookup summit.codingeverest.com
```

### CORS errors?
```bash
# On EC2, check .env
cat /var/www/summit/.env | grep CORS_ORIGIN
# Should include: https://summit.codingeverest.com
pm2 restart summit-backend
```

### 502 Gateway?
```bash
# Check backend is running
curl http://localhost:4000/health

# Check Nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## 📋 Summary

| Component | URL | Location |
|-----------|-----|----------|
| Landing Page | www.codingeverest.com | Amplify (existing) |
| Summit Login | summit.codingeverest.com | Amplify (new) |
| Summit API | api.codingeverest.com | EC2 port 4000 |
| Milo | (your Milo URLs) | EC2 ports 3000, 5000, 5001 |

---

## 🎉 Done!

When everything works:

1. Users visit **www.codingeverest.com**
2. Click **"Login to Summit"**
3. Go to **summit.codingeverest.com** (Amplify)
4. Create account or login
5. Start using Summit! 🚀

**Milo continues running normally** - no interference!

---

## 📞 Need Help?

- Detailed EC2 guide: `DEPLOY_TO_YOUR_EC2.md`
- Route 53 guide: `ROUTE53_DNS_SETUP.md`
- Full deployment guide: `AMPLIFY_EC2_DEPLOYMENT_GUIDE.md`
- Quick setup: `QUICK_SETUP.md`

**Check logs:**
```bash
pm2 logs summit-backend
sudo tail -f /var/log/nginx/error.log
```

---

**Ready?** Start with Step 1! 🚀

