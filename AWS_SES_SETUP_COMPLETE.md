# AWS SES Setup - Complete Configuration Guide

## Overview

This document contains all important information about the AWS SES email service configuration for the Summit application's temporary password signup feature.

## Current Status

- ✅ AWS SES SDK installed on EC2 (`@aws-sdk/client-ses@^3.490.0`)
- ✅ Email service module created (`server/src/lib/email.ts`)
- ✅ Email template with temp password and 24-hour warning
- ⚠️ **AWS SES email verification required**
- ⚠️ **Environment variables need to be configured**

## AWS SES Configuration

### Required Environment Variables

Location: `/var/www/summit/server/.env`

```bash
# AWS SES Configuration
AWS_REGION=eu-west-1
AWS_SES_FROM_EMAIL=noreply@codingeverest.com

# Optional - Only needed if NOT using IAM role
# AWS_ACCESS_KEY_ID=your-access-key-id
# AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### Email Verification Steps

1. **Go to AWS SES Console**
   - URL: https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1
   - Or: AWS Console → Services → Simple Email Service → eu-west-1 region

2. **Verify Email Address**
   - Click "Verified identities" in left menu
   - Click "Create identity"
   - Select "Email address"
   - Enter email: `noreply@codingeverest.com` (or your preferred sender email)
   - Click "Create identity"
   - Check the email inbox for verification link
   - Click the verification link in the email

3. **Request Production Access (Recommended)**
   - In SES Console, go to "Account dashboard"
   - Click "Request production access"
   - Fill out the form (explain you're sending account verification emails)
   - Wait for approval (usually 24-48 hours)
   - **Note**: In sandbox mode, you can only send to verified email addresses

### IAM Role Setup

**Current IAM Role:** `EC2-SSM-Role` (also used by Milo - **DO NOT MODIFY MILO POLICIES**)

**⚠️ IMPORTANT:** This role is shared with Milo. We have two options:

#### Option 1: Add SES Permissions to Existing Role (Recommended)

**Safe for Milo:** Only adds email sending permissions, doesn't affect Milo's S3 access.

**Steps:**
1. Go to IAM Console → Roles → `EC2-SSM-Role`
2. Click "Add permissions" → "Create inline policy" (or "Attach policies")
3. Use JSON tab and paste:
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
4. Name it: `SummitSESEmailPolicy`
5. Review and create

**This is safe** - SES permissions are separate from Milo's S3 permissions.

#### Option 2: Create New IAM Role for Summit (Better Separation)

**Steps:**
1. **Create New IAM Role:**
   - IAM Console → Roles → Create role
   - Select "AWS service" → "EC2"
   - Click "Next"

2. **Attach Policies:**
   - Attach: `AmazonSSMManagedInstanceCore` (for SSM)
   - Create custom policy for SES (same JSON as Option 1)
   - Name role: `Summit-EC2-Role`

3. **Attach to EC2 Instance:**
   - EC2 Console → Instances → `i-0fba58db502cc8d39`
   - Actions → Security → Modify IAM role
   - Select `Summit-EC2-Role`
   - Save

**This completely separates Summit from Milo.**

#### Option 3: Use Access Keys (If You Don't Want to Modify IAM)

- Go to IAM Console → Users → Create user (or use existing)
- Attach SES policy (same as above)
- Create access key
- Add to `.env` file:
  ```
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=...
  ```

**Recommendation:** Use **Option 1** - it's the simplest and safest. SES permissions won't interfere with Milo.

## Email Template Details

**Subject:** "Welcome to Summit - Your Temporary Password"

**Content includes:**
- Welcome message with user's name
- Temporary password (12 characters, plain text)
- Step-by-step login instructions
- **24-hour deletion warning** (highlighted in amber/yellow)
- Login URL: `https://summit.codingeverest.com/login`

**Template location:** `server/src/lib/email.ts`

## AWS SES Limits & Pricing

### Free Tier (EC2)
- **62,000 emails/month** when sending from EC2 instances
- **No charge** for emails sent from EC2
- **Sandbox mode**: Can only send to verified email addresses
- **Production mode**: Can send to any email address (requires approval)

### Production Access Request
To send to any email address (not just verified ones):
1. Go to SES Console → Account dashboard
2. Click "Request production access"
3. Fill out form:
   - Use case: "Account verification and password reset emails"
   - Website URL: `https://summit.codingeverest.com`
   - Expected volume: Low (under 1000 emails/day initially)
4. Submit and wait for approval

## Testing Email Delivery

### Test Signup Flow:
1. Go to: `https://summit.codingeverest.com/login`
2. Click "Sign up"
3. Fill in:
   - Name: "Test User"
   - Email: (use a verified email address in sandbox mode)
   - Job Title: "N/A"
   - Phone: "N/A"
   - Company: "N/A"
