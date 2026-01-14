# Complete Setup Guide - Temp Password Signup Feature

## ✅ What's Already Done

1. ✅ Code pushed to Git
2. ✅ Code deployed to EC2
3. ✅ Database migration completed
4. ✅ AWS SES SDK installed
5. ✅ Server rebuilt and restarted

## 🔧 What You Need to Do

### Step 1: Choose IAM Setup Option

**Current Situation:**
- EC2 instance uses: `EC2-SSM-Role`
- This role is shared with Milo (has `MiloS3DeployAccess`)
- **We will NOT modify Milo's permissions**

**Choose one:**

#### Option A: Add SES to Existing Role (Easiest - Recommended)
1. Go to: https://console.aws.amazon.com/iam/home?region=eu-west-1#/roles/EC2-SSM-Role
2. Click "Add permissions" → "Create inline policy"
3. Click "JSON" tab
4. Paste this:
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
8. ✅ Done! This only adds email permissions, won't affect Milo.

#### Option B: Create New Role (Better Separation)
1. IAM Console → Roles → Create role
2. Select "EC2" service
3. Attach: `AmazonSSMManagedInstanceCore`
4. Create custom SES policy (same JSON as Option A)
5. Name: `Summit-EC2-Role`
6. EC2 Console → Instance → Modify IAM role → Select `Summit-EC2-Role`

#### Option C: Use Access Keys
1. IAM Console → Users → Create user "SummitSESUser"
2. Attach SES policy (same JSON)
3. Create access key
4. Save keys securely
5. I'll add them to `.env` file

**Tell me which option you prefer, and I'll proceed!**

### Step 2: Verify Email in AWS SES

1. Go to: https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/verified-identities
2. Click "Create identity"
3. Select "Email address"
4. Enter: `noreply@codingeverest.com` (or your preferred sender email)
5. Click "Create identity"
6. Check your email inbox
7. Click the verification link

**What email address do you want to use?** (I'll configure it in `.env`)

### Step 3: I'll Configure Everything Else

Once you:
- ✅ Choose IAM option and set it up
- ✅ Verify email in SES
- ✅ Tell me the email address

I will:
- ✅ Update `.env` file with SES configuration
- ✅ Restart the server
- ✅ Test the configuration
- ✅ Save all details in documentation

## 📋 Current Configuration

**EC2 Instance:** i-0fba58db502cc8d39
**Server Path:** /var/www/summit/server
**IAM Role:** EC2-SSM-Role (shared with Milo)
**Region:** eu-west-1

## 🔒 Security Notes

- ✅ No Milo permissions will be modified
- ✅ SES permissions are isolated (only email sending)
- ✅ All changes are documented
- ✅ IAM role changes are optional (can use access keys instead)

## 📝 Important Files Created

- `AWS_SES_SETUP_COMPLETE.md` - Complete SES configuration guide
- `AWS_SES_SETUP_OPTIONS.md` - IAM setup options (with Milo considerations)
- `COMPLETE_SETUP_GUIDE.md` - This file (step-by-step guide)

---

**Next:** Please choose your IAM option and verify an email address, then I'll complete the configuration!
