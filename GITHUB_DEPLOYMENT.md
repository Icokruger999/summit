# GitHub Deployment Guide

## Why Keep GitHub Updated?

**CRITICAL:** GitHub is our **single source of truth** for all deployments:

1. **Amplify Auto-Deploy** - Amplify watches GitHub and automatically rebuilds when you push
2. **Backend Deployment** - EC2 pulls from GitHub via `git pull`
3. **No Lost Files** - If server goes down, we can redeploy from GitHub
4. **Version Control** - We can see what changed and when

## Deployment Workflow

### Always Follow This Order:

1. **Make Changes Locally**
   ```bash
   # Edit files
   ```

2. **Commit to GitHub**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

3. **Amplify Auto-Deploys** (5-10 minutes)
   - Amplify watches GitHub main branch
   - Automatically triggers build when you push
   - Uses `amplify.yml` to build with correct environment variables

4. **Deploy Backend via SSM** (if needed)
   ```bash
   aws ssm send-command \
     --instance-ids i-06bc5b2218c041802 \
     --document-name "AWS-RunShellScript" \
     --parameters file://deploy-summit-backend.json \
     --region eu-west-1
   ```

## Why is there a `vite.config.ts` file?

**Short Answer:** Vite is the build tool that compiles our React application for production.

### What Vite Does:

1. **Development Server** - Runs the React app locally during development
   - Fast Hot Module Replacement (HMR)
   - Serves files on port 5173

2. **Production Build** - Compiles React/TypeScript to static HTML/JS/CSS
   - Optimizes code (minification, tree-shaking)
   - Bundles dependencies
   - Creates `dist/` folder with production-ready files

3. **Configuration** - Tells Vite how to build:
   - Where output goes (`dist/`)
   - How to handle React
   - Build optimizations
   - Web vs Tauri differences

### Why We Need It:

- **Without Vite:** Raw React/TypeScript can't run in browsers
- **With Vite:** Compiles everything into browser-compatible JavaScript
- **For Amplify:** Uses `npm run build` (which uses Vite) to create production files

### File Structure:

```
desktop/
  ├── vite.config.ts       ← Configuration for Vite build tool
  ├── src/                  ← React source code (TypeScript)
  ├── dist/                 ← Compiled output (after build)
  ├── package.json          ← Defines build script: "build": "vite build"
  └── amplify.yml           ← Tells Amplify to run "npm run build"
```

### Important: Vite Config for Web vs Tauri

```typescript
// vite.config.ts
const isTauri = process.env.TAURI_PLATFORM !== undefined;

server: isTauri
  ? { port: 1420, strictPort: true }    // Desktop app
  : { port: 5173, host: true }          // Web app
```

- **Web builds:** Uses flexible port, no proxy (connects directly to production API)
- **Tauri builds:** Uses fixed port for desktop app

## Best Practices

### ✅ DO:

1. **Commit Often** - Push changes immediately after testing
2. **Use Meaningful Commits** - "Fix: WebSocket localhost issue" not "Update"
3. **Test Before Pushing** - Verify changes work locally first
4. **Check GitHub After Push** - Ensure files are actually on GitHub

### ❌ DON'T:

1. **Don't Skip Commits** - Even small changes should be committed
2. **Don't Push Directly to Server** - Always go through GitHub
3. **Don't Edit Files on Server** - Changes will be lost on next deployment
4. **Don't Forget to Push** - Local commits don't help if server goes down

## Verifying GitHub is Up to Date

```bash
# Check what's not committed
git status

# Check what's not pushed
git log origin/main..HEAD

# Push everything
git push origin main

# Verify on GitHub.com
# Go to: https://github.com/Icokruger999/summit
```

## If Server Loses Connection

1. **Check GitHub** - Ensure all files are pushed
2. **Redeploy from GitHub:**
   ```bash
   # On server or via SSM:
   cd /var/www/summit
   git pull origin main
   cd server
   npm run build
   pm2 restart summit
   ```

## Environment Variables

**Important:** These are set in `amplify.yml`, NOT committed to GitHub:

- `VITE_SERVER_URL=https://summit-api.codingeverest.com`

This ensures web builds connect to production, not localhost.

