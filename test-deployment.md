# Test Chime Deployment

## Wait for Build to Complete (~10 minutes)

Monitor at: https://console.aws.amazon.com/amplify

## Testing Checklist

### 1. Basic Health Check
```bash
# Backend health
curl https://summit.api.codingeverest.com/health
# Should return: {"status":"ok","websocket":"enabled","webrtc":"enabled","chime":"enabled"}

# Frontend loads
curl https://summit.codingeverest.com
# Should return HTML
```

### 2. Login Test
1. Visit https://summit.codingeverest.com
2. Login with existing account
3. Check browser console for errors (F12)
4. Verify dashboard loads

### 3. Audio Call Test
1. Open two browser windows (or use two devices)
2. Login as different users in each
3. Start a chat between them
4. Click the audio call button
5. Both users should connect
6. Speak and verify audio works
7. Test mute/unmute button

### 4. Video Call Test
1. Click video call button
2. Grant camera/microphone permissions
3. Should see your own video
4. Other user joins
5. Should see their video
6. Test video on/off button
7. Test with 3+ participants

### 5. Browser Console Check
Open DevTools (F12) and check for:
- ✅ No red errors
- ✅ Chime SDK loaded
- ✅ WebSocket connected
- ✅ API calls successful

## Expected Results

### Successful Deployment:
- ✅ Frontend loads at summit.codingeverest.com
- ✅ Login works
- ✅ Dashboard displays
- ✅ Call button appears
- ✅ Calls connect
- ✅ Audio transmits
- ✅ Video displays
- ✅ Controls work

### Common Issues:

**Issue: "Failed to connect"**
- Check backend: `curl https://summit.api.codingeverest.com/health`
- Check browser console for specific error

**Issue: No audio/video**
- Check browser permissions (camera/microphone)
- Check if device is in use by another app
- Try different browser

**Issue: CORS errors**
- Backend .env should have: `CORS_ORIGIN=https://summit.codingeverest.com`
- Restart backend if needed

## Build Verification

After Amplify build completes, verify:

1. **Build succeeded** - Green checkmark in Amplify
2. **No build errors** - Check build logs
3. **Assets deployed** - Check deployment details
4. **CDN updated** - May take 1-2 minutes

## Quick Test Commands

```bash
# Test backend
python summit/test-health.py

# Check if frontend updated (look for new bundle hash)
curl -I https://summit.codingeverest.com

# Test API from frontend perspective
curl https://summit.api.codingeverest.com/api/auth/health
```

## Success Indicators

✅ Build shows "Deployed" in Amplify  
✅ Health endpoint returns OK  
✅ Frontend loads without errors  
✅ Can login successfully  
✅ Call button visible  
✅ Calls connect and work  

---

**Deployment pushed! Check Amplify console for build progress.**
