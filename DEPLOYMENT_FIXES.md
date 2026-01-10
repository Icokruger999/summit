# Deployment Fixes Applied

## Previous Build Fixes (Meetings API)

### Fix 1: Meetings API JSONB Error
**Problem:** 
- Error: "could not identify an equality operator for type json"
- PostgreSQL cannot use JSONB columns in GROUP BY clauses
- The `recurrence` column (JSONB) was causing the query to fail

**Solution Applied:**
- Changed query to use `DISTINCT ON` with Common Table Expressions (CTEs)
- Separated meeting data retrieval from participant aggregation
- Removed `recurrence` from GROUP BY, using DISTINCT ON instead

**File Changed:** `server/src/routes/meetings.ts`
**Commit:** `2c8036f Fix: Meetings API - use DISTINCT ON CTE to avoid JSONB GROUP BY error`

### Fix 2: "Don't Include Me" Option
**Problem:**
- Users wanted option to create meetings without being added as participant
- No way to exclude creator from meeting participants

**Solution Applied:**
- Added `dont_include_creator` checkbox in CreateMeetingModal
- Backend conditionally adds creator as participant based on flag
- Meeting refresh event dispatches after creation

**Files Changed:**
- `desktop/src/components/Meetings/CreateMeetingModal.tsx`
- `server/src/routes/meetings.ts`
**Commit:** `0430ff5 Fix: Add 'Don't Include Me' option and fix meeting refresh`

### Fix 3: Meeting Calendar Refresh
**Problem:**
- New meetings not appearing in calendar immediately after creation

**Solution Applied:**
- Dispatch `refreshMeetings` event after meeting creation
- MeetingCalendar listens for event and refreshes automatically
- Improved loadMeetings function with better logging

**Files Changed:**
- `desktop/src/components/Meetings/CreateMeetingModal.tsx`
- `desktop/src/components/Meetings/MeetingCalendar.tsx`
**Commit:** `0430ff5 Fix: Add 'Don't Include Me' option and fix meeting refresh`

### Fix 4: Contact Search in Meeting Modal
**Problem:**
- Email search returning 404 errors
- Case sensitivity issues

**Solution Applied:**
- Normalize email to lowercase before API call
- Case-insensitive email validation
- Added console logging for debugging

**File Changed:** `desktop/src/components/Meetings/CreateMeetingModal.tsx`
**Commit:** `6596cbc Fix: Meeting modal contact search - show all contacts, filter on type, email search case-insensitive`

### Fix 5: Contact Search in Add Contact Modal
**Problem:**
- Same email search 404 errors as meeting modal

**Solution Applied:**
- Applied same fix as meeting modal (normalize to lowercase)
- Case-insensitive validation

**File Changed:** `desktop/src/components/Chat/CreateChatModal.tsx`
**Commit:** `bb9e6c9 Fix: Add contact modal email search - normalize to lowercase, case-insensitive`

## Current Fixes (WebSocket)

### Fix 6: WebSocket Localhost Fallback (WEB ONLY)
**Problem:**
- Code has `localhost:3000` fallback which tries to connect locally
- Web builds should NEVER connect to localhost
- WebSocket failing with 1006 error

**Solution Applied:**
- Remove localhost fallback for production builds
- Require VITE_SERVER_URL to be set (fails gracefully if not)
- Ensure Amplify sets VITE_SERVER_URL during build
- Configure nginx with proper WebSocket upgrade headers

**Files Changed:**
- `desktop/src/hooks/useMessageWebSocket.ts` - Remove localhost fallback
- `desktop/src/lib/api.ts` - Remove localhost fallback, add validation
- `amplify.yml` - Ensure VITE_SERVER_URL is set correctly
- `nginx-summit-api-production.conf` - Complete nginx config with WebSocket support

**Note:** Desktop builds can still use localhost fallback, but web builds require environment variable.

### Fix 7: Nginx WebSocket Configuration
**Problem:**
- Nginx not configured to proxy WebSocket connections
- Missing `Upgrade` and `Connection` headers for `/ws` endpoint
- WebSocket connections failing with 1006 error

**Solution Applied:**
- Created proper nginx configuration with WebSocket support
- `/ws` location block with upgrade headers (MUST come before /api)
- Extended timeouts for long-lived WebSocket connections
- Disabled buffering for WebSocket

**File Created:** `nginx-summit-api-production.conf`

## Deployment Order (CRITICAL)

1. **GitHub** - Push all changes first
2. **Amplify** - Auto-deploys from GitHub (ensures VITE_SERVER_URL is set)
3. **EC2 via SSM** - Deploy backend after GitHub is updated
4. **Nginx** - Deploy nginx config separately (if changed)

## WebSocket Configuration

### Frontend (Web Build)
- Uses `VITE_SERVER_URL` from environment (set in Amplify)
- Connects to: `wss://summit-api.codingeverest.com/ws?token=...`
- No localhost fallback in production

### Backend
- WebSocket server on `/ws` path
- Port: 4000
- Requires JWT token in query string

### Nginx (Required)
- MUST proxy `/ws` to `http://localhost:4000`
- MUST include `Upgrade: websocket` header
- MUST include `Connection: upgrade` header
- `/ws` location MUST come before `/api` location

## Testing

After deployment, test:
1. ✅ Meetings API works without JSONB error
2. ✅ "Don't Include Me" option works
3. ✅ New meetings appear in calendar immediately
4. ✅ Contact search works (case-insensitive)
5. ✅ WebSocket connects without 1006 error
6. ✅ No localhost connections in production builds
7. ✅ All API calls go to production server (summit-api.codingeverest.com)

## Web Build Configuration

### Critical: No Localhost Fallbacks

**For web builds, we MUST:**
- ✅ Remove all `localhost:3000` or `localhost:4000` fallbacks
- ✅ Require `VITE_SERVER_URL` environment variable
- ✅ Set `VITE_SERVER_URL=https://summit-api.codingeverest.com` in `amplify.yml`
- ✅ Ensure nginx has WebSocket upgrade headers for `/ws` endpoint

**Files Fixed:**
- `desktop/src/hooks/useMessageWebSocket.ts` - Removed localhost fallback
- `desktop/src/lib/api.ts` - Removed localhost fallback, added validation
- `desktop/src/hooks/useLiveKit.ts` - Removed localhost fallback
- `desktop/src/hooks/useBackgroundChatConnections.ts` - Removed localhost fallback
- `desktop/src/components/Chat/FileAttachment.tsx` - Removed localhost fallback
- `desktop/src/hooks/usePresence.ts` - Removed localhost fallback
- `desktop/vite.config.ts` - No proxy configuration (web builds connect directly)
- `amplify.yml` - Explicitly sets `VITE_SERVER_URL` during build

### Nginx WebSocket Configuration

**Location:** `/etc/nginx/sites-available/summit-api` or similar

**Required Settings for `/ws` location:**
- `proxy_set_header Upgrade $http_upgrade;`
- `proxy_set_header Connection "upgrade";`
- `proxy_buffering off;` (CRITICAL)
- Extended timeouts (86400s for long-lived connections)
- MUST come BEFORE `/api` location block

**See:** `summit-api-nginx.conf` for complete configuration

