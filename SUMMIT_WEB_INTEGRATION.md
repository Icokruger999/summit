# Summit Web Integration Guide

This guide explains how to integrate Summit with your existing www.codingeverest.com website.

## Overview

Summit has been configured to run on **port 4000** to avoid conflicts with Milo (which uses ports 3000, 5000, 5001).

## Architecture

```
www.codingeverest.com
├── /summit/login       → Web-based login page
├── /summit/api         → Summit backend API (port 4000)
├── /summit/ws          → WebSocket for real-time messaging
└── /summit/app         → Summit web application (optional)

Your existing Milo apps continue to run on ports 3000, 5000, 5001
```

## Prerequisites

1. **Server Access**: SSH access to your web server
2. **Node.js**: Version 18 or higher
3. **PM2** (recommended): Process manager for Node.js
   ```bash
   npm install -g pm2
   ```
4. **Nginx**: Web server with reverse proxy capability

## Deployment Steps

### Step 1: Upload Files to Server

Upload the following to your server:

```bash
# On your server (e.g., /var/www/summit/)
/var/www/summit/
├── server/                 # Backend application
├── web-login/             # Login page
└── nginx-summit.conf      # Nginx configuration
```

### Step 2: Configure Environment Variables

Create a `.env` file in the server directory:

```bash
cd /var/www/summit/server
cp .env.production .env
nano .env  # Edit with your actual values
```

**Important**: Change the `JWT_SECRET` to a strong, random value:
```bash
JWT_SECRET=$(openssl rand -base64 32)
```

### Step 3: Install Dependencies and Build

```bash
cd /var/www/summit/server
npm install
npm run build
```

### Step 4: Start Summit Backend

**Using PM2 (Recommended)**:
```bash
chmod +x start-production.sh
./start-production.sh
```