4. Submit
5. Check email inbox for temp password
6. Login with temp password
7. Change password
8. Verify full flow works

### Troubleshooting Email Issues

**Email not received:**
- Check spam/junk folder
- Verify sender email is verified in SES
- Check SES Console → Sending statistics for errors
- Check server logs: `pm2 logs summit-backend`

**SES Error: "Email address not verified"**
- You're in sandbox mode
- Recipient email must be verified in SES
- Request production access to send to any email

**SES Error: "Access Denied"**
- Check IAM role permissions
- Or verify access keys are correct
- Check AWS_REGION matches SES region

## Server Configuration

### Current Server Path
```
/var/www/summit/server
```

### Environment File Location
```
/var/www/summit/server/.env
```

### Restart Server After .env Changes
```bash
cd /var/www/summit/server
pm2 restart summit-backend
```

### Check Server Logs
```bash
pm2 logs summit-backend
# Or for errors only:
pm2 logs summit-backend --err
```

## Account Cleanup (24-Hour Deletion)

Accounts that don't change their password within 24 hours are automatically deleted.

### Manual Cleanup
```bash
curl -X POST https://summit.api.codingeverest.com/api/auth/cleanup-expired-accounts
```

### Automated Cleanup (Cron Job)
Add to crontab on EC2:
```bash
# Edit crontab
crontab -e

# Add this line (runs every hour):
0 * * * * curl -X POST https://summit.api.codingeverest.com/api/auth/cleanup-expired-accounts >> /var/log/summit-cleanup.log 2>&1
```

## Important URLs

- **Frontend**: https://summit.codingeverest.com
- **API**: https://summit.api.codingeverest.com
- **AWS SES Console**: https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1
- **EC2 Instance**: i-0fba58db502cc8d39 (ec2-52-48-245-252.eu-west-1.compute.amazonaws.com)

## Security Notes

1. **Never commit `.env` file to Git** - Contains sensitive credentials
2. **Use IAM roles when possible** - More secure than access keys
3. **Rotate access keys regularly** - If using access keys
4. **Monitor SES sending statistics** - Check for abuse or errors
5. **Temp passwords are secure** - 12 characters, cryptographically random

## Database Schema

The following columns were added to the `users` table:

- `temp_password_hash` (TEXT) - Hashed temporary password
- `requires_password_change` (BOOLEAN) - Flag for mandatory password change
- `account_created_at` (TIMESTAMP) - Tracks account creation for 24-hour deletion

Migration file: `database/migration_temp_password_signup.sql`

## Support & Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SES Console for errors
   - Verify email is verified
   - Check server logs for errors
   - Verify IAM permissions or access keys

2. **"Cannot connect to server" errors**
   - Check PM2 status: `pm2 status`
   - Check server logs: `pm2 logs summit-backend`
   - Verify server is running: `pm2 list`

3. **Database errors**
   - Verify migration ran: Check for columns in `users` table
   - Check database connection: Verify `.env` DB settings
   - Check PgBouncer is running: `sudo systemctl status pgbouncer`

### Useful Commands

```bash
# Check PM2 status
pm2 status

# View server logs
pm2 logs summit-backend

# Restart server
pm2 restart summit-backend

# Check database connection
sudo -u postgres psql -d summit -c "SELECT COUNT(*) FROM users;"

# Check SES package installed
cd /var/www/summit/server
ls -la node_modules/@aws-sdk/client-ses
```

## Next Steps After Configuration

1. ✅ Verify email in AWS SES
2. ✅ Update `.env` file with SES configuration
3. ✅ Restart server
4. ✅ Test signup flow
5. ⚠️ Request production access (if needed)
6. ⚠️ Set up automated account cleanup (optional)

---

---

## ⚠️ IMPORTANT: Milo Project Protection

**Current IAM Role:** `EC2-SSM-Role`
- This role has `MiloS3DeployAccess` policy (for Milo project)
- **We will NOT modify or remove any Milo-related permissions**
- SES permissions are completely separate and won't affect Milo

**What we're adding:**
- Only `ses:SendEmail` and `ses:SendRawEmail` permissions
- These are email-only permissions
- No access to S3, no access to any Milo resources
- Completely isolated functionality

**If you prefer complete separation:**
- Create a new IAM role specifically for Summit (Option 2 above)
- This keeps Summit and Milo completely separate

---

**Last Updated:** 2026-01-14
**EC2 Instance:** i-0fba58db502cc8d39
**Region:** eu-west-1
**Server Path:** /var/www/summit/server
**IAM Role:** EC2-SSM-Role (shared with Milo - Milo permissions will NOT be modified)
