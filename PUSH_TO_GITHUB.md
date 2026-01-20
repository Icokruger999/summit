# Push to GitHub to Trigger Amplify Build

## Current Status
✅ Changes committed locally  
✅ Build tested and working  
⚠️ Need to push to GitHub  

## Quick Fix: Use Personal Access Token

### Step 1: Create GitHub Token (2 minutes)

1. **Go to GitHub Settings:**
   - https://github.com/settings/tokens

2. **Generate New Token:**
   - Click "Generate new token" → "Generate new token (classic)"
   
3. **Configure Token:**
   - Note: `Summit Deployment`
   - Expiration: `90 days` (or your preference)
   - Select scopes: ✅ **repo** (check all repo boxes)
   
4. **Generate and Copy:**
   - Click "Generate token"
   - **COPY THE TOKEN NOW** (you won't see it again!)
   - Example: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Push with Token

```powershell
# In PowerShell, run this command:
cd C:\summit\summit
git push https://YOUR_TOKEN_HERE@github.com/Icokruger999/summit.git main
```

**Replace `YOUR_TOKEN_HERE` with your actual token**

Example:
```powershell
git push https://ghp_abc123xyz789@github.com/Icokruger999/summit.git main
```

### Step 3: Amplify Auto-Deploys

Once pushed:
- GitHub receives the commit
- Amplify detects the change
- Build starts automatically (~5-10 minutes)
- Deployment completes

## Alternative: Save Token for Future Use

### Option A: Git Credential Manager (Recommended)
```powershell
# Windows will prompt for credentials and save them
git push origin main
# Enter username: Icokruger999
# Enter password: YOUR_TOKEN (paste the token)
```

### Option B: Update Remote URL
```powershell
# Save token in remote URL (less secure but convenient)
git remote set-url origin https://YOUR_TOKEN@github.com/Icokruger999/summit.git
git push origin main
```

### Option C: Use SSH (Most Secure)
```powershell
# If you have SSH key set up
git remote set-url origin git@github.com:Icokruger999/summit.git
git push origin main
```

## What Happens After Push

1. **GitHub receives commit** (instant)
2. **Amplify webhook triggered** (instant)
3. **Build starts** (~5-10 minutes)
   - Installs dependencies
   - Runs `npm run build`
   - Sets `VITE_SERVER_URL=https://api.codingeverest.com`
4. **Deployment** (~1-2 minutes)
5. **CDN update** (~1-2 minutes)

**Total time: ~10 minutes**

## Monitor Deployment

### Amplify Console:
- https://console.aws.amazon.com/amplify
- Select your Summit app
- Watch build progress in real-time

### Check Status:
```powershell
# After deployment, test:
curl https://summit.codingeverest.com
curl https://summit.api.codingeverest.com/health
```

## What's Being Deployed

### Changes in this commit:
- ✅ Chime SDK package added
- ✅ Full audio/video implementation
- ✅ Updated useChime hook
- ✅ Updated CallRoom component
- ✅ Fixed production API URL

### Backend (already deployed):
- ✅ Chime endpoints working
- ✅ Syntax errors fixed
- ✅ Server stable

## Troubleshooting

### Token doesn't work:
- Make sure you selected "repo" scope
- Token must not be expired
- Copy the entire token (starts with `ghp_`)

### Still getting authentication error:
```powershell
# Clear cached credentials
git credential-cache exit

# Or use token directly in URL
git push https://YOUR_TOKEN@github.com/Icokruger999/summit.git main
```

### Need to see what's committed:
```powershell
git log -1
git show HEAD
```

## Quick Command

**Just replace YOUR_TOKEN and run:**

```powershell
cd C:\summit\summit
git push https://YOUR_TOKEN@github.com/Icokruger999/summit.git main
```

---

**Once pushed, Amplify will automatically build and deploy in ~10 minutes!**
