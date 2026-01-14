# Setup Instructions - Temp Password Signup Feature

## 🎯 Quick Start Guide

Follow these steps in order to complete the setup.

## Step 1: Choose IAM Setup (You Need to Do This)

**Current Setup:**
- EC2 uses IAM role: `EC2-SSM-Role` (shared with Milo)
- Milo has S3 access via this role
- **We will NOT touch Milo's permissions**

### Option A: Add SES to Existing Role (Easiest - 2 minutes)

1. Go to: https://console.aws.amazon.com/iam/home?region=eu-west-1#/roles/EC2-SSM-Role
2. Click "Add permissions" → "Create inline policy"
3. Click "JSON" tab
4. Delete any existing text and paste:
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
6. Name: `SummitSESEmailPolicy`
7. Click "Create policy"
8. ✅ Done! This is safe - only adds email permissions.

**Why this is safe:** SES permissions are completely separate from S3. Milo's S3 access remains untouched.

### Option B: Create New Role (Better Separation - 5 minutes)

If you want complete separation:

1. IAM Console → Roles → Create role
2. Select "EC2" service → Next
3. Attach: `AmazonSSMManagedInstanceCore`
4. Create custom SES policy (same JSON as Option A)
5. Name role: `Summit-EC2-Role`
6. EC2 Console → Instance `i-0fba58db502cc8d39` → Actions → Security → Modify IAM role → Select `Summit-EC2-Role`

### Option C: Use Access Keys (If You Don't Want to Touch IAM)

1. IAM Console → Users → Create user "SummitSESUser"
2. Attach SES policy (same JSON)
3. Create access key → Save keys
4. Tell me the keys and I'll add them to `.env`

**Recommendation:** Option A is simplest and safest.

---

## Step 2: Verify Email in AWS SES (You Need to Do This)

1. Go to: https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/verified-identities
2. Click "Create identity"
3. Select "Email address"
4. Enter email: `noreply@codingeverest.com` (or your preferred sender)
5. Click "Create identity"
6. Check email inbox
7. Click verification link

**What email address do you want to use?** Tell me and I'll configure it.

---

## Step 3: I'll Configure Everything Else

Once you:
- ✅ Choose IAM option (A, B, or C) and complete it
- ✅ Verify email in SES
- ✅ Tell me the email address

I will automatically:
- ✅ Update `.env` file with SES configuration
- ✅ Restart the server
- ✅ Verify everything works
- ✅ Save all details in documentation

---

## Current Status

- ✅ Code deployed
- ✅ Database migrated
- ✅ Server running
- ⏳ Waiting for: IAM setup + Email verification

---

## Need Help?

- See `AWS_SES_SETUP_COMPLETE.md` for detailed information
- See `AWS_SES_SETUP_OPTIONS.md` for IAM options explained
- See `COMPLETE_SETUP_GUIDE.md` for full step-by-step guide

---

**Remember:** Nothing related to Milo will be modified. All changes are isolated to Summit's email functionality.
