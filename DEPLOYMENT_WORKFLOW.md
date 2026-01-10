# Summit Deployment Workflow

## Deployment Order (CRITICAL)

**Always follow this order:**
1. **GitHub** - Push all changes
2. **Amplify** - Auto-deploys from GitHub (monitor console)
3. **EC2 via SSM** - Deploy backend after GitHub is updated

## Why This Order?

- **GitHub First**: Ensures source of truth is updated
- **Amplify Second**: Auto-rebuilds from GitHub commits (ensures frontend has latest files)
- **EC2 Last**: Backend pulls from GitHub, so it needs to be updated first

This prevents missing files in Amplify and ensures consistency.

## Usage

Run the deployment workflow:

```powershell
.\deploy-workflow.ps1
```

This script will:
1. Check for uncommitted changes and commit if needed
2. Push to GitHub
3. Wait for Amplify to auto-deploy (monitor console)
4. Deploy backend via SSM

## Manual Deployment

If you need to deploy manually:

### Step 1: GitHub
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

### Step 2: Amplify
- Check Amplify console for build status
- Wait for build to complete (usually 5-10 minutes)

### Step 3: EC2 via SSM
```bash
aws ssm send-command \
  --instance-ids i-06bc5b2218c041802 \
  --document-name "AWS-RunShellScript" \
  --parameters file://deploy-summit-backend.json \
  --region eu-west-1
```

## WebSocket Configuration

If WebSocket connections fail (error 1006), check nginx configuration:

1. Ensure `/ws` location is configured with WebSocket upgrade headers
2. See `nginx-websocket-fix.conf` for correct configuration
3. The `/ws` location must come BEFORE `/api` location in nginx config

### Deploying Nginx Configuration

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/summit-api /etc/nginx/sites-available/summit-api.backup

# Update config with WebSocket support (use nginx-websocket-fix.conf as reference)

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

