# WebSocket Security & Authentication

## Current Implementation

### Method: Query String Token (Standard Practice)

**Why Query String?**
- Browser WebSocket API doesn't support custom headers like `Authorization: Bearer`
- Query string (`?token=...`) is the **industry standard workaround**
- Used by major services (Google, AWS, etc.)

**Security Considerations:**
- ✅ Token is still encrypted (JWT)
- ✅ HTTPS/WSS encrypts the entire URL
- ⚠️ Token appears in server logs (same as headers)
- ⚠️ Token appears in browser history (mitigated with session storage)

### Current Code

**Frontend:**
```typescript
const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);
```

**Backend:**
```typescript
// Extracts token from query string
const queryParams = new URLSearchParams(urlParts[1]);
token = queryParams.get("token");
```

## Alternative Methods

### Option A: Sec-WebSocket-Protocol (Advanced)

**Pros:**
- Token not in URL
- May bypass WAF rules
- Still visible in headers (but less obvious)

**Cons:**
- More complex implementation
- Must echo back protocol to browser
- Less standard

**Implementation:**
```typescript
// Frontend
const ws = new WebSocket(wsUrl, ["access_token", token]);

// Backend
const protocols = req.headers["sec-websocket-protocol"];
const token = protocols.split(",")[1].trim();
// Must accept protocol: ws.accept("access_token");
```

### Option B: HTTP-Only Cookies (Most Secure)

**Pros:**
- Token never exposed to JavaScript
- Most secure method
- Automatically sent with WebSocket handshake

**Cons:**
- Requires same domain or proper cookie settings
- More complex setup
- Need to handle cookie refresh

**Implementation:**
```typescript
// Login: Set HttpOnly cookie
res.cookie("auth_token", token, { httpOnly: true, secure: true });

// WebSocket: Cookie automatically sent
const ws = new WebSocket(wsUrl); // No token needed

// Backend: Read from cookies
const token = req.headers.cookie?.split("auth_token=")[1]?.split(";")[0];
```

## Why WebSocket Connections Fail

### 1. AWS WAF (Web Application Firewall)

**Symptom:** Connection fails immediately with no specific error

**Cause:** WAF rules blocking long query strings or suspicious patterns

**Solution:**
- Check WAF rules in AWS Console
- Add exception for `/ws` endpoint
- Use Sec-WebSocket-Protocol if WAF is strict

### 2. Token Validation Failure

**Symptom:** Connection closes with 1008 (Policy Violation)

**Cause:** Backend rejects token (wrong secret, expired, malformed)

**Solution:**
- Check backend logs for specific error
- Verify JWT_SECRET matches
- Check token expiration

### 3. Nginx Configuration

**Symptom:** 502 Bad Gateway or connection timeout

**Cause:** Nginx not configured for WebSocket upgrade

**Solution:**
- Ensure `/ws` location has upgrade headers
- Check `proxy_buffering off;`
- Verify `/ws` comes before `/api` in config

### 4. Backend Not Running

**Symptom:** Connection refused or timeout

**Cause:** Backend server not listening on port 4000

**Solution:**
- Check `pm2 list`
- Check `sudo netstat -tlnp | grep :4000`
- Restart backend if needed

## Debugging WebSocket Connections

### Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Refresh page
5. Click failed connection (red)
6. Check:
   - **Status Code:** 401/403 = Auth failed, 502 = Nginx issue, 1006 = Abnormal closure
   - **Response Headers:** Look for error messages
   - **Initiated By:** See what triggered connection

### Backend Logs

```bash
# Check PM2 logs
pm2 logs summit --lines 50

# Look for:
# - "📡 WebSocket connection attempt"
# - "❌ WebSocket auth error"
# - "✅ WebSocket token verified"
```

### Network Testing

```bash
# Test WebSocket endpoint directly
wscat -c "wss://summit-api.codingeverest.com/ws?token=YOUR_TOKEN"

# Or use curl for initial handshake test
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  "https://summit-api.codingeverest.com/ws?token=YOUR_TOKEN"
```

## Current Status

✅ **Query String Method** - Implemented and working
- Token in URL is standard practice
- HTTPS/WSS encrypts the URL
- Well-supported across all browsers

⚠️ **Security Note**
- Tokens in logs are unavoidable (query string or header)
- Consider token rotation for sensitive apps
- Use short-lived tokens (current: 7 days expiry)

🔧 **If Issues Persist**
1. Check AWS WAF rules
2. Verify nginx WebSocket configuration
3. Check backend logs for auth errors
4. Test with browser DevTools Network tab

## Recommended Approach

**For Production:**
- Keep query string method (current) - it's standard
- Add better error logging (✅ done)
- Monitor WAF rules
- Consider short-lived tokens if security is critical

**If WAF Blocks:**
- Switch to Sec-WebSocket-Protocol (Option A)
- Or use HTTP-only cookies (Option B)

