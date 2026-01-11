# Quick Deployment Guide

## 🚀 Deploy Everything (Backend + Frontend)

### One Command Deployment

```powershell
.\deploy-full-stack.ps1
```

This automatically:
1. ✅ Updates backend via SSM (port 3000, no localhost)
2. ✅ Triggers Amplify frontend deployment
3. ✅ Ensures both are synchronized

### What It Does

**Backend (EC2 via SSM):**
- Creates `.env` with production config (port 3000)
- Installs dependencies
- Builds application
- Starts with PM2 (24/7 mode)
- Verifies server is running

**Frontend (Amplify):**
- Triggers new build
- Uses `VITE_SERVER_URL=https://summit.api.codingeverest.com`
- Deploys to `summit.codingeverest.com`

## 📋 Prerequisites

1. **AWS CLI configured:**
   ```powershell
   aws configure
   ```

2. **SSM access to EC2 instance:**
   - Instance ID: `i-0fba58db502cc8d39` (default)
   - Or specify: `.\deploy-full-stack.ps1 -InstanceId i-xxxxx`

3. **Amplify App ID** (auto-detected, or specify):
   ```powershell
   .\deploy-full-stack.ps1 -AmplifyAppId d1mhd5fnnjyucj
   ```

## ⚙️ Configuration

### Backend Configuration

The script automatically creates `.env` with:
- `PORT=3000` (NEVER 5000 or 50001)
- `NODE_ENV=production`
- `CORS_ORIGIN` (NO localhost)
- All required database credentials

### Frontend Configuration

Amplify uses `amplify.yml` which sets:
- `VITE_SERVER_URL=https://summit.api.codingeverest.com`

## ✅ Verification

After deployment, verify:

1. **Backend Health:**
   ```powershell
   curl https://summit.api.codingeverest.com/health
   ```
   Should return: `{"status":"ok"}`

2. **Frontend:**
   ```powershell
   # Open in browser
   https://summit.codingeverest.com
   ```

3. **Check PM2 Status:**
   ```powershell
   aws ssm send-command --instance-ids i-0fba58db502cc8d39 --document-name "AWS-RunShellScript" --parameters "commands=['pm2 status']"
   ```

## 🔧 Troubleshooting

### Backend Not Starting

1. Check PM2 logs:
   ```powershell
   aws ssm send-command --instance-ids i-0fba58db502cc8d39 --document-name "AWS-RunShellScript" --parameters "commands=['pm2 logs summit-backend --lines 50']"
   ```

2. Verify port 3000 is available (not 5000 or 50001)

3. Check environment variables are set correctly

### Frontend Cannot Connect

1. Verify backend is running on port 3000
2. Check CORS includes `summit.codingeverest.com`
3. Verify `VITE_SERVER_URL` in Amplify build logs
4. Check browser console for errors

### Amplify Build Fails

1. Check build logs in AWS Console
2. Verify `amplify.yml` syntax
3. Ensure `desktop/` directory exists
4. Check environment variables

## 📝 Manual Deployment

If you need to deploy separately:

### Backend Only:
```powershell
.\deploy-summit-ssm-complete.ps1
```

### Frontend Only:
```powershell
aws amplify start-job --app-id d1mhd5fnnjyucj --branch-name main --job-type RELEASE
```

**⚠️ WARNING:** Always deploy both together to keep them in sync!

## 🎯 Key Rules

1. ✅ Backend runs on port 3000 (NEVER 5000 or 50001)
2. ✅ No localhost in production configuration
3. ✅ Amplify MUST be updated when backend is deployed
4. ✅ Server runs 24/7 with PM2 auto-restart
5. ✅ Use unified script to ensure sync

## 📚 More Information

- `AMPLIFY_DEPLOYMENT_RULES.md` - Complete Amplify deployment rules
- `server/PRODUCTION_DEPLOYMENT.md` - Backend deployment details
- `server/DEPLOYMENT_RULES.md` - All deployment rules

