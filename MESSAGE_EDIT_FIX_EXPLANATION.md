# Message Edit Real-Time Update Fix

## Problem
When someone else edited a message, the edit wasn't appearing in real-time. The user had to refresh the page to see the updated message content.

## Root Cause
The issue was in `Dashboard.tsx` - the `onNewMessage` callback was receiving ALL WebSocket notifications, including MESSAGE_EDITED notifications. This caused:

1. MESSAGE_EDITED notification arrives from WebSocket
2. WebSocket hook correctly dispatches `messageEdited` CustomEvent
3. BUT Dashboard's `onNewMessage` also receives the notification
4. Dashboard dispatches it as `newMessageNotification` 
5. MessageThreadSimple's `handleNewMessage` tries to add it as a new message
6. It fails with "Message already exists, skipping duplicate"
7. The `handleMessageEdited` handler never gets a chance to update the message

## The Fix
Added a filter in Dashboard's `onNewMessage` callback to skip MESSAGE_EDITED and MESSAGE_DELETED notifications:

```typescript
onNewMessage: (notification: any) => {
  // IMPORTANT: Only handle NEW_MESSAGE notifications here
  // MESSAGE_EDITED and MESSAGE_DELETED are handled by their own event listeners
  if (notification.editedAt || !notification.senderId) {
    console.log("⏭️ Skipping edit/delete notification in onNewMessage handler");
    return;
  }
  // ... rest of new message handling
}
```

## How It Works Now
1. MESSAGE_EDITED notification arrives from WebSocket
2. WebSocket hook dispatches `messageEdited` CustomEvent
3. Dashboard's `onNewMessage` sees `editedAt` field and skips it
4. MessageThreadSimple's `handleMessageEdited` receives the event
5. Message content is updated immediately in the UI

## Testing
After deployment:
1. Open chat in two browser windows (different users)
2. User A edits a message
3. User B should see the edit immediately without refresh
4. Console should show: "✏️ Message edited notification received"
5. No "Message already exists" error should appear

## Commit
- Commit: 06d7105
- File: `summit/desktop/src/components/Dashboard.tsx`
- Lines: Added filter at line ~377
