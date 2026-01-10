# Summit + AWS Amplify Integration Options

Your landing page is on AWS Amplify. Here are your options for integrating Summit login.

## 🎯 Option 1: Server-Hosted Login (RECOMMENDED)

**Best for**: Simplicity, no CORS issues, everything in one place

### Architecture
```
AWS Amplify (Landing Page)
www.codingeverest.com
    └── [Login Button] → https://summit.codingeverest.com/login

Your Server (EC2/VPS)
summit.codingeverest.com
    ├── /login              Login page (Nginx serves it)
    ├── /api                Backend (port 4000)
    └── /ws                 WebSocket
```

### Setup Steps

1. **Deploy Summit to your server** (where backend runs)
   ```bash
   # Upload files to /var/www/summit/
   cd /var/www/summit
   pm2 start dist/index.js --name summit-backend
   ```

2. **Configure DNS**
   - Create subdomain: `summit.codingeverest.com`
   - Point to your server IP
   - OR use path-based: `www.codingeverest.com/summit`

3. **Configure Nginx** (use `nginx-summit.conf`)
   ```nginx
   server {
       listen 443 ssl;
       server_name summit.codingeverest.com;
       
       ssl_certificate /etc/letsencrypt/live/summit.codingeverest.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/summit.codingeverest.com/privkey.pem;
       
       location / {
           root /var/www/summit/web-login;
           try_files $uri /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:4000;
       }
       
       location /ws {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

4. **Update login button on Amplify site**
   ```html
   <a href="https://summit.codingeverest.com/login">Login to Summit</a>
   ```

### ✅ Pros
- Simple to set up
- No CORS issues
- Login page and backend on same domain
- Easy to manage

### ❌ Cons
- Requires separate subdomain or path
- All traffic to your server

---

## 🌐 Option 2: Amplify-Hosted Login (Advanced)

**Best for**: Using AWS Amplify for everything, separate concerns

### Architecture
```
AWS Amplify App 1 (Landing Page)
www.codingeverest.com
    └── [Login Button] → Amplify App 2

AWS Amplify App 2 (Summit Login)
summit.codingeverest.com
    └── Login Page → Calls API on your server

Your Server (Backend Only)
api.codingeverest.com
    ├── /api                Backend (port 4000)
    └── /ws                 WebSocket
```

### Setup Steps

1. **Create new Amplify app for Summit login**
   - Go to AWS Amplify Console
   - Create new app: "Summit Login"
   - Manual deploy or connect to Git

2. **Prepare login page for Amplify**
   ```bash
   # Create build package
   mkdir summit-amplify
   cp web-login/index.html summit-amplify/
   # Create amplify.yml (see below)
   ```

3. **Update API URL in login page**
   ```javascript
   // In web-login/index.html, change API_URL to:
   const API_URL = 'https://api.codingeverest.com/api';
   ```

4. **Configure CORS on backend**
   ```env
   # In server/.env
   CORS_ORIGIN=https://www.codingeverest.com,https://summit.codingeverest.com
   ```

5. **Set up API subdomain**
   - Point `api.codingeverest.com` to your server
   - Configure Nginx on your server:
   ```nginx
   server {
       listen 443 ssl;
       server_name api.codingeverest.com;
       
       location /api {
           proxy_pass http://localhost:4000;
           # CORS headers
           add_header 'Access-Control-Allow-Origin' 'https://summit.codingeverest.com';
           add_header 'Access-Control-Allow-Credentials' 'true';
       }
   }
   ```

6. **Deploy login page to Amplify**
   - Upload files to new Amplify app
   - Configure custom domain: `summit.codingeverest.com`

### amplify.yml for Amplify
```yaml
version: 1
frontend:
  phases:
    build:
      commands:
        - echo "No build needed - static HTML"
  artifacts:
    baseDirectory: /
    files:
      - '**/*'
  cache:
    paths: []
```

### ✅ Pros
- Everything on AWS
- Amplify handles SSL/CDN
- Separation of concerns
- Scalable

### ❌ Cons
- More complex setup
- CORS configuration needed
- Two Amplify apps to manage
- API calls cross domains

---

## 🔀 Option 3: Hybrid (Landing Page Links Directly)

**Best for**: Quick setup, existing infrastructure

### Architecture
```
AWS Amplify (Landing Page)
www.codingeverest.com
    └── [Login Button] → www.codingeverest.com/summit/login

Your Server (with Nginx reverse proxy)
Your-Server-IP
    └── Nginx proxies /summit/* paths
```

### Setup Steps

1. **Configure Nginx on your server** (standard setup)

2. **Set up reverse proxy from Amplify**
   - In Amplify console → Rewrites and redirects
   - Add rule:
     ```
     Source: /summit/<*>
     Target: https://your-server-ip/summit/<*>
     Type: Proxy (200)
     ```

3. **Or use DNS/CloudFront**
   - Keep landing page on Amplify
   - Use Route53 to route /summit/* to your server
   - This requires custom CloudFront distribution

### ✅ Pros
- Single domain for users
- Clean URL structure

### ❌ Cons
- Complex Amplify/CloudFront configuration
- May have routing issues

---

## 🎯 My Recommendation

### For Your Situation: **Option 1 (Server-Hosted)**

Here's why:
1. Your Summit backend MUST run on your server (RDS access)
2. Simplest setup - one deployment location
3. No CORS complications
4. Easy to troubleshoot

### Implementation:

**Step 1**: Choose your URL structure:
- **Subdomain**: `summit.codingeverest.com/login` (cleaner, recommended)
- **Path**: `www.codingeverest.com/summit/login` (single domain)

**Step 2**: Update your Amplify landing page button:
```html
<!-- If using subdomain -->
<a href="https://summit.codingeverest.com/login" class="btn btn-primary">
    Login to Summit
</a>

<!-- If using path -->
<a href="https://www.codingeverest.com/summit/login" class="btn btn-primary">
    Login to Summit
</a>
```

**Step 3**: Deploy Summit to your server (follow QUICK_START_SUMMIT_WEB.md)

**Step 4**: Configure DNS:
- If subdomain: Add A record `summit` pointing to your server IP
- If path: No DNS change needed (Nginx handles routing)

---

## 🤔 Questions to Decide

1. **Do you have a server running** where you'll host the Summit backend?
   - Yes → Option 1 (Server-Hosted)
   - No → We need to set up EC2 or similar

2. **Preferred URL for Summit login?**
   - `summit.codingeverest.com/login` (subdomain)
   - `www.codingeverest.com/summit/login` (path)

3. **Where is Milo running?**
   - If on same server → Use Option 1
   - If on Amplify → Need clarification

---

## 📝 Next Steps

**Tell me:**
1. What URL do you want for Summit login?
2. Do you have a server (EC2, VPS) where backend will run?
3. Where is Milo currently hosted?

Then I'll create the exact configuration files you need!

---

## 🚀 Quick Decision Guide

**"I just want it to work simply"**
→ Option 1: Server-Hosted

**"I want everything on AWS Amplify"**
→ Option 2: Create new Amplify app for login

**"I already have the button on Amplify, just give me the URL"**
→ Deploy to server first, then I'll give you the URL to use

Let me know what you prefer! 🎯

