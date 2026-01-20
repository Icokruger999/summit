# Fix Meeting Creation Spam

## Problem
The frontend is creating dozens of meetings per second, causing:
- AWS Chime SDK rate limiting (ThrottlingException)
- 500 errors on attendee creation
- Meetings ending immediately
- Flashing UI as it retries

## Root Cause
Every time the user clicks "call", or the component re-renders, it calls `connect()` which creates a NEW meeting. There's no:
1. Check if a meeting already exists for this chat
2. Debouncing to prevent rapid retries
3. Proper error handling for rate limits

## Solution

### Backend (Already Applied)
- ClientRequestToken fix applied ✅
- ExternalMeetingId hashing applied ✅

### Frontend (Needs Fix)
1. **Add meeting cache** - Store active meetings by chatId
2. **Reuse existing meetings** - Check cache before creating new
3. **Add retry delay** - Wait 2-3 seconds between retries
4. **Handle 429 errors** - Show "Please wait" message on rate limit
5. **Cleanup old meetings** - Delete meetings when call ends

### Immediate Workaround
Stop clicking the call button multiple times - each click creates a new meeting!

## Files to Update
- `summit/desktop/src/hooks/useChime.ts` - Add meeting cache and reuse logic
- `summit/desktop/src/components/Call/CallRoom.tsx` - Add retry delay on error
