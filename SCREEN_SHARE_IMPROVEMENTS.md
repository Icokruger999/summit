# Screen Share and Participant Name Fixes

**Date**: January 21, 2026
**Commits**: c23225b, 44912f4, aef318b

## Final Implementation - Teams-Like Layout

### Layout Changes

**Before**: Grid layout with equal-sized tiles
**After**: Teams-like layout with main view + right sidebar

#### Main Video Area (Left Side - Full Screen)
- Shows screen share when you're presenting
- Shows active speaker's video when no screen share
- Shows waiting state when no video available
- Uses `object-contain` to show full content without cropping
- **"Stop Sharing" button** appears at top center when presenting (like Teams)

#### Right Sidebar (256px width)
- Your video tile at the top (with blue border)
- Remote participant tiles below
- Scrollable when many participants
- Compact aspect-ratio tiles
- Shows avatars when video is off

### Stop Sharing Button (NEW)

**Location**: Top center of main view when screen sharing
**Style**: Red button with MonitorOff icon
**Action**: Stops screen sharing without ending the call
**UX**: Matches Microsoft Teams behavior

```tsx
<button onClick={toggleScreenShare} className="bg-red-600 hover:bg-red-700">
  <MonitorOff className="w-5 h-5" />
  Stop Sharing
</button>
```

### Participant Names - FIXED

**Problem**: Showing long ID strings like "30748e1c-a2db-4997-8e65-b2f1f710fc7d9"

**Solution**: 
1. Fetch actual names from `/api/users/${userId}/profile` endpoint
2. Store names in `participantNames` state map
3. Fallback chain: API name → otherUserName prop → "Participant"

```typescript
const fetchParticipantName = async (userId: string) => {
  const response = await fetch(`${SERVER_URL}/api/users/${userId}/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  return data.name || data.email || null;
};
```

### Screen Share Improvements

**When You Share Screen**:
- Your screen takes the entire main view (full height/width)
- Your camera tile moves to right sidebar
- "You are presenting" indicator shown at bottom left
- **Red "Stop Sharing" button at top center**
- Monitor icon in bottom controls turns blue

**When Someone Else Shares**:
- Their screen takes the main view
- Their camera tile shows in sidebar
- Your camera stays in sidebar

### Key Features

✅ **Teams-like layout** - Main view + sidebar
✅ **Actual participant names** - Fetched from API
✅ **Large screen share** - Full main view
✅ **Stop Sharing button** - Red button at top (like Teams)
✅ **Compact sidebar** - Participants on right
✅ **Responsive** - Sidebar scrolls with many participants
✅ **Clean UI** - No redundant indicators

## Technical Details

### File: `summit/desktop/src/components/Call/CallRoom.tsx`

**New State**:
```typescript
const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
```

**Layout Structure**:
```tsx
<div className="flex-1 flex gap-2 p-2">
  {/* Main Video Area - flex-1 */}
  <div className="flex-1 bg-gray-900">
    {screenShareEnabled && (
      <button onClick={toggleScreenShare} className="absolute top-4 left-1/2 -translate-x-1/2">
        Stop Sharing
      </button>
    )}
    {/* Screen share or active speaker */}
  </div>
  
  {/* Right Sidebar - w-64 */}
  <div className="w-64 flex flex-col gap-2">
    {/* Your tile */}
    {/* Remote participant tiles */}
  </div>
</div>
```

**Video Binding Logic**:
- Screen share: Binds to `localVideoElementRef` in main view
- Your camera: Binds to `localVideoElementRef` in sidebar (when not sharing)
- Remote videos: Bind to sidebar tiles

## Testing

1. **Participant Names**:
   - Start a call
   - Verify actual names appear (not IDs)
   - Check both 1-on-1 and group calls

2. **Screen Share**:
   - Click "Share Screen" in bottom controls
   - Verify it takes full main view
   - **Verify red "Stop Sharing" button appears at top center**
   - Click "Stop Sharing" button
   - Verify sharing stops and camera returns

3. **Layout**:
   - Verify main view is large (left side)
   - Verify sidebar is on right (256px wide)
   - Add multiple participants and verify sidebar scrolls

## Deployment

**Commit**: aef318b
**Status**: Pushed to GitHub, Amplify will auto-deploy

Wait 3-5 minutes for Amplify build, then hard refresh (Ctrl+Shift+R).
