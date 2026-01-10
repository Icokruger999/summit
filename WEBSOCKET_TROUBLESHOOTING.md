# WebSocket Troubleshooting Guide

## Why Are We Getting WebSocket Issues?

The most common cause is **nginx configuration not deployed to the server**.

## Root Causes

### 1. Nginx Configuration Missing (MOST LIKELY) ⚠️

**Problem:** We created the correct nginx config (`summit-api-nginx.conf`) but haven't deployed it to the server.

**Symptoms:**
- WebSocket connection fails with 1006 error
- Connection closes immediately
- No WebSocket upgrade headers in nginx

**Solution:** Deploy nginx config to server:
```bash
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters file://deploy-nginx-config.json \
  --region eu-west-1
```

**What to check:**
- `/etc/nginx/sites-available/summit-api` must have `/ws` location
- Must include `Upgrade` and `Connection` headers
- Must have `proxy_buffering off;`
- `/ws` location must come BEFORE `/api` location

### 2. Backend Server Not Running

**Problem:** Backend not running or crashed.

**Symptoms:**
- No response to WebSocket connections
- 502 Bad Gateway errors

**Solution:** Check and restart backend:
```bash
pm2 list
pm2 logs summit
pm2 restart summit
```

**Verify:** Port 4000 should be listening:
```bash
sudo netstat -tlnp | grep :4000
```

### 3. Nginx Not Reloaded

**Problem:** Nginx config updated but not reloaded.

**Symptoms:**
- Config file is correct but still not working

**Solution:**
```bash
sudo nginx -t  # Test config
sudo systemctl reload nginx  # Reload if test passes
```

### 4. Firewall/Security Group

**Problem:** Port 443 (HTTPS/WSS) blocked.

**Symptoms:**
- Can't connect at all
- Timeout errors

**Solution:**
- Check AWS Security Group allows inbound 443
- Check EC2 firewall allows 443

### 5. SSL Certificate Issues

**Problem:** SSL/TLS issues with WebSocket upgrade.

**Symptoms:**
- SSL errors
- Certificate not valid

**Solution:**
- Verify SSL certificate is valid
- Check certificate includes summit-api.codingeverest.com

## Quick Diagnostic

Run this to diagnose:

```bash
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters file://diagnose-websocket-issues.json \
  --region eu-west-1
```

This will check:
1. ✅ Backend running
2. ✅ Port 4000 listening
3. ✅ Nginx config has WebSocket
4. ✅ Nginx syntax correct
5. ✅ Nginx running
6. ✅ Backend WebSocket logs

## Step-by-Step Fix

### Step 1: Diagnose
```bash
# Run diagnostic
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters file://diagnose-websocket-issues.json \
  --region eu-west-1
```

### Step 2: Deploy Nginx Config (if missing)
```bash
# Deploy nginx config
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters file://deploy-nginx-config.json \
  --region eu-west-1
```

### Step 3: Verify Backend
```bash
# Check backend
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters file://deploy-summit-backend.json \
  --region eu-west-1
```

### Step 4: Test WebSocket

Open browser console and check:
```javascript
// Should connect to:
wss://summit-api.codingeverest.com/ws?token=...

// Should see:
✅ Message WebSocket connected
```

## Expected Nginx Config

The `/ws` location in nginx MUST have:

```nginx
location /ws {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    
    # CRITICAL: WebSocket upgrade headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Standard headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket timeouts
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    
    # CRITICAL: Disable buffering
    proxy_buffering off;
    proxy_cache off;
}
```

**MUST come BEFORE `/api` location!**

## Common Error Codes

- **1006 (Abnormal Closure)**: Usually nginx not configured for WebSocket
- **1008 (Policy Violation)**: Authentication failed (bad token)
- **1011 (Server Error)**: Backend server error
- **Connection Refused**: Backend not running or port blocked

## Verification Checklist

- [ ] Backend running on port 4000
- [ ] Nginx config has `/ws` location
- [ ] WebSocket upgrade headers present
- [ ] `proxy_buffering off;` set
- [ ] `/ws` location comes before `/api`
- [ ] Nginx config syntax valid
- [ ] Nginx reloaded after config change
- [ ] Port 443 open in security group
- [ ] SSL certificate valid

