# Git-Based Amplify Deployment for Summit

**Professional deployment using Git + Amplify auto-deployment**

---

## 🎯 Overview

With Git-based deployment:
1. You push code to GitHub/GitLab/CodeCommit
2. Amplify automatically detects changes
3. Builds and deploys automatically
4. Easy to update - just push changes!

---

## 📋 Prerequisites

- [ ] Git installed
- [ ] GitHub/GitLab account (or AWS CodeCommit)
- [ ] AWS Amplify access

---

## 🚀 Option A: Deploy from This Repository

If this project is already in Git:

### Step 1: Commit the Amplify Files

```bash
# Add the amplify-summit folder to your repo
git add amplify-summit/
git commit -m "Add Summit Amplify frontend"
git push origin main
```

### Step 2: Create Amplify App from Git

1. Go to **AWS Amplify Console**
2. Click **"New app"** → **"Host web app"**
3. Choose your Git provider:
   - GitHub
   - GitLab
   - Bitbucket
   - AWS CodeCommit
4. Authorize Amplify to access your repository
5. Select this repository
6. Select branch: `main` (or your branch)
7. **Important:** Set build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo "No build needed - static HTML"
    build:
      commands:
        - echo "Deploying Summit login"
  artifacts:
    baseDirectory: /amplify-summit
    files:
      - '**/*'
  cache:
    paths: []
```

8. App name: **Summit Login**
9. Environment: **production**
10. Click **"Save and deploy"**

### Step 3: Configure Root Directory

In Amplify Console:
1. Go to **App settings** → **Build settings**
2. Edit **Amplify.yml**
3. Update `baseDirectory`:

```yaml
artifacts:
  baseDirectory: /amplify-summit
  files:
    - '**/*'
```

Or set the app root to `amplify-summit` in the build settings.

---

## 🚀 Option B: Separate Repository (Recommended)

Create a dedicated repository just for the Summit frontend:

### Step 1: Create New Repository

**On GitHub:**
1. Go to GitHub.com
2. Click **"New repository"**
3. Name: **summit-frontend**
4. Description: "Summit login and dashboard"
5. Private or Public (your choice)
6. **Don't** initialize with README
7. Click **"Create repository"**

### Step 2: Push Amplify Files to New Repo

```bash
# Navigate to amplify-summit folder
cd amplify-summit

# Initialize git
git init

# Add files
git add .

# Commit
git commit -m "Initial commit: Summit frontend"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR-USERNAME/summit-frontend.git

# Push
git branch -M main
git push -u origin main
```

### Step 3: Connect Amplify to New Repo

1. Go to **AWS Amplify Console**
2. Click **"New app"** → **"Host web app"**
3. Choose **GitHub** (or your Git provider)
4. Authorize Amplify
5. Select repository: **summit-frontend**
6. Select branch: **main**
7. Amplify will auto-detect `amplify.yml`
8. App name: **Summit Login**
9. Click **"Save and deploy"**

---

## 🚀 Option C: AWS CodeCommit (No GitHub needed)

Use AWS's own Git service:

### Step 1: Create CodeCommit Repository

```bash
# Create repository
aws codecommit create-repository \
  --repository-name summit-frontend \
  --repository-description "Summit login and dashboard"

# Get clone URL
aws codecommit get-repository \
  --repository-name summit-frontend \
  --query 'repositoryMetadata.cloneUrlHttp' \
  --output text
```

### Step 2: Configure Git Credentials

**In AWS Console:**
1. Go to IAM → Users → Your user
2. Security credentials
3. HTTPS Git credentials for AWS CodeCommit
4. Generate credentials
5. Save username and password

### Step 3: Push to CodeCommit

```bash
cd amplify-summit

git init
git add .
git commit -m "Initial commit"

# Add CodeCommit remote
git remote add origin https://git-codecommit.REGION.amazonaws.com/v1/repos/summit-frontend

# Push
git push -u origin main
```

### Step 4: Connect Amplify

1. Amplify Console → New app → Host web app
2. Choose **AWS CodeCommit**
3. Select **summit-frontend** repository
4. Select **main** branch
5. Save and deploy

---

## 🔧 Configure Custom Domain

After deployment:

1. In Amplify app → **Domain management**
2. Click **"Add domain"**
3. Enter: **`summit.codingeverest.com`**
4. Amplify will configure SSL automatically
5. Add the CNAME record to Route 53 (Amplify provides the value)

---

## 🔄 Update Workflow (After Setup)

When you need to update the frontend:

```bash
# Make changes to files in amplify-summit/
# For example, edit index.html

