# Vite Dev Server vs Production - WebSocket Clarification

## ⚠️ IMPORTANT: The Dev Server (port 5173) Does NOT Cause Production WebSocket Issues

### Why?

**The Vite dev server is ONLY used during LOCAL development.**

## Development vs Production

### 📝 LOCAL DEVELOPMENT (When you run `npm run dev`)

```
Your Computer:
  └─ Vite Dev Server (port 5173) ← RUNNING
     └─ Serves React app with hot reload
     └─ WebSocket would connect to your local backend if you had one
```

**This is NOT what production users see!**

### 🚀 PRODUCTION (Amplify)

```
Amplify Build Process:
  1. Runs: npm run build
  2. Vite COMPILES React/TypeScript → Static HTML/JS/CSS
  3. Creates dist/ folder with static files
  4. NO dev server running!

Amplify Serves:
  └─ Static files from dist/ folder
  └─ Just HTML/JS/CSS - no server needed
  └─ WebSocket connects to: wss://summit-api.codingeverest.com/ws
```

## The Key Difference

### Development (`npm run dev`):
- Vite dev server runs on port 5173
- Serves files dynamically
- Hot module replacement enabled
- WebSocket would connect to localhost backend (if running locally)

### Production (`npm run build`):
- Vite is used to BUILD only
- Creates static files in `dist/` folder
- NO dev server running
- Amplify serves static files directly
- WebSocket connects to production API: `wss://summit-api.codingeverest.com/ws`

## How WebSocket Works

### In Production (Amplify):

1. **Build Time** (Amplify runs `npm run build`):
   ```bash
   export VITE_SERVER_URL=https://summit-api.codingeverest.com
   npm run build
   ```
   - Vite compiles the code
   - `VITE_SERVER_URL` is embedded in the compiled JavaScript
   - Creates static files in `dist/`

2. **Runtime** (User opens the website):
   ```javascript
   // The compiled code has this baked in:
   const apiUrl = "https://summit-api.codingeverest.com";
   const wsUrl = "wss://summit-api.codingeverest.com";
   const ws = new WebSocket(`${wsUrl}/ws?token=...`);
   ```
   - No Vite dev server involved
   - Direct connection to production API
   - Port 5173 is not used

## Checking vite.config.ts

Looking at our `vite.config.ts`:

```typescript
server: {
  port: 5173,        // ← ONLY for local dev
  strictPort: false,
  host: true,
}
```

**Important:** There's NO proxy configuration:
- ✅ No `proxy` settings
- ✅ No WebSocket proxy
- ✅ No interference with production WebSocket connections

The `server` config only affects:
- Local development when you run `npm run dev`
- Has ZERO effect on production builds

## Production WebSocket Flow

```
User's Browser
  ↓
Opens: https://summit.codingeverest.com
  ↓
Gets static HTML/JS/CSS from Amplify
  ↓
JavaScript runs in browser:
  const ws = new WebSocket("wss://summit-api.codingeverest.com/ws?token=...");
  ↓
Direct connection to backend (no Vite involved)
  ↓
wss://summit-api.codingeverest.com/ws
  ↓
Nginx (with WebSocket headers)
  ↓
Backend on port 4000
```

**No port 5173 involved!**

## Why WebSocket Might Still Fail

The real issues are:

1. **Nginx Configuration** - Must have WebSocket upgrade headers
2. **Backend Running** - Server must be listening on port 4000
3. **Environment Variable** - `VITE_SERVER_URL` must be set during build

### ✅ What We Fixed:

1. Removed localhost fallbacks - no trying to connect locally
2. Set `VITE_SERVER_URL` in `amplify.yml` - ensures production API URL
3. Updated nginx config - proper WebSocket headers
4. No proxy in Vite config - direct connections only

## Summary

- ✅ Vite dev server (5173) is ONLY for local development
- ✅ Production uses static files - no dev server
- ✅ WebSocket goes directly to production API
- ✅ No proxy configuration in Vite = no interference
- ✅ Port 5173 is NOT used in production

**The dev server does NOT cause production WebSocket issues because it's NOT running in production!**

