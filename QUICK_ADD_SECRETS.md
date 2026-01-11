# Quick Guide: Add AWS Credentials to GitHub Secrets

## Your Credentials

- **AWS_ACCESS_KEY_ID:** `AKIASFECYFH66RL6DHYD`
- **AWS_SECRET_ACCESS_KEY:** `OERAbZO5EHNo4W8ewrFzqCsj32ri/znEh853gtwm`

## Steps (2 minutes)

1. **Go to GitHub Repository**
   - Navigate to: `https://github.com/YOUR_USERNAME/YOUR_REPO`
   - Click **Settings** (top menu)

2. **Open Secrets**
   - Left sidebar: **Secrets and variables** → **Actions**
   - Click **New repository secret**

3. **Add First Secret**
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: `AKIASFECYFH66RL6DHYD`
   - Click **Add secret**

4. **Add Second Secret**
   - Click **New repository secret** again
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: `OERAbZO5EHNo4W8ewrFzqCsj32ri/znEh853gtwm`
   - Click **Add secret**

5. **Done!**
   - Both secrets should now be listed
   - Go to **Actions** tab to test workflows

## Test It

1. Go to **Actions** tab
2. Select **"Configure SSL Domain"**
3. Click **"Run workflow"**
4. Choose **"check-status"**
5. Click **"Run workflow"**

If it succeeds, your credentials are working! ✅

