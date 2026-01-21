# Summit Calling System - How It Works

## Overview

Summit's calling system works like Microsoft Teams - all call invitations trigger incoming call notifications with ringing, whether it's a direct call, group call, or adding people to an existing call.

## Call Types

### 1. Direct Calls (1-on-1)

**How it works:**
1. User A clicks call button in direct chat with User B
2. Frontend sends notification to User B via `/api/chime/notify`
3. User B receives `INCOMING_CALL` WebSocket notification
4. User B's device shows incoming call screen with ringing sound
5. User B can accept or decline

**Code location:** `Dashboard.tsx` - `onStartCall` handler

### 2. Group Calls

**How it works:**
1. User A clicks call button in group chat
2. Frontend fetches all group members via `/api/chats/:chatId`
3. Frontend sends notifications to ALL members (except caller) via `/api/chime/notify`
4. All members receive `INCOMING_CALL` WebSocket notifications simultaneously
5. All members' devices show incoming call screen with ringing
6. Members can join at any time

**Code location:** `Dashboard.tsx` - `onStartCall` handler (group logic)

### 3. Add People During Call

**How it works:**
1. User A is already in a call
2. User A clicks "Add People" button
3. User A selects contacts to invite
4. For each contact, frontend sends notification via `/api/chime/notify`
5. Each invited person receives `INCOMING_CALL` WebSocket notification
6. Their devices show incoming call screen with ringing
7. They can join the ongoing call

**Code location:** `CallRoom.tsx` - `inviteToCall` function

## Technical Flow

### Backend (`/api/chime/notify`)

```typescript
// Sends WebSocket notification with type "INCOMING_CALL"
messageNotifier.notifyUser(recipientId, {
  callerId,
  callerName,
  roomName,
  callType: "video" | "audio",
  timestamp: new Date().toISOString(),
}, "INCOMING_CALL");
```

### Frontend (Dashboard.tsx)

```typescript
// Listens for incoming call notifications
useEffect(() => {
  const handleIncomingCall = (event: CustomEvent) => {
    const { callerId, callerName, callType, roomName } = event.detail;
    
    // Play ringtone
    startCallRinging();
    
    // Show incoming call UI
    setIsCalling(true);
    setCallingUser(callerName);
    // ... etc
  };
  
  window.addEventListener('incomingCall', handleIncomingCall);
}, []);
```

## Key Features

✅ **Automatic Ringing** - All call invitations trigger ringing notifications
✅ **Teams-Style Group Calls** - Everyone gets called simultaneously
✅ **Add People Mid-Call** - New invitees get ringing notifications
✅ **WebSocket Real-Time** - Instant notifications, no polling
✅ **Accept/Decline** - Recipients can choose to join or ignore

## Notification Types

| Scenario | Notification Type | User Experience |
|----------|------------------|-----------------|
| Direct call | `INCOMING_CALL` | Ringing + Accept/Decline UI |
| Group call start | `INCOMING_CALL` | Ringing + Accept/Decline UI |
| Add people to call | `INCOMING_CALL` | Ringing + Accept/Decline UI |
| Chat message | `NEW_MESSAGE` | Toast notification + sound |

## Testing

### Test Direct Call:
1. User A calls User B
2. User B should see incoming call screen with ringing
3. User B can accept or decline

### Test Group Call:
1. Create group with 3+ members
2. User A starts call in group
3. All other members should get incoming call simultaneously
4. All should see ringing notification

### Test Add People:
1. User A and User B are in a call
2. User A clicks "Add People"
3. User A invites User C
4. User C should get incoming call notification with ringing
5. User C can join the ongoing call

## Current Status

✅ **Direct calls** - Working (sends INCOMING_CALL notification)
✅ **Group calls** - Working (sends INCOMING_CALL to all members)
✅ **Add people** - Working (sends INCOMING_CALL to invited users)
✅ **Ringing sound** - Working (plays on incoming call)
✅ **Accept/Decline UI** - Working (shows incoming call screen)

## Code Locations

**Frontend:**
- `summit/desktop/src/components/Dashboard.tsx` - Call initiation and incoming call handling
- `summit/desktop/src/components/Call/CallRoom.tsx` - Add people functionality
- `summit/desktop/src/lib/sounds.ts` - Ringtone playback

**Backend:**
- `summit/server/src/routes/chime.ts` - `/api/chime/notify` endpoint
- `summit/server/src/routes/chats.ts` - `/api/chats/:chatId` endpoint (get group members)
- `summit/server/src/lib/messageNotifier.ts` - WebSocket notification system

## Summary

**All calling scenarios already work like Microsoft Teams:**
- Direct calls → Recipient gets ringing notification
- Group calls → All members get ringing notifications simultaneously  
- Add people → New invitees get ringing notifications

The system is fully functional and deployed!
