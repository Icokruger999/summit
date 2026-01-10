# Preventing Vite Deployment Issues

## Why Issues Keep Happening

**Root Cause:** Vite compiles environment variables at BUILD TIME, not runtime.

When `VITE_SERVER_URL` is not set during the Amplify build:
- The variable becomes `undefined` in the compiled JavaScript
- API calls fail: `fetch('undefined/api/chat-requests')` → 404 errors
- WebSocket connections fail: `wss://undefined/ws` → Connection errors

## The Solution (Multi-Layer Protection)

We've implemented **3 layers of protection** to prevent this:

### Layer 1: Amplify Build Configuration ✅
**File:** `amplify.yml`
- Explicitly sets `VITE_SERVER_URL` before `npm run build`
- Verifies variable is set before building
- Fails build if variable is missing

### Layer 2: Production Environment File ✅
**File:** `desktop/.env.production`
- Provides fallback if Amplify environment variable fails
- Vite automatically loads `.env.production` during production builds
- Safety net to prevent undefined URLs

### Layer 3: Runtime Fallback ✅
**Files:** `api.ts`, `useMessageWebSocket.ts`, etc.
- Code-level fallback to production URL
- Only used if environment variable is missing in production mode
- Prevents `undefined` URLs in API calls

## How It Works Now

```
Amplify Build Process:
1. amplify.yml sets: export VITE_SERVER_URL=https://summit-api.codingeverest.com
2. Vite reads: .env.production (fallback)
3. npm run build → Vite compiles with VITE_SERVER_URL
4. Runtime code has fallback if still undefined
```

## Verification Checklist

Before deploying, verify:

- [x] `amplify.yml` sets `VITE_SERVER_URL` before `npm run build`
- [x] `desktop/.env.production` exists with production URL
- [x] Code has runtime fallback in production mode
- [x] No localhost fallbacks for web builds
- [x] Test build locally: `npm run build` in desktop/ directory

## Testing the Build

### Local Test (Production Build):
```bash
cd desktop
export VITE_SERVER_URL=https://summit-api.codingeverest.com
npm run build
```

### Verify Compiled Code:
```bash
# Check that VITE_SERVER_URL is in the compiled code
grep -r "summit-api.codingeverest.com" dist/
```

## What Changed to Prevent Issues

1. **Added `.env.production` file** - Fallback environment file
2. **Enhanced `amplify.yml`** - Verification step before build
3. **Runtime fallbacks** - Code-level safety nets
4. **No localhost fallbacks** - Prevents wrong connections

## Future Deployments

**These changes ensure:**
- ✅ Even if `amplify.yml` variable fails, `.env.production` provides fallback
- ✅ Even if both fail, runtime code has production URL fallback
- ✅ Build fails early if environment is completely misconfigured
- ✅ No more `undefined` URLs causing 404 errors

## Monitoring

**After deployment, check:**
1. Browser console for `VITE_SERVER_URL` log messages
2. Network tab - API calls should go to `https://summit-api.codingeverest.com`
3. WebSocket connections should use `wss://summit-api.codingeverest.com/ws`
4. No `undefined` in URLs

## If Issues Persist

1. **Check Amplify build logs** - Verify `VITE_SERVER_URL` is set
2. **Verify `.env.production`** exists in repository
3. **Check compiled code** - Search for `undefined` in `dist/` files
4. **Test locally** - Run `npm run build` and verify output

## Summary

**Before:** Single point of failure (only Amplify env var)  
**After:** Triple-layer protection (Amplify + .env.production + runtime fallback)

**Result:** Deployment issues should NOT happen again because we have multiple safety nets.

