# Final Setup Steps - Quick Guide

## ⚠️ I Cannot Add IAM Policy Automatically

The AWS CLI user doesn't have IAM permissions. You need to add the SES policy manually (takes 2 minutes).

## Step 1: Add SES Policy (You Do This - 2 minutes)

**Why?** The EC2 instance needs permission to send emails via AWS SES. Without this policy, email sending will fail with "Access Denied". See `WHY_IAM_POLICY_NEEDED.md` for detailed explanation.

1. Go to: https://console.aws.amazon.com/iam/home?region=eu-west-1#/roles/EC2-SSM-Role
2. Click "Add permissions" → "Create inline policy"
3. Click "JSON" tab
4. Paste this (the file `ses-policy.json` is in the repo):
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
5. Name: `SummitSESEmailPolicy`
6. Create policy

✅ Done! Milo's permissions are untouched.

## Step 2: Verify Email in SES (You Do This - 2 minutes)

1. Go to: https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/verified-identities
2. Create identity → Email address
3. Enter: `noreply@codingeverest.com` (or your preferred email)
4. Verify via email link

## Step 3: I'll Complete Everything Else

Once you tell me the email address you verified, I'll run:

```powershell
.\complete-ses-setup.ps1 -FromEmail "your-email@domain.com"
```

This will:
- ✅ Update `.env` file
- ✅ Restart server
- ✅ Verify everything works

**Or you can run it yourself!**

---

**That's it!** Just those 2 steps, then tell me the email address and I'll finish the rest.
