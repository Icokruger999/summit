# Fix Amplify Custom Domain - DNS_PROBE Issue

## 🔍 Problem

**Error:** `DNS_PROBE_FINISHED_NXDOMAIN`

**Root Cause:** Custom domain `summit.codingeverest.com` is not configured in Amplify. We created the Route 53 record, but Amplify needs to know about the domain first.

## ✅ Solution: Configure Domain in Amplify

### Step 1: Add Custom Domain in Amplify Console

1. **Go to AWS Amplify Console**
   - https://console.aws.amazon.com/amplify/
   - Region: **eu-west-1**

2. **Select Summit App**
   - App name: **summit**
   - App ID: **d1mhd5fnnjyucj**

3. **Add Custom Domain**
   - Click **"Domain management"** (left sidebar)
   - Click **"Add domain"**
   - Enter: **codingeverest.com**
   - Click **"Configure domain"**

4. **Add Subdomain**
   - Click **"Add subdomain"**
   - Enter: **summit**
   - Click **"Save"**

5. **Amplify will show CNAME records**
   - It will show records like: `_xxxxx.acm-validations.aws`
   - And: `summit.codingeverest.com` → `xxxxx.cloudfront.net`

6. **Copy the CNAME record**
   - Amplify will provide the target (something like `xxxxx.cloudfront.net`)
   - **NOT** `d1mhd5fnnjyucj.amplifyapp.com` (that's the default URL)

### Step 2: Update Route 53 Record

The current Route 53 record points to the wrong URL.

**Current (WRONG):**
```
summit.codingeverest.com → d1mhd5fnnjyucj.amplifyapp.com
```

**Should be (from Amplify):**
```
summit.codingeverest.com → xxxxx.cloudfront.net
```

**Update Route 53:**

1. **Delete the old record** (if needed)
2. **Add new CNAME record** with the CloudFront URL from Amplify

Or use AWS CLI:

```bash
# Get the correct target from Amplify Console first
# Then update Route 53

aws route53 change-resource-record-sets \
  --hosted-zone-id Z024513220PNY1F3PO6K5 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "summit.codingeverest.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{
          "Value": "XXXXX.cloudfront.net"
        }]
      }
    }]
  }'
```

### Step 3: Wait for SSL Certificate

Amplify will automatically request an SSL certificate (takes 10-30 minutes).

Once complete:
- ✅ SSL certificate issued
- ✅ DNS propagates (5-10 minutes)
- ✅ `https://summit.codingeverest.com` will work!

## 🔄 Alternative: Use Default Amplify URL (Temporary)

While setting up the custom domain, you can use:

```
https://d1mhd5fnnjyucj.amplifyapp.com
```

This works immediately (no DNS needed).

## 📝 Summary

1. **Add domain in Amplify Console** → Get CloudFront URL
2. **Update Route 53 CNAME** → Point to CloudFront URL (not Amplify default URL)
3. **Wait for SSL** → 10-30 minutes
4. **Wait for DNS** → 5-10 minutes
5. **Done!** → `https://summit.codingeverest.com` works

---

**The key issue:** Route 53 is pointing to the wrong URL. We need to use the CloudFront URL that Amplify provides when you add the custom domain.

