# Notification System - Summit Web App

## Current Implementation (Commit: 44d8931)

### What Works
✅ **Browser notifications** when:
- Browser is open (even if tab is in background)
- Browser is minimized
- User has granted notification permission

✅ **Notification types**:
- Incoming calls (with ringtone)
- New messages
- Chat requests

✅ **Features**:
- Persistent call notifications (stay until user interacts)
- Auto-dismiss message notifications (5 seconds)
- Click notification to focus app
- Ringtone plays for incoming calls

### Web App Limitations

⚠️ **Notifications DO NOT work when**:
- Browser is completely closed
- User has denied notification permission
- Browser doesn't support notifications (very old browsers)

This is a **fundamental limitation of web applications**. Web apps cannot send notifications when the browser is closed.

## How It Works

### 1. Permission Request
On first login, users see a permission request screen asking for:
- Camera access (for video calls)
- Microphone access (for audio/video calls)
- Notification permission (for alerts)

### 2. Notification Flow

#### Incoming Call:
1. Caller clicks call button
2. Backend sends WebSocket message to receiver
3. Receiver's browser receives WebSocket message
4. Browser shows notification: "📞 Incoming video call from [Name]"
5. Ringtone plays (Facebook Messenger style)
6. Notification stays visible until user clicks Accept/Decline
7. Auto-dismisses after 30 seconds if no response

#### New Message:
1. Sender sends message
2. Backend sends WebSocket message to receiver
3. Receiver's browser receives WebSocket message
4. Browser shows notification: "New message from [Name]"
5. Message preview shown in notification body
6. Auto-dismisses after 5 seconds

### 3. Browser Requirements

**Supported Browsers:**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (macOS/iOS)

**Required:**
- HTTPS connection (notifications don't work on HTTP)
- User must grant notification permission
- Browser must be running (can be minimized)

## Solutions for "Browser Closed" Problem

### Option 1: Desktop App (Recommended)
Build a native desktop app using Tauri (already set up in codebase):
- ✅ Runs in background even when window is closed
- ✅ Native OS notifications
- ✅ System tray icon
- ✅ Auto-start on boot
- ✅ Better performance

**Status**: Tauri is already configured in `summit/desktop/src-tauri/`

### Option 2: Progressive Web App (PWA)
Convert to PWA with Service Workers:
- ✅ Can receive push notifications when browser is closed
- ✅ Works on mobile devices
- ✅ Install as "app" on desktop
- ⚠️ Requires push notification service (Firebase, OneSignal, etc.)
- ⚠️ More complex setup

### Option 3: Mobile App
Build native mobile apps:
- ✅ Always-on push notifications
- ✅ Better mobile experience
- ⚠️ Requires separate iOS/Android development

## Current User Experience

### Best Case (Browser Open):
1. User receives call → Notification appears immediately
2. User clicks notification → App focuses and shows incoming call screen
3. User clicks Accept → Joins call

### Worst Case (Browser Closed):
1. User receives call → **No notification** (browser is closed)
2. Caller waits 30 seconds → Call times out
3. User opens browser later → Sees missed call in chat

## Recommendations

### Short Term (Current Web App):
1. ✅ Ensure users grant notification permission (already implemented)
2. ✅ Show clear messaging about keeping browser open
3. ✅ Add "missed call" indicators in chat
4. ✅ Send email notifications for missed calls (optional)

### Long Term (Desktop App):
1. Build and distribute Tauri desktop app
2. App runs in system tray
3. Native notifications work even when window is closed
4. Better user experience overall

## Testing Notifications

### Test 1: Browser Tab in Background
1. Open Summit in one tab
2. Switch to another tab
3. Have someone call you
4. **Expected**: Notification appears, ringtone plays

### Test 2: Browser Minimized
1. Open Summit
2. Minimize browser window
3. Have someone call you
4. **Expected**: Notification appears, ringtone plays

### Test 3: Browser Closed
1. Close browser completely
2. Have someone call you
3. **Expected**: ❌ No notification (this is expected behavior for web apps)

## Troubleshooting

### Notifications Not Showing?

**Check 1: Permission Granted?**
- Go to browser settings → Site settings → Notifications
- Ensure summit.codingeverest.com is allowed

**Check 2: Browser Supports Notifications?**
- Open browser console
- Type: `"Notification" in window`
- Should return `true`

**Check 3: HTTPS Connection?**
- Notifications only work on HTTPS
- Check URL starts with `https://`

**Check 4: Browser Open?**
- Web apps can't send notifications when browser is closed
- Keep browser open (can be minimized)

## Code References

- **Notification Library**: `summit/desktop/src/lib/notifications.ts`
- **Permission Request**: `summit/desktop/src/components/PermissionsRequest.tsx`
- **Call Notifications**: `summit/desktop/src/components/Dashboard.tsx` (line ~180)
- **WebSocket Handler**: `summit/desktop/src/hooks/useMessageWebSocket.ts`

## Future Enhancements

1. **Service Worker for PWA**
   - Add push notification support
   - Work when browser is closed
   - Requires backend push service

2. **Desktop App Distribution**
   - Build Tauri app for Windows/Mac/Linux
   - Distribute via website or app stores
   - Native notifications always work

3. **Email Notifications**
   - Send email for missed calls
   - Configurable in settings
   - Fallback when browser is closed

4. **SMS Notifications** (Optional)
   - Send SMS for urgent calls
   - Requires SMS service integration
   - Cost per SMS
