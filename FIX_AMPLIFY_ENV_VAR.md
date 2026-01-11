# Fix Amplify Environment Variable - URGENT

## The Problem
Frontend is trying to connect to `summit-api.codingeverest.com` (doesn't exist) instead of `summit.api.codingeverest.com` (correct).

## Root Cause
`VITE_SERVER_URL` is NOT set in Amplify Console environment variables.

## Solution: Set Environment Variable in Amplify

### Step 1: Go to Amplify Console
1. Open: https://console.aws.amazon.com/amplify
2. Select your app: **summit**
3. Click: **App settings** (left sidebar)
4. Click: **Environment variables**

### Step 2: Add Environment Variable
1. Click **"Manage variables"** or **"Add variable"**
2. Enter:
   - **Key**: `VITE_SERVER_URL`
   - **Value**: `https://summit.api.codingeverest.com`
3. Click **"Save"**

### Step 3: Trigger New Build
1. Go to: **App settings > Build settings**
2. Click **"Redeploy this version"** OR
3. Make a small commit to trigger automatic build

### Step 4: Wait for Build
- Build takes 3-5 minutes
- After build completes, frontend will use correct URL

## Verify Fix

After build completes:
1. Open: https://summit.codingeverest.com
2. Open DevTools (F12) > Network tab
3. Try to login/signup
4. Check network requests - should see `summit.api.codingeverest.com` ✅
5. Should NOT see `summit-api.codingeverest.com` ❌

## Why This Happened

- Code was fixed and pushed ✅
- But Amplify environment variable was never set ❌
- Build uses code fallback which had wrong URL ❌
- Setting env var in Console overrides code fallback ✅

