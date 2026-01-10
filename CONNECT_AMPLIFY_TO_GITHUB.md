# Connect AWS Amplify to Your GitHub Repository

**Repository:** https://github.com/Icokruger999/summit

✅ Files successfully pushed to GitHub!

---

## 🚀 Next Steps: Connect Amplify

### Step 1: Open AWS Amplify Console

1. Go to: https://console.aws.amazon.com/amplify/
2. Click **"New app"**
3. Choose **"Host web app"**

### Step 2: Connect to GitHub

1. Select **GitHub** as the source
2. Click **"Continue"**
3. You'll be redirected to GitHub to authorize AWS Amplify
4. Click **"Authorize aws-amplify-console"**

### Step 3: Select Repository

1. Repository: **Icokruger999/summit**
2. Branch: **main**
3. Click **"Next"**

### Step 4: Configure Build Settings

Amplify should auto-detect the `amplify.yml` file. Verify it shows:

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

**App settings:**
- App name: **Summit Login**
- Environment name: **production**
- Build settings: Use the detected amplify.yml

Click **"Next"**

### Step 5: Review and Deploy

1. Review all settings
2. Click **"Save and deploy"**
3. Wait 2-3 minutes for deployment ⏳

Amplify will:
- ✅ Clone your repository
- ✅ Build (just copy static files)
- ✅ Deploy to CloudFront CDN
- ✅ Provision SSL certificate

### Step 6: Get Your Amplify URL

After deployment completes, you'll see:
- ✅ Build successful
- URL: `https://main.d1234567890abc.amplifyapp.com`

Test this URL to make sure it works!

---

## 🌐 Add Custom Domain

### Step 1: Add Domain in Amplify

1. In your Amplify app, go to **"Domain management"**
2. Click **"Add domain"**
3. Enter: **summit.codingeverest.com**
4. Click **"Configure domain"**

### Step 2: Amplify Provides DNS Configuration

Amplify will show you the DNS records to create. Example:

```
Type: CNAME
Name: summit
Value: d1234567890abc.cloudfront.net
```

### Step 3: Update Route 53

**Option A: AWS Console**

1. Go to Route 53 → Hosted zones
2. Select **codingeverest.com**
3. Click **"Create record"**
4. Fill in:
   - Record name: **summit**
   - Record type: **CNAME**
   - Value: **[Value from Amplify]**
   - TTL: **300**
5. Click **"Create records"**

**Option B: AWS CLI**

```bash
# Get your hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='codingeverest.com.'].Id" --output text | cut -d'/' -f3)

# Replace with the value Amplify provided
AMPLIFY_URL="d1234567890abc.cloudfront.net"

# Create CNAME record
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "summit.codingeverest.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "'$AMPLIFY_URL'"}]
    }
  }]
}'
```

### Step 4: Wait for SSL Certificate

- Amplify automatically provisions SSL certificate
- Wait 10-15 minutes
- Status will change from "Pending" to "Available"

### Step 5: Verify

```bash
# Check DNS
nslookup summit.codingeverest.com

# Visit in browser
https://summit.codingeverest.com
```

---

## 🔄 Enable Auto-Deployment

This is automatically enabled! Now when you update the frontend:

```bash
# Make changes to your files
cd C:\CodingE-Chat\amplify-summit

# Edit index.html or any file
# Then commit and push:

git add .
git commit -m "Update login page"
git push origin main

# Amplify automatically:
# ✅ Detects the push
# ✅ Rebuilds
# ✅ Deploys to production
# ⏱️ Takes 2-3 minutes
```

No manual uploads needed!

---

## ⚙️ Configure Amplify Settings (Optional)

### Enable Pull Request Previews

1. In Amplify app → **App settings** → **General**
2. Enable **"Pull request previews"**
3. Now every PR gets its own test URL!

### Set Environment Variables (if needed)

1. Go to **App settings** → **Environment variables**
2. Add any variables (we don't need any for static HTML)

### Configure Build Notifications

1. Go to **App settings** → **Notifications**
2. Add email or SNS topic for build status

---

## 📊 Monitor Deployments

### View Build Logs

1. Go to your Amplify app
2. Click on any deployment
3. View detailed logs
4. See what happened during build

### Deployment History

- See all past deployments
- Rollback to previous version if needed
- Click **"Redeploy this version"** on any past deployment

---

## 🆘 Troubleshooting

### Build Failed

1. Check build logs in Amplify Console
2. Common issues:
   - Wrong branch selected
   - Missing amplify.yml
   - Incorrect baseDirectory

### Domain Not Working

```bash
# Check DNS propagation
nslookup summit.codingeverest.com

# Wait 10-15 minutes for:
# - DNS propagation
# - SSL certificate provisioning
```

### Updates Not Deploying

```bash
# Verify push succeeded
git log --oneline -3

# Check Amplify Console → Recent builds
# Should show your latest commit
```

### Manual Trigger Deploy

If auto-deploy isn't working:
1. Amplify Console → Your app
2. Click **"Redeploy this version"**

---

## ✅ Verification Checklist

After setup:

- [ ] Amplify app created and connected to GitHub
- [ ] First deployment successful
- [ ] Can access default Amplify URL
- [ ] Custom domain added (summit.codingeverest.com)
- [ ] CNAME record created in Route 53
- [ ] SSL certificate provisioned (10-15 min)
- [ ] Can access https://summit.codingeverest.com
- [ ] Auto-deployment working (test with a small change)

---

## 🎉 Success!

Once everything is set up:

1. **Frontend deployed** at https://summit.codingeverest.com
2. **Auto-deploys** when you push to GitHub
3. **SSL enabled** automatically
4. **CDN enabled** for fast loading worldwide

---

## 📝 Quick Reference

**Repository:** https://github.com/Icokruger999/summit

**Update frontend:**
```bash
cd C:\CodingE-Chat\amplify-summit
# Make changes
git add .
git commit -m "Your message"
git push origin main
```

**Monitor:**
- Amplify Console: https://console.aws.amazon.com/amplify/
- Your app → Recent builds

**URLs:**
- Development: [Amplify default URL]
- Production: https://summit.codingeverest.com

---

**Ready?** Go to AWS Amplify Console and connect to your GitHub repo! 🚀

