# Fix 404 Error on Amplify

## ❌ Problem

**Error:** `404 Not Found` when accessing `https://d1mhd5fnnjyucj.amplifyapp.com`

## 🔍 Root Cause

The Amplify app is connected to GitHub repo: `https://github.com/Icokruger999/summit`

But the frontend files (`index.html`) might be:
1. **Not in the repo root** - They're in `amplify-summit/` locally but need to be in root
2. **Not pushed to GitHub** - Files exist locally but not in the repo
3. **Build hasn't run** - Amplify needs to build/deploy the app
4. **Build failed** - Check Amplify Console for build errors

## ✅ Solutions

### Option 1: Move Files to Repo Root (Recommended)

The `amplify.yml` says `baseDirectory: /` which means files should be in the repo root:

```bash
# In your local repo (summit)
# Copy index.html to root
cp amplify-summit/index.html .
cp amplify-summit/amplify.yml .

# Commit and push
git add index.html amplify.yml
git add amplify-summit/app/  # Add app directory if needed
git commit -m "Add Amplify frontend files"
git push origin main
```

### Option 2: Update amplify.yml to Use Subdirectory

If you want to keep files in `amplify-summit/`, update `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo "Summit Login - No build needed (static HTML)"
    build:
      commands:
        - echo "Deploying static files from amplify-summit/"
  artifacts:
    baseDirectory: amplify-summit  # Changed from /
    files:
      - '**/*'
```

Then commit and push:

```bash
git add amplify-summit/amplify.yml
git commit -m "Update amplify.yml to use amplify-summit directory"
git push origin main
```

### Option 3: Check and Trigger Build

1. **Go to Amplify Console:**
   - https://console.aws.amazon.com/amplify/home?region=eu-west-1#/d1mhd5fnnjyucj/builds

2. **Check Build Status:**
   - Look for failed builds (red)
   - Check build logs for errors

3. **Trigger Manual Build:**
   - Click "Run build" or "Redeploy this version"
   - Select branch: `main`

4. **Check Build Logs:**
   - Look for: "index.html not found"
   - Or: "No files in baseDirectory"

## 📁 Required File Structure in GitHub Repo

```
summit/ (GitHub repo root)
├── index.html          ← Must be here for baseDirectory: /
├── amplify.yml         ← Amplify build config
└── app/
    └── index.html      ← Dashboard page
```

## 🔧 Quick Fix Commands

```bash
# Navigate to your local repo
cd /path/to/summit

# Copy files to root (if they're in amplify-summit/)
cp amplify-summit/index.html .
cp amplify-summit/amplify.yml .
cp -r amplify-summit/app .

# Commit and push
git add index.html amplify.yml app/
git commit -m "Add Amplify frontend files to root"
git push origin main

# Amplify will auto-build when you push to main branch
```

## ✅ Verify Fix

After pushing to GitHub:

1. **Check Amplify Console:**
   - https://console.aws.amazon.com/amplify/home?region=eu-west-1#/d1mhd5fnnjyucj
   - Should show a new build triggered
   - Wait for build to complete (1-2 minutes)

2. **Test URL:**
   - https://d1mhd5fnnjyucj.amplifyapp.com
   - Should show login page (not 404)

## 🎯 Most Likely Fix

**The files are probably in `amplify-summit/` locally but not in the GitHub repo root.**

**Solution:** Copy `index.html` and `amplify.yml` to the repo root, commit and push.

---

**Once fixed, the login page will work!** ✅

