# Amplify Deployment Rules

## ⚠️ CRITICAL RULE: Keep Amplify Updated

**Amplify frontend MUST be deployed whenever the backend is updated.**

This ensures:
- ✅ Frontend always connects to the correct backend API
- ✅ Environment variables are synchronized
- ✅ No connection errors for users
- ✅ Consistent deployment state

## Deployment Workflow

### Standard Deployment (Recommended)

Use the unified deployment script:

```powershell
.\deploy-full-stack.ps1
```

This script:
1. ✅ Updates backend via SSM (port 3000)
2. ✅ Triggers Amplify build automatically
3. ✅ Ensures both are in sync

### Manual Deployment

If deploying manually, **ALWAYS** do both:

1. **Backend (SSM):**
   ```powershell
   .\deploy-summit-ssm-complete.ps1
   ```

2. **Frontend (Amplify):**
   ```powershell
   # Option 1: Trigger via AWS CLI
   aws amplify start-job --app-id YOUR_APP_ID --branch-name main --job-type RELEASE
   
   # Option 2: Push to GitHub (if connected)
   git push origin main
   
   # Option 3: Manual trigger in AWS Console
   # Go to Amplify Console → Your App → Deployments → Redeploy
   ```

## When to Deploy

Deploy both backend and frontend when:

- ✅ Backend code changes
- ✅ Environment variables change
- ✅ API endpoints change
- ✅ CORS configuration changes
- ✅ Port configuration changes
- ✅ Database configuration changes

## Configuration Synchronization

### Backend Configuration (EC2)

Located in: `/var/www/summit/server/.env`

Key settings:
```env
PORT=3000                    # NEVER 5000 or 50001
CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com
NODE_ENV=production
```

### Frontend Configuration (Amplify)

Located in: `amplify.yml`

Key settings:
```yaml
export VITE_SERVER_URL=https://summit.api.codingeverest.com
```

**IMPORTANT:** This must match the backend API URL.

## Verification Checklist

After deployment, verify:

- [ ] Backend health check: `https://summit.api.codingeverest.com/health`
- [ ] Frontend loads: `https://summit.codingeverest.com`
- [ ] Frontend can connect to backend (check browser console)
- [ ] No CORS errors
- [ ] No 404 errors for API calls
- [ ] Login/authentication works
- [ ] PM2 shows backend running: `pm2 status`

## Troubleshooting

### Frontend Cannot Connect to Backend

1. **Check backend is running:**
   ```bash
   # Via SSM
   aws ssm send-command --instance-ids i-xxx --document-name "AWS-RunShellScript" --parameters "commands=['pm2 status']"
   ```

2. **Check backend port:**
   ```bash
   # Should be 3000, NOT 5000 or 50001
   curl https://summit.api.codingeverest.com/health
   ```

3. **Check CORS configuration:**
   ```bash
   # Backend .env should include summit.codingeverest.com
   # NO localhost in production
   ```

4. **Check Amplify environment variable:**
   ```yaml
   # amplify.yml should have:
   export VITE_SERVER_URL=https://summit.api.codingeverest.com
   ```

### Amplify Build Fails

1. Check build logs in AWS Console
2. Verify `amplify.yml` syntax
3. Check environment variables are set
4. Ensure `desktop/` directory exists with `package.json`

### Backend Not Starting

1. Check PM2 logs:
   ```bash
   aws ssm send-command --instance-ids i-xxx --document-name "AWS-RunShellScript" --parameters "commands=['pm2 logs summit-backend --lines 50']"
   ```

2. Verify environment variables:
   ```bash
   # Check .env file exists and has all required variables
   ```

3. Check port conflicts:
   ```bash
   # Should be on port 3000, verify nothing else is using it
   ```

## Automated Deployment

For CI/CD integration:

```yaml
# Example GitHub Actions workflow
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Backend
        run: |
          .\deploy-summit-ssm-complete.ps1
      - name: Deploy Frontend
        run: |
          aws amplify start-job --app-id ${{ secrets.AMPLIFY_APP_ID }} --branch-name main --job-type RELEASE
```

## Best Practices

1. ✅ **Always deploy both** backend and frontend together
2. ✅ **Test after deployment** - verify both are working
3. ✅ **Monitor logs** - check for errors
4. ✅ **Use unified script** - `deploy-full-stack.ps1` ensures sync
5. ✅ **Document changes** - note what changed in each deployment
6. ✅ **Verify environment variables** - ensure they match between backend and frontend

## Emergency Rollback

If deployment fails:

1. **Backend rollback:**
   ```bash
   # Restore previous PM2 process
   pm2 restart summit-backend
   # Or restore from backup .env
   ```

2. **Frontend rollback:**
   ```bash
   # In Amplify Console, redeploy previous successful build
   # Or revert GitHub commit and push
   ```

## Summary

**RULE:** Every backend deployment MUST be followed by an Amplify deployment.

Use `deploy-full-stack.ps1` to ensure both are always in sync.

