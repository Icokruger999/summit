# Chime SDK Implementation Plan

## Current Status

### ✅ What's Working:
- Chime SDK is enabled on backend
- Backend has Chime endpoints (`/api/chime/meeting`, `/api/chime/attendee`)
- Chime SDK package is installed (`@aws-sdk/client-chime-sdk-meetings@3.967.0`)
- Frontend can call the endpoints

### ❌ What's NOT Working:
1. **Backend Syntax Error:** `MediaRegion: us-east-1` missing quotes (will cause crashes)
2. **Frontend Missing SDK:** No Chime SDK client library installed
3. **No Audio/Video Connection:** Frontend doesn't actually connect audio/video streams
4. **No Media Handling:** No code to handle microphone, camera, or speakers

## Issues Breakdown

### Issue 1: Backend MediaRegion Syntax Error
**Location:** `/var/www/summit/index.js` line 48
**Problem:** `MediaRegion: us-east-1` should be `MediaRegion: 'us-east-1'`
**Impact:** Will cause JavaScript errors when creating meetings
**Fix:** Add quotes around us-east-1

### Issue 2: Frontend Missing Chime SDK
**Location:** `summit/desktop/package.json`
**Problem:** Missing `amazon-chime-sdk-js` package
**Impact:** Cannot establish actual audio/video connections
**Fix:** Install `npm install amazon-chime-sdk-js`

### Issue 3: No Audio/Video Connection Logic
**Location:** `summit/desktop/src/hooks/useChime.ts`
**Problem:** Hook only calls API endpoints, doesn't use Chime SDK
**Impact:** Calls don't actually connect audio/video
**Fix:** Implement Chime SDK MeetingSession

### Issue 4: No Media Device Handling
**Location:** `summit/desktop/src/components/Call/CallRoom.tsx`
**Problem:** No code to access microphone/camera or play audio
**Impact:** Users can't hear or see each other
**Fix:** Implement device selection and media binding

## Implementation Steps

### Step 1: Fix Backend Syntax Error ✅ CRITICAL
```bash
python summit/fix-chime-mediaregion.py
```
This will fix the MediaRegion quotes issue.

### Step 2: Install Chime SDK in Frontend
```bash
cd summit/desktop
npm install amazon-chime-sdk-js
```

### Step 3: Implement Chime SDK in useChime Hook
Update `summit/desktop/src/hooks/useChime.ts` to:
- Import Chime SDK
- Create MeetingSession
- Bind audio/video devices
- Handle audio output
- Handle video tiles

### Step 4: Update CallRoom Component
Update `summit/desktop/src/components/Call/CallRoom.tsx` to:
- Display actual video streams
- Handle remote participants
- Show connection status
- Handle device permissions

### Step 5: Add Device Selection
Create pre-call settings component for:
- Microphone selection
- Camera selection
- Speaker selection
- Test audio/video before joining

## Technical Details

### Chime SDK Flow:
1. Frontend calls `/api/chime/meeting` → Gets meeting info
2. Frontend calls `/api/chime/attendee` → Gets attendee credentials
3. Frontend creates MeetingSession with meeting + attendee data
4. Frontend binds audio input (microphone)
5. Frontend binds audio output (speakers)
6. Frontend binds video input (camera)
7. Frontend starts session
8. Audio/video streams flow through Chime infrastructure

### Required Frontend Changes:
```typescript
// useChime.ts needs:
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration
} from 'amazon-chime-sdk-js';

// Create meeting session
const configuration = new MeetingSessionConfiguration(meeting, attendee);
const meetingSession = new DefaultMeetingSession(
  configuration,
  logger,
  deviceController
);

// Bind audio
await meetingSession.audioVideo.startAudioInput(deviceId);
await meetingSession.audioVideo.startAudioOutput();

// Bind video
await meetingSession.audioVideo.startVideoInput(deviceId);
await meetingSession.audioVideo.startLocalVideoTile();

// Start session
meetingSession.audioVideo.start();
```

## Priority Order

1. **CRITICAL:** Fix backend MediaRegion syntax (prevents crashes)
2. **HIGH:** Install Chime SDK in frontend
3. **HIGH:** Implement basic audio connection
4. **MEDIUM:** Implement video connection
5. **LOW:** Add device selection UI

## Testing Plan

After each step:
1. Test meeting creation: `POST /api/chime/meeting`
2. Test attendee creation: `POST /api/chime/attendee`
3. Test audio connection
4. Test video connection
5. Test with 2+ participants

## Next Actions

Would you like me to:
1. Fix the backend MediaRegion syntax error first? (CRITICAL)
2. Then implement the full Chime SDK integration in frontend?
3. Or focus on a specific part (audio-only, video, etc.)?
