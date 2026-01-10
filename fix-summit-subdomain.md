# Fix Summit Subdomain - codingeverest.com Already Used

## 🔍 Found

**`codingeverest.com` is already used by the milo app** (App ID: `ddp21ao3xntn4`)

**Subdomains in milo app:**
- `codingeverest.com` (root)
- `www.codingeverest.com`

**Route 53 record:**
- ✅ `summit.codingeverest.com` → `d1mhd5fnnjyucj.amplifyapp.com` (correct)

## ✅ Solution: Add Subdomain to Milo App

Since `codingeverest.com` is already managed by the milo app, add the `summit` subdomain there.

### Step 1: Add Subdomain in Milo App

1. **Go to AWS Amplify Console**
   - https://console.aws.amazon.com/amplify/home?region=eu-west-1#/ddp21ao3xntn4

2. **Select milo app** (the one using `codingeverest.com`)

3. **Click "Domain management"** (left sidebar)

4. **Find `codingeverest.com`** in the list

5. **Click "Add subdomain"**

6. **Add subdomain:**
   - Prefix: `summit`
   - Branch: Choose your branch (probably `main` or `master`)
   - Click "Save"

7. **Wait 1-2 minutes** for Amplify to configure

8. **Amplify will show a CNAME record** for `summit.codingeverest.com`
   - It will point to a CloudFront URL (e.g., `d1234abcd5678.cloudfront.net`)

### Step 2: Update Route 53

Once Amplify shows the CloudFront URL, update Route 53:

1. **Go to Route 53 Console**
   - https://console.aws.amazon.com/route53/home?region=eu-west-1#resource-record-sets:Z024513220PNY1F3PO6K5

2. **Find `summit.codingeverest.com`**

3. **Edit the record:**
   - Current: `d1mhd5fnnjyucj.amplifyapp.com`
   - Change to: `xxxxx.cloudfront.net` (from Amplify)

4. **Save**

### Step 3: Configure Summit App (Important!)

Since the subdomain is in milo app but points to Summit app, you might need to:

**Option A: Connect Summit App via Redirect**
- In milo app, configure `summit` subdomain to redirect to Summit's Amplify URL
- Or use CloudFront to proxy requests

**Option B: Use Default URL (Simpler)**

Just use the default Amplify URL directly:

```
https://d1mhd5fnnjyucj.amplifyapp.com
```

And update your landing page to use this URL. No custom domain needed!

---

## 🚀 Alternative: Use Default URL (Easiest)

Since Route 53 is already pointing correctly, you can just use:

```
https://d1mhd5fnnjyucj.amplifyapp.com
```

**This works immediately!** No custom domain configuration needed.

**Update your landing page:**
```html
<a href="https://d1mhd5fnnjyucj.amplifyapp.com" class="btn btn-primary">
    Login to Summit
</a>
```

Then later, if you want the custom domain, add the subdomain to milo app.

---

## 📝 Summary

1. **Found:** `codingeverest.com` is used by milo app
2. **Route 53:** Already correctly configured
3. **Solution:** Add `summit` subdomain to milo app, OR use default Amplify URL

**Recommendation:** Use the default URL for now, it works immediately!

