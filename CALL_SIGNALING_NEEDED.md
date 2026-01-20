# Call Signaling Implementation Needed

## Current Status
✅ Chime meetings are created successfully
✅ Caller joins the meeting and waits
❌ Receiver doesn't know there's an incoming call

## Problem
When you click "call", the app:
1. Creates a Chime meeting ✅
2. Joins the meeting ✅
3. **MISSING**: Doesn't notify the other user

## Solution Needed

### Backend (summit/server/src/index.ts)
Add endpoint to send call notifications via WebSocket:

```typescript
app.post("/api/call/notify", authenticateToken, async (req, res) => {
  try {
    const { recipientId, roomName, callType } = req.body;
    const callerId = req.user!.id;
    const callerName = req.user!.name || req.user!.email;

    // Send WebSocket notification to recipient
    messageNotifier.notifyUser(recipientId, {
      type: "INCOMING_CALL",
      callerId,
      callerName,
      roomName,
      callType,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending call notification:", error);
    res.status(500).json({ error: "Failed to send call notification" });
  }
});
```

### Frontend (summit/desktop/src/hooks/useChime.ts or Dashboard.tsx)
When starting a call, notify the other user:

```typescript
// After creating meeting, send notification
await fetch(`${SERVER_URL}/api/call/notify`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    recipientId: otherUserId, // Need to get this from chat
    roomName: roomName,
    callType: callType,
  }),
});
```

### Frontend WebSocket Handler (summit/desktop/src/hooks/useMessageWebSocket.ts)
Already listens for messages, needs to handle INCOMING_CALL:

```typescript
case "INCOMING_CALL":
  // Dispatch event that Dashboard listens to
  window.dispatchEvent(new CustomEvent('incomingCall', {
    detail: {
      callerId: data.callerId,
      callerName: data.callerName,
      roomName: data.roomName,
      callType: data.callType,
    }
  }));
  break;
```

## Quick Implementation
The fastest way is to add this to the existing message WebSocket system since it's already set up and working.
