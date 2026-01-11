# Adding AWS Credentials to GitHub Secrets

## ⚠️ IMPORTANT SECURITY WARNING

**DO NOT commit these credentials to your repository!**
- Never add them to code files
- Never commit them to git
- Only add them via GitHub Secrets (encrypted storage)

## Your Credentials (for reference only)

- **AWS_ACCESS_KEY_ID:** `AKIASFECYFH66RL6DHYD`
- **AWS_SECRET_ACCESS_KEY:** `OERAbZO5EHNo4W8ewrFzqCsj32ri/znEh853gtwm`

## Method 1: Add via GitHub Web UI (Recommended)

### Step 1: Navigate to Repository Secrets

1. Go to your GitHub repository
2. Click **"Settings"** tab (top menu)
3. In left sidebar: **"Secrets and variables"** → **"Actions"**

### Step 2: Add AWS_ACCESS_KEY_ID

1. Click **"New repository secret"**
2. **Name:** `AWS_ACCESS_KEY_ID`
3. **Value:** `AKIASFECYFH66RL6DHYD`
4. Click **"Add secret"**

### Step 3: Add AWS_SECRET_ACCESS_KEY

1. Click **"New repository secret"** again
2. **Name:** `AWS_SECRET_ACCESS_KEY`
3. **Value:** `OERAbZO5EHNo4W8ewrFzqCsj32ri/znEh853gtwm`
4. Click **"Add secret"**

### Step 4: Verify

You should see both secrets listed:
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`

Values will be hidden (showing as `••••••••`)

## Method 2: Add via GitHub CLI (Alternative)

If you have GitHub CLI installed:

```bash
# Set AWS Access Key ID
gh secret set AWS_ACCESS_KEY_ID --repo YOUR_USERNAME/YOUR_REPO --body "AKIASFECYFH66RL6DHYD"

# Set AWS Secret Access Key
gh secret set AWS_SECRET_ACCESS_KEY --repo YOUR_USERNAME/YOUR_REPO --body "OERAbZO5EHNo4W8ewrFzqCsj32ri/znEh853gtwm"
```

## Verify Setup

1. Go to **"Actions"** tab
2. Select **"Configure SSL Domain"** workflow
3. Click **"Run workflow"**
4. Choose **"check-status"**
5. Click **"Run workflow"**
6. Check the workflow run - it should succeed

## Security Checklist

- ✅ Credentials added to GitHub Secrets (encrypted)
- ✅ Credentials NOT committed to repository
- ✅ `.env` files with credentials are in `.gitignore`
- ✅ No credentials in code files
- ✅ Secrets are only accessible to GitHub Actions workflows

## Next Steps

Once secrets are added:

1. ✅ Test the workflow runs successfully
2. ✅ The SSL certificate check workflow will run daily
3. ✅ You can manually run workflows to check SSL status
4. ✅ Workflows can now interact with your AWS account

## If You Accidentally Committed Credentials

If you accidentally committed credentials to the repository:

1. **Immediately rotate the credentials in AWS IAM**
2. Remove the credentials from git history (use `git filter-branch` or BFG Repo-Cleaner)
3. Add them to GitHub Secrets properly
4. Update `.gitignore` to exclude credential files

## Notes

- These credentials are now stored securely in GitHub Secrets
- They are encrypted and only accessible to GitHub Actions
- You can update or delete them anytime in Settings → Secrets
- If you need to rotate them, update the secrets in GitHub and AWS IAM

