# Native Desktop Notifications Enhanced - January 20, 2026

## Problem
When a user receives an incoming call but the app is minimized, in the background, or they're not actively looking at the browser, they won't see the call notification.

## Solution
Enhanced the notification system to use **Tauri native notifications** which work even when:
- App is minimized
- App is in the background
- User is on a different desktop/workspace
- App window is not focused

## Changes Made

### 1. Enhanced `notifications.ts`
- **showCallNotification**: Now tries Tauri native notification first, falls back to web notification
- **showMessageNotification**: Same dual approach for message notifications
- Added proper permission handling for Tauri notifications
- Made functions async to properly await Tauri notification API

### 2. Updated Dashboard.tsx
- Changed `handleIncomingCall` to async function
- Properly awaits `showCallNotification` call
- Removed web notification reference (handled internally now)

## How It Works

### For Desktop App (Tauri)
1. When incoming call arrives, tries to send Tauri native notification
2. Checks if notification permission is granted
3. If not granted, requests permission
4. Sends OS-level notification with:
   - Title: "📞 Incoming video/audio call"
   - Body: "[Caller Name] is calling you. Click to answer."
   - Icon: App icon
5. Notification appears in system notification center (Windows Action Center, macOS Notification Center, etc.)
6. Works even when app is minimized or in background

### For Web Version (Browser)
1. Falls back to standard web notifications
2. Uses `requireInteraction: true` for calls (stays visible until user interacts)
3. Plays system notification sound

## Notification Types

### Incoming Call Notifications
- **Priority**: High (requireInteraction: true)
- **Duration**: 30 seconds (auto-dismiss if not answered)
- **Sound**: Ringtone plays via sounds.ts
- **Action**: Click to focus app and show call screen

### Message Notifications
- **Priority**: Normal
- **Duration**: 5 seconds (auto-dismiss)
- **Sound**: Message received sound
- **Action**: Click to focus app and open chat

## Testing

### Test 1: App Minimized
1. Minimize the Summit app
2. Have someone call you
3. **Expected**: OS notification appears in system tray/notification center
4. Click notification → App comes to foreground with call screen

### Test 2: App in Background
1. Switch to another app (don't minimize Summit)
2. Have someone call you
3. **Expected**: OS notification appears
4. Ringtone plays
5. Click notification → Summit comes to foreground

### Test 3: Different Desktop/Workspace
1. Move Summit to a different virtual desktop
2. Switch to another desktop
3. Have someone call you
4. **Expected**: OS notification appears on current desktop
5. Click notification → Switches to Summit's desktop

### Test 4: App Focused
1. Keep Summit app focused and visible
2. Have someone call you
3. **Expected**: 
   - OS notification appears
   - In-app call screen shows immediately
   - Ringtone plays

## Platform Support

### Windows
- ✅ Native Windows notifications via Action Center
- ✅ Toast notifications with app icon
- ✅ Click to focus app

### macOS
- ✅ Native macOS notifications via Notification Center
- ✅ Banner/alert style notifications
- ✅ Click to focus app

### Linux
- ✅ Native Linux notifications via libnotify
- ✅ Desktop environment integration (GNOME, KDE, etc.)
- ✅ Click to focus app

### Web Browser
- ✅ Web Notifications API
- ⚠️ Requires user permission
- ⚠️ Only works when browser tab is open

## Configuration

### Tauri Config (Already Set Up)
```json
"plugins": {
  "notification": {
    "all": true
  }
}
```

### Cargo.toml (Already Set Up)
```toml
tauri-plugin-notification = "2.0"
```

## Permission Handling

### First Launch
1. App requests notification permission on first incoming call/message
2. User grants/denies permission
3. Permission is remembered for future notifications

### Permission Denied
- Falls back to in-app notifications only
- User can re-enable in OS settings
- App will retry permission request on next notification

## Future Enhancements

### Possible Improvements
1. **Custom notification actions**: Add "Answer" and "Decline" buttons directly in notification
2. **Notification sounds**: Custom notification sounds per notification type
3. **Notification badges**: Show unread count on app icon
4. **Persistent notifications**: Keep call notifications visible until answered/declined
5. **Rich notifications**: Show caller avatar in notification

### Implementation Notes
- Tauri v2 supports notification actions via `actions` parameter
- Would require additional Tauri API integration
- Could add notification click handlers for direct actions

## Deployment
- Commit: b951b2d (includes meeting fix)
- Next commit: Will include notification enhancements
- Amplify: Auto-deploys web version
- Desktop: Requires rebuild for Tauri changes to take effect

## Known Limitations
1. Web version requires browser tab to be open
2. Notification permission must be granted by user
3. Some OS settings may block notifications (Do Not Disturb mode)
4. Notification appearance varies by OS theme/settings
