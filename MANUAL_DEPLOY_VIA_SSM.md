# Manual Deployment via AWS Systems Manager

Quick guide to deploy Summit backend using AWS Console Session Manager.

## ✅ Status

- ✅ Backend code in GitHub: https://github.com/Icokruger999/summit
- ✅ Frontend deployed to Amplify 
- ✅ EC2 Instance: i-06bc5b2218c041802 (codingeverest) - **Running**
- ✅ IP Address: 34.246.3.141
- ⏳ Backend deployment needed

---

## 🚀 Deploy Backend (5 minutes)

### Step 1: Connect via AWS Console

1. Go to: https://console.aws.amazon.com/systems-manager/session-manager
2. Select region: **eu-west-1**
3. Click **"Start session"**
4. Select instance: **codingeverest (i-06bc5b2218c041802)**
5. Click **"Start session"**

A terminal will open in your browser!

### Step 2: Run These Commands

Copy and paste this **entire block**:

```bash
# Clone repository
cd /tmp
sudo rm -rf summit
sudo git clone https://github.com/Icokruger999/summit.git
cd summit/backend

# Create directory
sudo mkdir -p /var/www/summit
sudo cp -r * /var/www/summit/
cd /var/www/summit

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
sudo sed "s/CHANGE_ON_DEPLOYMENT/$JWT_SECRET/" .env.production | sudo tee .env > /dev/null

# Install dependencies (if needed)
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    sudo dnf install -y nodejs npm
fi

if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Install project dependencies
sudo npm install --production

# Stop existing process if any
sudo pm2 stop summit-backend 2>/dev/null || true
sudo pm2 delete summit-backend 2>/dev/null || true

# Start backend
sudo pm2 start dist/index.js --name summit-backend
sudo pm2 save
sudo pm2 startup

# Test
echo ""
echo "Testing backend..."
curl http://localhost:4000/health

# Show status
echo ""
sudo pm2 list
```

### Step 3: Verify

You should see:
```
{"status":"ok"}
```

And PM2 should show `summit-backend` running.

---

## 🌐 Configure Route 53 DNS

Now let's add the DNS record for api.codingeverest.com → 34.246.3.141

I'll do this via CLI. Just confirm it's working above first!

---

## 🔧 Configure Nginx (if not already done)

Still in the SSM session:

```bash
# Copy nginx config
sudo cp /var/www/summit/nginx-config.conf /etc/nginx/sites-available/summit-api 2>/dev/null || sudo cp /var/www/summit/nginx-config.conf /etc/nginx/conf.d/summit-api.conf

# Test nginx
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Get SSL Certificate

```bash
# Install certbot if needed
sudo dnf install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.codingeverest.com
```

---

## ✅ Success Checklist

After running the commands:

- [ ] `curl http://localhost:4000/health` returns `{"status":"ok"}`
- [ ] `sudo pm2 list` shows summit-backend running
- [ ] Nginx configured
- [ ] SSL certificate obtained
- [ ] DNS record created (I'll do this)
- [ ] API accessible: `curl https://api.codingeverest.com/api/auth/health`

---

## 🆘 Troubleshooting

### Backend won't start?

```bash
sudo pm2 logs summit-backend
```

### Port 4000 in use?

```bash
sudo netstat -tlnp | grep 4000
```

### Need to restart?

```bash
sudo pm2 restart summit-backend
```

---

**Once the backend is running, let me know and I'll configure Route 53 DNS!**

