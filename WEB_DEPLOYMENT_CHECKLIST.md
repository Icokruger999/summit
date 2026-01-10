# Web Deployment Checklist

## Critical: Web Builds Must NEVER Connect Locally

### ✅ Fixed Issues

1. **Removed Localhost Fallback**
   - `useMessageWebSocket.ts`: Removed `|| "http://localhost:3000"` fallback
   - `api.ts`: Removed `|| "http://localhost:3000"` fallback
   - Now requires `VITE_SERVER_URL` to be set (fails gracefully if not)

2. **Amplify Configuration**
   - `amplify.yml`: Explicitly sets `VITE_SERVER_URL=https://summit-api.codingeverest.com`
   - Added logging to verify environment variable is set
   - No localhost fallback in production builds

3. **Vite Config**
   - No proxy configuration for web builds
   - Web builds connect directly to production API
   - Tauri builds still use localhost for local development

4. **Nginx WebSocket Configuration**
   - Updated `summit-api-nginx.conf` with proper WebSocket headers
   - `/ws` location has `Upgrade` and `Connection` headers
   - Disabled buffering for WebSocket
   - Extended timeouts for long-lived connections

### ⚠️ Still Needed

1. **Deploy Nginx Config to Server**
   - Use `deploy-nginx-config.json` via SSM
   - Or manually SSH and copy `summit-api-nginx.conf` to server
   - Test: `sudo nginx -t`
   - Reload: `sudo systemctl reload nginx`

### Testing

After deployment, verify:
- ✅ WebSocket connects to `wss://summit-api.codingeverest.com/ws` (not localhost)
- ✅ API calls go to `https://summit-api.codingeverest.com/api` (not localhost)
- ✅ No 1006 WebSocket errors
- ✅ Meetings API works without JSONB errors
- ✅ Contact search works (case-insensitive)

