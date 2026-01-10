# 🔧 Quick Fix: DNS_PROBE Error

## ❌ Problem

**Error:** `DNS_PROBE_FINISHED_NXDOMAIN` when accessing `summit.codingeverest.com`

**Cause:** Custom domain not configured in Amplify. Route 53 points to the wrong URL.

---

## ✅ Solution

### Step 1: Add Custom Domain in Amplify Console

1. **Go to AWS Amplify Console**
   - https://console.aws.amazon.com/amplify/home?region=eu-west-1#/d1mhd5fnnjyucj

2. **Select Summit App**
   - App name: **summit**
   - App ID: **d1mhd5fnnjyucj**

3. **Add Domain**
   - Click **"Domain management"** (left sidebar)
   - Click **"Add domain"**
   - Enter: **codingeverest.com**
   - Click **"Configure domain"**

4. **Add Subdomain**
   - Click **"Add subdomain"**
   - Enter: **summit**
   - Click **"Save"**

5. **Wait for Setup** (1-2 minutes)
   - Amplify will create a CloudFront distribution
   - It will generate DNS records

6. **Copy the CNAME Record**
   - Amplify will show: `summit.codingeverest.com` → `xxxxx.cloudfront.net`
   - **Copy the CloudFront URL** (NOT the Amplify default URL!)

### Step 2: Update Route 53 (I'll Do This)

Once you give me the CloudFront URL from Step 1, I'll update the Route 53 record.

**Or you can do it manually:**

1. **Go to Route 53 Console**
   - https://console.aws.amazon.com/route53/home?region=eu-west-1#resource-record-sets:Z024513220PNY1F3PO6K5

2. **Find the record:** `summit.codingeverest.com`

3. **Edit it:**
   - Change Value from: `d1mhd5fnnjyucj.amplifyapp.com`
   - Change Value to: `xxxxx.cloudfront.net` (from Amplify)

4. **Save**

### Step 3: Wait

- **SSL Certificate:** 10-30 minutes
- **DNS Propagation:** 5-10 minutes

Then `https://summit.codingeverest.com` will work! ✅

---

## 🚀 Temporary Solution (Works Now)

While setting up the custom domain, use this URL:

```
https://d1mhd5fnnjyucj.amplifyapp.com
```

This works immediately (no DNS needed).

**For your landing page (temporary):**
```html
<a href="https://d1mhd5fnnjyucj.amplifyapp.com" class="btn btn-primary">
    Login to Summit
</a>
```

Then update to `https://summit.codingeverest.com` once the custom domain is configured.

---

## 📝 Summary

1. ✅ Add domain in Amplify Console → Get CloudFront URL
2. ✅ Update Route 53 CNAME → Point to CloudFront URL
3. ⏳ Wait for SSL + DNS → 10-30 minutes
4. ✅ Done! → `https://summit.codingeverest.com` works

---

**The key:** Route 53 needs to point to the **CloudFront URL** that Amplify provides, not the default Amplify app URL!

