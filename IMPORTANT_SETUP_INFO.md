# ⚠️ IMPORTANT SETUP INFORMATION - Temp Password Signup Feature

## 🎯 Current Status

### ✅ Completed (Automated)
- Code pushed to Git
- Code deployed to EC2
- Database migration completed
- AWS SES SDK installed (`@aws-sdk/client-ses@^3.490.0`)
- Server rebuilt and restarted
- All code changes implemented

### ⏳ Requires Your Action

1. **IAM Role Setup** - Add SES permissions to existing `EC2-SSM-Role` (see Step 1 below)
2. **Email Verification** - Verify sender email in AWS SES (see Step 2 below)
3. **Provide Email Address** - Tell me which email you verified

Once you complete these, I'll automatically configure the `.env` file and restart the server.

---

## 🔒 MILO PROTECTION - IMPORTANT

**Current IAM Role:** `EC2-SSM-Role`
- This role is **shared with Milo**
- Has `MiloS3DeployAccess` policy
- **WE WILL NOT MODIFY OR REMOVE ANY MILO PERMISSIONS**

**What We're Adding:**
- Only `ses:SendEmail` and `ses:SendRawEmail` permissions
- These are **email-only** permissions
- **No access to S3, no access to any Milo resources**
- Completely isolated functionality

**SES permissions are separate from S3 permissions** - Adding SES won't affect Milo's S3 access.

---

## 📋 What You Need to Do

### Step 1: Add SES Permissions to Existing Role (2 minutes)

**We're using the existing `EC2-SSM-Role` - only adding email permissions.**

**Safest for Milo** - Only adds email permissions, doesn't change anything else.

1. Go to: https://console.aws.amazon.com/iam/home?region=eu-west-1#/roles/EC2-SSM-Role
2. Click "Add permissions" → "Create inline policy"
3. Click "JSON" tab
4. Paste this (replaces any existing text):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ses:SendEmail",
           "ses:SendRawEmail"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
5. Click "Next"
6. Policy name: `SummitSESEmailPolicy`
7. Click "Create policy"
8. ✅ Done!

**Why this is safe:** SES and S3 are completely separate services. Adding SES permissions doesn't affect S3 access.

#### Option B: Create New IAM Role (Complete Separation - 5 minutes)

If you want Summit and Milo completely separate:

1. **Create Role:**
   - IAM Console → Roles → Create role
   - Select "EC2" service → Next
   - Attach: `AmazonSSMManagedInstanceCore`
   - Create custom SES policy (same JSON as Option A)
   - Name: `Summit-EC2-Role`
   - Create role

2. **Attach to EC2:**
   - EC2 Console → Instances → `i-0fba58db502cc8d39`
   - Actions → Security → Modify IAM role
   - Select `Summit-EC2-Role`
   - Update IAM role

#### Option C: Use Access Keys (No IAM Changes)

1. IAM Console → Users → Create user "SummitSESUser"
2. Attach SES policy (same JSON as Option A)
3. Create access key → Save keys securely
4. Provide keys to me and I'll add to `.env`

**Recommendation:** Option A is simplest and safest.

---

### Step 2: Verify Email in AWS SES

1. Go to: https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/verified-identities
2. Click "Create identity"
3. Select "Email address"
4. Enter email: `noreply@codingeverest.com` (or your preferred)
5. Click "Create identity"
6. Check email inbox
7. Click verification link in email

**Tell me which email address you verified** and I'll configure it.

---

### Step 3: I'll Complete the Rest

Once you tell me:
- ✅ Which IAM option you chose (A, B, or C)
- ✅ Email address you verified

I will:
- ✅ Update `.env` file with SES configuration
- ✅ Restart the server
- ✅ Verify everything works
- ✅ Test email sending

---

## 📁 Important Files Reference

### Documentation Files
- `IMPORTANT_SETUP_INFO.md` - This file (master reference)
- `AWS_SES_SETUP_COMPLETE.md` - Complete SES configuration details
- `AWS_SES_SETUP_OPTIONS.md` - Detailed IAM options explanation
- `COMPLETE_SETUP_GUIDE.md` - Step-by-step guide
- `SETUP_INSTRUCTIONS.md` - Quick start guide
- `DEPLOYMENT_SUMMARY.md` - What was deployed

### Scripts (Ready to Use)
- `update-ses-env-ssm.ps1` - Updates `.env` with SES config
- `deploy-temp-password-feature-ssm.ps1` - Already run (deployment complete)
- `verify-deployment-ssm.ps1` - Verifies deployment status

---

## 🔧 Technical Details

### EC2 Instance
- **Instance ID:** i-0fba58db502cc8d39
- **Hostname:** ec2-52-48-245-252.eu-west-1.compute.amazonaws.com
- **Region:** eu-west-1
- **Server Path:** /var/www/summit/server
- **IAM Role:** EC2-SSM-Role (shared with Milo)

### Database
- **Database:** summit
- **User:** summit_user
- **Connection:** Through PgBouncer (port 6432)
- **Migration:** `database/migration_temp_password_signup.sql` (already run)

### Email Service
- **Service:** AWS SES
- **SDK:** @aws-sdk/client-ses@^3.490.0
- **Region:** eu-west-1
- **Free Tier:** 62,000 emails/month from EC2

### Environment Variables Needed
```bash
AWS_REGION=eu-west-1
AWS_SES_FROM_EMAIL=your-verified-email@domain.com
# Optional (if not using IAM role):
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

---

## 🧪 Testing After Setup

1. Go to: https://summit.codingeverest.com/login
2. Click "Sign up"
3. Fill in:
   - Name: "Test User" (required)
   - Email: Use a verified email (in sandbox mode)
   - Job Title: "N/A" (optional)
   - Phone: "N/A" (optional)
   - Company: "N/A" (optional)
4. Submit
5. Check email for temp password
6. Login with temp password
7. Change password (mandatory)
8. Complete permissions
9. See dashboard

---

## 🔄 Account Cleanup

Accounts not changing password within 24 hours are auto-deleted.

**Manual cleanup:**
```bash
curl -X POST https://summit.api.codingeverest.com/api/auth/cleanup-expired-accounts
```

**Automated cleanup (cron):**
```bash
0 * * * * curl -X POST https://summit.api.codingeverest.com/api/auth/cleanup-expired-accounts
```

---

## 📞 Quick Reference

### URLs
- **Frontend:** https://summit.codingeverest.com
- **API:** https://summit.api.codingeverest.com
- **AWS SES Console:** https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1
- **IAM Console:** https://console.aws.amazon.com/iam/home?region=eu-west-1

### Commands
```bash
# Check server status
pm2 status

# View logs
pm2 logs summit-backend

# Restart server
pm2 restart summit-backend

# Check database
sudo -u postgres psql -d summit -c "SELECT COUNT(*) FROM users;"
```

---

## ✅ Checklist

- [x] Code deployed to EC2
- [x] Database migration completed
- [x] AWS SES SDK installed
- [x] Server rebuilt and restarted
- [ ] IAM role configured (you choose option)
- [ ] Email verified in SES (you do this)
- [ ] `.env` file updated (I'll do this)
- [ ] Server restarted after `.env` update (I'll do this)
- [ ] Test signup flow (we'll do this together)

---

**Last Updated:** 2026-01-14
**Status:** Waiting for IAM setup and email verification
**Milo Protection:** ✅ Confirmed - No Milo permissions will be modified
