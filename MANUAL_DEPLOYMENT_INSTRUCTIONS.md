# Manual Deployment to Amplify

## Git Authentication Failed

The automatic git push failed due to authentication. Here are your options:

## Option 1: Fix Git Authentication (Recommended)

### Update Git Credentials
```bash
# Configure Git with your GitHub credentials
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# Use GitHub Personal Access Token
# 1. Go to: https://github.com/settings/tokens
# 2. Generate new token (classic)
# 3. Select scopes: repo (all)
# 4. Copy the token

# Then push again:
cd summit
git push https://YOUR_TOKEN@github.com/Icokruger999/summit.git main
```

## Option 2: Manual Upload to Amplify

### Step 1: Build is Already Complete ✅
The build was successful and is in `summit/desktop/dist/`

### Step 2: Upload to Amplify Console

1. **Go to AWS Amplify Console:**
   - https://console.aws.amazon.com/amplify

2. **Select Your Summit App**

3. **Deploy Without Git:**
   - Click on your app
   - Look for "Deploy without Git" or "Manual Deploy"
   - Or go to "Hosting" → "Manual Deploy"

4. **Upload Files:**
   - Drag and drop the `summit/desktop/dist/` folder
   - Or zip it first: `Compress-Archive -Path summit/desktop/dist/* -DestinationPath summit-deploy.zip`
   - Upload the zip file

5. **Wait for Deployment:**
   - Takes 2-5 minutes
   - Monitor progress in console

### Step 3: Verify Deployment

After deployment completes:

```bash
# Test health endpoint
curl https://summit.api.codingeverest.com/health

# Visit your site
# https://summit.codingeverest.com
```

## Option 3: Use GitHub Desktop

If you have GitHub Desktop installed:

1. Open GitHub Desktop
2. Select the summit repository
3. Review changes
4. Commit with message: "Add Chime SDK integration"
5. Click "Push origin"
6. Enter credentials if prompted

## Option 4: Use SSH Instead of HTTPS

```bash
# Check current remote
cd summit
git remote -v

# If using HTTPS, switch to SSH
git remote set-url origin git@github.com:Icokruger999/summit.git

# Push
git push origin main
```

## What's Been Committed

The following changes are committed locally and ready to push:

✅ `desktop/package.json` - Added Chime SDK  
✅ `desktop/package-lock.json` - Updated dependencies  
✅ `desktop/.env.production` - Fixed API URL  
✅ `desktop/src/hooks/useChime.ts` - Full Chime implementation  
✅ `desktop/src/components/Call/CallRoom.tsx` - Updated UI  

## Build Output Location

```
summit/desktop/dist/
├── index.html
├── assets/
│   ├── index-DgGDLwgD.js (1.5MB - Main app with Chime SDK)
│   ├── livekit-DxpQyEJL.js (433KB)
│   ├── vendor-D_ZxIgX5.js (161KB)
│   ├── index-C8KD4Q26.css (44KB)
│   ├── logo-C9gMYObC.png
│   └── icon-cQajYac_.png
└── _redirects (if exists)
```

## Quick Manual Deploy Steps

### Windows PowerShell:
```powershell
# Create deployment zip
cd summit
Compress-Archive -Path desktop/dist/* -DestinationPath summit-deploy.zip -Force

# Now upload summit-deploy.zip to Amplify Console
```

### Alternative - Copy to Amplify:
1. Open File Explorer
2. Navigate to `C:\summit\summit\desktop\dist\`
3. Select all files (Ctrl+A)
4. Drag and drop to Amplify Console upload area

## After Deployment

### Test Checklist:
- [ ] Visit https://summit.codingeverest.com
- [ ] Login works
- [ ] Dashboard loads
- [ ] Start a chat
- [ ] Click call button
- [ ] Call connects
- [ ] Audio works
- [ ] Video works (if video call)
- [ ] Mute/unmute works
- [ ] Video on/off works

## Troubleshooting

### If Git Push Still Fails:
1. Use Option 2 (Manual Upload) - Fastest solution
2. Or fix authentication and try again later

### If Build Needs Rebuild:
```bash
cd summit/desktop
npm run build
```

### If Amplify Build Fails:
Check `amplify.yml` has correct settings:
- `baseDirectory: desktop/dist`
- `VITE_SERVER_URL=https://api.codingeverest.com`

## Current Status

✅ Code changes committed locally  
✅ Build completed successfully  
✅ Backend already deployed and working  
⚠️ Waiting for frontend deployment  

**Next Step:** Choose one of the options above to deploy!

---

**Recommended:** Use Option 2 (Manual Upload) for fastest deployment.