# Commit changes
git add .
git commit -m "Update login page styling"

# Push to Git
git push origin main

# Amplify automatically:
# ✅ Detects the push
# ✅ Builds the app
# ✅ Deploys to production
# ⏱️ Takes 2-3 minutes
```

That's it! No manual uploads needed!

---

## 📁 Repository Structure

### If Using Main Repository:
```
CodingE-Chat/
├── server/
├── desktop/
├── amplify-summit/          ← Amplify deploys from here
│   ├── index.html
│   ├── app/
│   ├── amplify.yml
│   └── .gitignore
└── ...
```

**Amplify build settings:** Set base directory to `amplify-summit`

### If Using Separate Repository:
```
summit-frontend/
├── index.html
├── app/
│   └── index.html
├── amplify.yml
├── .gitignore
└── README.md
```

**Amplify build settings:** Use root directory

---

## ⚙️ Build Configuration

The `amplify.yml` in `amplify-summit/` is already configured:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo "Summit Login - No build needed (static HTML)"
    build:
      commands:
        - echo "Deploying static files"
  artifacts:
    baseDirectory: /
    files:
      - '**/*'
  cache:
    paths: []
```

This tells Amplify:
- No build step needed (pure HTML/CSS/JS)
- Just copy all files to production
- No caching needed

---

## 🌿 Branching Strategy (Optional)

For professional workflow:

```bash
# Development branch
git checkout -b development
git push -u origin development

# Feature branches
git checkout -b feature/new-login-design
# Make changes
git push -u origin feature/new-login-design
# Merge to development
# Test on dev environment
# Merge to main for production
```

**In Amplify:**
- Set up branch deployments
- `main` → Production (summit.codingeverest.com)
- `development` → Dev (dev.summit.codingeverest.com)

---

## ✅ Advantages of Git-Based Deployment

| Feature | Git-Based | Manual Upload |
|---------|-----------|---------------|
| Auto-deploy | ✅ Yes | ❌ No |
| Version control | ✅ Yes | ❌ No |
| Rollback | ✅ Easy | ❌ Manual |
| CI/CD | ✅ Built-in | ❌ No |
| Team collaboration | ✅ Easy | ❌ Difficult |
| Update speed | ✅ Just push | ❌ Re-upload |

---

## 🆘 Troubleshooting

### Build Failed

Check Amplify build logs:
1. Amplify Console → Your app
2. Click on the failed build
3. View logs
4. Common issues:
   - Wrong base directory
   - Missing amplify.yml
   - File permissions

### Update Not Deploying

```bash
# Check if push succeeded
git log --oneline -5

# Check Amplify
# Go to Amplify Console → Recent builds
# Should show new commit
```

### Want to Manually Trigger Deploy

In Amplify Console:
- Go to your app
- Click **"Redeploy this version"**

---

## 📝 Quick Commands

```bash
# Update frontend
cd amplify-summit
# Edit files
git add .
git commit -m "Your update message"
git push origin main

# Check status
git status
git log --oneline -5

# Rollback if needed
git revert HEAD
git push origin main
```

---

## 🎯 Recommended: Separate Repository

For Summit, I recommend **Option B** (separate repository):

**Why:**
1. Cleaner separation of concerns
2. Frontend team can work independently
3. Faster Amplify builds (smaller repo)
4. Easier to manage permissions
5. Can be public while backend stays private

**Steps:**
1. Create `summit-frontend` repository on GitHub
2. Push `amplify-summit/` contents to it
3. Connect Amplify to the new repo
4. Done! Updates are just `git push` away

---

## 🚀 Which Method Should You Use?

**Use Git-based if:**
- ✅ You want automatic deployments
- ✅ You want version control
- ✅ You plan to update frequently
- ✅ You want professional workflow

**Use Manual upload if:**
- Only for quick testing
- One-time deployment
- No Git access

**Recommendation:** Use Git-based (Option B - separate repo)

---

**Ready to set up Git deployment?** Let me know which option you prefer and I can guide you through it!

