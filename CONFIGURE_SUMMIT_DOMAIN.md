# Configure Summit Custom Domain (Correct Approach)

## ✅ Correct Setup

**Two separate apps:**
- `www.codingeverest.com` → Landing page (milo app) - **has login button**
- `summit.codingeverest.com` → Summit app (separate Amplify app)

## 🎯 Solution: Add Domain to Summit App

Since `codingeverest.com` is already verified in AWS (via milo app), you can add the subdomain directly to the Summit app.

### Step 1: Add Custom Domain in Summit Amplify App

1. **Go to AWS Amplify Console (Summit app)**
   - https://console.aws.amazon.com/amplify/home?region=eu-west-1#/d1mhd5fnnjyucj
   - App: **summit** (ID: `d1mhd5fnnjyucj`)

2. **Click "Domain management"** (left sidebar)

3. **Click "Add domain"**

4. **Try Option A first:**
   - Enter: `summit.codingeverest.com` (full subdomain)
   - Click "Configure domain"
   - Since the root domain is already verified in AWS, this should work

5. **If Option A doesn't work, try Option B:**
   - Enter: `codingeverest.com` (root domain)
   - Click "Configure domain"
   - Then click "Add subdomain"
   - Prefix: `summit`
   - Branch: Select your branch (probably `main` or `master`)
   - Click "Save"

6. **Amplify will verify the domain**
   - It checks Route 53 for the DNS record
   - Since Route 53 already has: `summit.codingeverest.com → d1mhd5fnnjyucj.amplifyapp.com`
   - Verification should complete quickly

7. **Amplify will show DNS records**
   - It might ask you to update Route 53 with a CloudFront URL
   - **Update Route 53** if needed with the CloudFront URL from Amplify

8. **Wait for SSL certificate**
   - Amplify automatically requests SSL certificate
   - Takes 10-30 minutes

9. **Wait for DNS propagation**
   - 5-10 minutes after SSL is ready

### Step 2: Update Route 53 (if needed)

If Amplify provides a CloudFront URL (different from the default Amplify URL), update Route 53:

1. **Go to Route 53 Console**
   - https://console.aws.amazon.com/route53/home?region=eu-west-1#resource-record-sets:Z024513220PNY1F3PO6K5

2. **Find `summit.codingeverest.com`**

3. **Update the value** to the CloudFront URL from Amplify (if different)

### Step 3: Test

After SSL certificate is ready and DNS propagates:

```
https://summit.codingeverest.com
```

Should work! ✅

---

## 📝 Current Status

- ✅ Route 53 record exists: `summit.codingeverest.com → d1mhd5fnnjyucj.amplifyapp.com`
- ⏳ Need to: Configure domain in Summit Amplify app
- ⏳ Then: Wait for SSL certificate (10-30 minutes)
- ⏳ Then: Wait for DNS propagation (5-10 minutes)

---

## 🚀 Alternative: Use Default URL (Works Immediately)

If you want it working immediately while setting up the custom domain:

**Use this in your landing page:**
```html
<a href="https://d1mhd5fnnjyucj.amplifyapp.com" class="btn btn-primary">
    Login to Summit
</a>
```

Then update to `https://summit.codingeverest.com` once the custom domain is configured.

---

## Why This Works

- `codingeverest.com` is already verified/registered in AWS (via milo app)
- Route 53 can handle subdomains independently
- Amplify allows adding subdomains if the root domain is verified
- Summit app can have its own custom domain even if root is used by another app