**Or manually**:
```bash
pm2 start dist/index.js --name summit-backend
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

Verify it's running:
```bash
pm2 status
curl http://localhost:4000/health
```

### Step 5: Configure Nginx

#### Option A: Include in Existing Configuration

Add to your existing `/etc/nginx/sites-available/codingeverest.com`:

```nginx
server {
    listen 443 ssl http2;
    server_name www.codingeverest.com codingeverest.com;
    
    # Your existing SSL certificates
    ssl_certificate /etc/letsencrypt/live/codingeverest.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/codingeverest.com/privkey.pem;
    
    # Your existing Milo locations (keep these unchanged)
    # ...
    
    # Add Summit configuration
    include /etc/nginx/conf.d/summit-locations.conf;
    
    # Your main site
    location / {
        root /var/www/codingeverest;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

#### Option B: Copy Location Blocks

Copy the content from `nginx-summit.conf` and paste it into your existing configuration file.

#### Create the included file:

```bash
sudo cp /var/www/summit/nginx-summit.conf /etc/nginx/conf.d/summit-locations.conf
```

### Step 6: Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# Reload if test passes
sudo systemctl reload nginx
```

### Step 7: Update Your Landing Page

Update your existing www.codingeverest.com landing page where you have the Summit download placeholder:

```html
<!-- Replace the download button with a login button -->
<div class="summit-section">
    <h2>Summit - Secure Video Conferencing</h2>
    <p>Enterprise-grade video calls and messaging</p>
    <a href="/summit/login" class="btn btn-primary">Login to Summit</a>
    <!-- Or for a new window: -->
    <a href="/summit/login" target="_blank" class="btn btn-primary">Login to Summit</a>
</div>
```

## Testing the Integration

### 1. Test Backend API
```bash
curl https://www.codingeverest.com/summit/api/auth/health
# Expected: {"status":"ok"}
```

### 2. Test Login Page
Open in browser:
```
https://www.codingeverest.com/summit/login
```

### 3. Create Test Account
You can create a test account through the login page or via API:

```bash
curl -X POST https://www.codingeverest.com/summit/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword",
    "name": "Test User"
  }'
```

### 4. Test Login
Try logging in with the test account through the web interface.

## Port Configuration Summary

| Application | Port | URL Path |
|-------------|------|----------|
| Milo App 1  | 3000 | (your existing paths) |
| Milo App 2  | 5000 | (your existing paths) |
| Milo App 3  | 5001 | (your existing paths) |
| **Summit Backend** | **4000** | **/summit/api** |
| LiveKit     | 7880 | /summit/livekit (optional) |

## Security Considerations

1. **Change JWT Secret**: Use a strong, random JWT secret in production
2. **Database Credentials**: Secure your RDS credentials (use environment variables)
3. **CORS**: Update CORS_ORIGIN in `.env` to match your domain
4. **Firewall**: Ensure port 4000 is NOT exposed externally (Nginx proxies it)
5. **SSL/TLS**: Ensure your SSL certificates are valid and up-to-date

## Monitoring

### View Backend Logs
```bash
# With PM2
pm2 logs summit-backend

# View last 100 lines
pm2 logs summit-backend --lines 100

# Monitor in real-time
pm2 monit
```

### Restart Backend
```bash
pm2 restart summit-backend
```

### Stop Backend
```bash
pm2 stop summit-backend
pm2 delete summit-backend
```

## Troubleshooting

### Backend Not Starting

1. Check logs:
   ```bash
   pm2 logs summit-backend
   ```

2. Verify environment variables:
   ```bash
   cat /var/www/summit/server/.env
   ```

3. Test database connection:
   ```bash
   cd /var/www/summit/database
   node test-connection.cjs
   ```

### Login Page Not Loading

1. Check Nginx configuration:
   ```bash
   sudo nginx -t
   ```

2. Verify file permissions:
   ```bash
   ls -la /var/www/summit/web-login/
   ```

3. Check Nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### API Returning 502 Bad Gateway

1. Verify backend is running:
   ```bash
   pm2 status
   curl http://localhost:4000/health
   ```

2. Check if port 4000 is in use:
   ```bash
   sudo netstat -tlnp | grep 4000
   ```

### WebSocket Connection Failed

1. Ensure Nginx has WebSocket support enabled
2. Check upgrade headers in Nginx config
3. Verify WebSocket path: `/summit/ws`

## Database

Summit is already configured to use your AWS RDS instance:
- **Host**: codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
- **Database**: Summit
- **Port**: 5432

The database schema should already be set up. If not, run:

```bash
cd /var/www/summit/database
npm install
node setup-complete.cjs
```

## LiveKit (Video Conferencing)

LiveKit should be running on port 7880. You can either:

1. **Run it locally** on the same server
2. **Use a separate domain** (e.g., livekit.codingeverest.com)

Update `.env` with your LiveKit configuration:
```
LIVEKIT_URL=wss://your-livekit-domain.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

## Maintenance

### Update Summit

```bash
cd /var/www/summit/server
git pull  # or upload new files
npm install
npm run build
pm2 restart summit-backend
```

### Backup Database

```bash
# Backup RDS (use AWS backup or pg_dump)
pg_dump -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com \
  -U postgres -d Summit > summit_backup_$(date +%Y%m%d).sql
```

## Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs summit-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify all services are running: `pm2 status`
4. Test database connectivity
5. Check firewall rules

## Next Steps

1. ✅ Deploy backend to production
2. ✅ Configure Nginx reverse proxy
3. ✅ Update landing page with login button
4. Test user registration and login
5. Configure LiveKit for video calls
6. Set up monitoring and alerts
7. Configure automated backups

## Quick Commands Reference

```bash
# Start Summit
pm2 start summit-backend

# Stop Summit
pm2 stop summit-backend

# Restart Summit
pm2 restart summit-backend

# View logs
pm2 logs summit-backend

# Monitor resources
pm2 monit

# Test API
curl http://localhost:4000/health

# Reload Nginx
sudo systemctl reload nginx
```

---

**Important**: Make sure to keep your Milo applications running on their existing ports. This configuration ensures no conflicts.

