# Deploy Chime Updates to Amplify

## Summary

**Backend:** ✅ Already deployed and working  
**Frontend:** ⚠️ Needs deployment

## What Changed

### Backend (Already Deployed) ✅
- Fixed region syntax: `region: 'us-east-1'`
- Fixed MediaRegion syntax: `MediaRegion: "us-east-1"`
- Server restarted and stable

### Frontend (Needs Deployment) ⚠️
- Added Chime SDK package (`amazon-chime-sdk-js`)
- Implemented full audio/video connection logic
- Updated CallRoom component with video tiles
- Fixed `.env.production` URL

## Why Deploy?

Without deployment:
- ❌ Calls won't work in production
- ❌ Users can't make audio/video calls
- ❌ Chime SDK not available in browser

With deployment:
- ✅ Full audio/video calling
- ✅ Multi-participant support
- ✅ Working mute/unmute
- ✅ Working video on/off

## Deployment Steps

### Option 1: GitHub Auto-Deploy (Recommended)

If your Amplify is connected to GitHub:

```bash
# 1. Commit changes
cd summit
git add .
git commit -m "Add Chime SDK integration for audio/video calls"
git push origin main

# 2. Amplify will auto-deploy
# Monitor at: https://console.aws.amazon.com/amplify
```

**Time:** 5-10 minutes (automatic)

### Option 2: Manual Build & Upload

If deploying manually:

```bash
# 1. Build the frontend
cd summit/desktop
npm run build

# 2. Upload to Amplify
# - Go to AWS Amplify Console
# - Select your app
# - Click "Deploy without Git"
# - Upload the desktop/dist/ folder
```

**Time:** 10-15 minutes

## Pre-Deployment Checklist

✅ Backend is running: `python summit/test-health.py`  
✅ `.env.production` has correct URL: `https://summit.api.codingeverest.com`  
✅ Chime SDK installed: Check `desktop/package.json`  
✅ Code changes committed (if using Git)  

## Post-Deployment Testing

### Test 1: Health Check
```bash
# Should return: {"status":"ok","websocket":"enabled","webrtc":"enabled","chime":"enabled"}
curl https://summit.api.codingeverest.com/health
```

### Test 2: Frontend Loads
1. Visit https://summit.codingeverest.com
2. Login with test account
3. Check browser console for errors

### Test 3: Audio Call
1. Open two browser windows
2. Login as different users
3. Start a chat
4. Click audio call button
5. Both users should connect
6. Test audio transmission

### Test 4: Video Call
1. Start a video call
2. Should see local video
3. Other user joins
4. Should see remote video
5. Test video on/off button

## Troubleshooting

### Issue: Build Fails
```bash
# Clear cache and rebuild
cd summit/desktop
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: API Calls Fail
Check `.env.production`:
```bash
cat summit/desktop/.env.production
# Should show: VITE_SERVER_URL=https://summit.api.codingeverest.com
```

### Issue: Chime SDK Not Found
```bash
# Verify installation
cd summit/desktop
npm list amazon-chime-sdk-js
# Should show: amazon-chime-sdk-js@3.22.0
```

### Issue: CORS Errors
Backend `.env` should have:
```
CORS_ORIGIN=https://summit.codingeverest.com
```

## Files Changed

### Modified:
- `desktop/package.json` - Added Chime SDK
- `desktop/src/hooks/useChime.ts` - Full rewrite
- `desktop/src/components/Call/CallRoom.tsx` - Updated UI
- `desktop/.env.production` - Fixed URL

### Backend (Already Deployed):
- `/var/www/summit/index.js` - Fixed syntax errors

## Environment Variables

### Production (.env.production)
```
VITE_SERVER_URL=https://summit.api.codingeverest.com
```

### Backend (.env on EC2)
```
CORS_ORIGIN=https://summit.codingeverest.com
JWT_SECRET=your-secret
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=summit
DB_USER=summit_user
DB_PASSWORD=your-password
```

## Amplify Build Configuration

The `amplify.yml` is already configured correctly:
- Sets `VITE_SERVER_URL=https://api.codingeverest.com`
- Builds from `desktop/` directory
- Outputs to `desktop/dist/`

## Expected Build Output

```
✓ building...
✓ built in 45s
✓ 275 modules transformed
✓ dist/index.html created
✓ dist/assets/* created
```

## Deployment Timeline

1. **Commit & Push:** 1 minute
2. **Amplify Build:** 5-8 minutes
3. **Deployment:** 1-2 minutes
4. **CDN Propagation:** 1-2 minutes

**Total:** ~10 minutes

## Success Indicators

After deployment:

✅ Build succeeds in Amplify console  
✅ Frontend loads at summit.codingeverest.com  
✅ No console errors  
✅ Can login  
✅ Can start calls  
✅ Audio/video works  

## Rollback Plan

If something goes wrong:

### Option 1: Revert Git Commit
```bash
git revert HEAD
git push origin main
```

### Option 2: Redeploy Previous Version
In Amplify console:
- Go to "Deployments"
- Find previous successful build
- Click "Redeploy this version"

## Next Steps After Deployment

1. Test with real users
2. Monitor for errors
3. Gather feedback
4. Consider adding:
   - Device selection UI
   - Call notifications
   - Screen sharing
   - Call history

## Quick Deploy Command

```bash
# One-liner for Git deployment
cd summit && git add . && git commit -m "Deploy Chime SDK integration" && git push origin main
```

---

**Ready to deploy?** Choose Option 1 (Git) or Option 2 (Manual) above.

**Backend is already updated, so you just need to deploy the frontend!**
