# Call Connection Debugging - January 20, 2026

## Issue
Caller is stuck on "Connecting..." screen and not entering the call room, while receiver (Stacey) enters the room but then disconnects.

## Root Cause Analysis

### Backend Status
✅ Backend is working correctly:
- Meetings are being created successfully
- Attendees are being created successfully for both caller and receiver
- Multiple attendees created for meeting `34ebb718-7cff-403e-94d8-46fbd77f2713`
- No 500 errors in backend logs
- Call notifications are being sent via WebSocket

### Frontend Flow
1. **Caller clicks call button** → `onStartCall` is triggered
2. **onStartCall sets**: `inCall=true`, `callRoom=roomName`, `callType=type`
3. **CallRoom component renders** with `isConnected=false` (shows "Connecting..." screen)
4. **CallRoom's useEffect** calls `connect(roomName)` in useChime hook
5. **useChime.connect**:
   - Checks for existing meeting (GET `/api/chime/meeting/:chatId`)
   - If not found, creates new meeting (POST `/api/chime/meeting`)
   - Creates attendee (POST `/api/chime/attendee`)
   - Initializes Chime SDK session
   - Starts audio/video
   - Sets `isConnected=true`
   - Calls `onConnected()` callback

### Potential Issues
1. **Meeting data validation**: Meeting might be missing `MediaPlacement` field required by Chime SDK
2. **Connection timing**: `isConnected` might not be updating properly
3. **Error handling**: Errors might be failing silently without proper logging

## Changes Made (Commit: 54a4b74)

### 1. Enhanced Logging in useChime.ts
```typescript
// Added detailed logging:
console.log("Meeting ID:", meetingData.MeetingId);
console.log("Attendee ID:", attendeeData.AttendeeId);
console.log("Calling onConnected callback");
console.error("Error details:", error);
```

### 2. Meeting Data Validation
```typescript
// Validate meeting data has required fields
if (!meetingData.MeetingId || !meetingData.MediaPlacement) {
  console.error("Invalid meeting data:", meetingData);
  throw new Error("Meeting data is missing required fields");
}
```

### 3. Explicit State Updates
```typescript
// Set connected state immediately after starting session
setIsConnected(true);
isConnectingRef.current = false;
console.log("Chime session started successfully");
```

## Testing Steps

### Test 1: Caller Enters Room Immediately
1. User A (caller) clicks video call button
2. **Expected**: User A should see "Connecting..." briefly, then enter the call room with video controls
3. **Check browser console** for:
   - "Meeting created: [meeting-id]"
   - "Attendee created: [attendee-id]"
   - "Chime session started successfully"
   - "Meeting ID: [meeting-id]"
   - "Calling onConnected callback"

### Test 2: Receiver Joins Same Meeting
1. User B (receiver) should receive incoming call notification
2. User B clicks "Accept"
3. User B goes through pre-call settings
4. User B clicks "Join now"
5. **Expected**: User B should see "Connecting..." briefly, then enter the SAME call room as User A
6. **Check browser console** for:
   - "Joining existing meeting: [same-meeting-id]"
   - "Attendee created: [different-attendee-id]"
   - "Chime session started successfully"

### Test 3: Both Users See Each Other
1. Once both users are in the call room
2. **Expected**: 
   - Each user should see their own video (if camera enabled)
   - Each user should see the other user's video tile
   - Remote video tiles count should show "1 participant"
   - Audio should work bidirectionally

### Test 4: Camera/Mic Controls Work During Call
1. While in active call, click camera toggle button
2. **Expected**: Camera turns off/on, video tile updates
3. Click mic toggle button
4. **Expected**: Mic mutes/unmutes

## Diagnostic Commands

### Check Backend Logs
```bash
python summit/check-attendee-errors.py
```

### Check Meeting Creation
```bash
python summit/check-call-logs.py
```

### Check WebSocket Notifications
```bash
python summit/check-websocket-notify.py
```

## Known Working State
- Backend: Meetings and attendees are being created successfully
- Frontend: Call notification system works (receiver gets notification)
- Frontend: Pre-call settings screen works
- Frontend: Camera/mic toggle buttons work during call

## Next Steps If Issue Persists
1. Check browser console for specific error messages
2. Verify meeting data structure returned by backend includes `MediaPlacement`
3. Check if Chime SDK is throwing errors during session initialization
4. Verify both users are trying to join the same meeting ID
5. Check network tab for failed API requests

## Deployment
- Commit: 54a4b74
- Pushed to: main branch
- Amplify: Building automatically
- Expected build time: 3-5 minutes
