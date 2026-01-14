# Add SES Permissions to EC2-SSM-Role - Manual Steps

## ⚠️ IMPORTANT: This Only Adds Email Permissions

**Milo's S3 access will NOT be affected.** SES and S3 are completely separate services.

## Quick Steps (2 minutes)

1. **Go to IAM Console:**
   https://console.aws.amazon.com/iam/home?region=eu-west-1#/roles/EC2-SSM-Role

2. **Click "Add permissions"** → **"Create inline policy"**

3. **Click "JSON" tab**

4. **Delete any existing text** and paste this:
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

5. **Click "Next"**

6. **Policy name:** `SummitSESEmailPolicy`

7. **Click "Create policy"**

✅ Done! The role now has SES permissions. Milo's S3 permissions remain unchanged.

---

## Verify It Worked

After adding the policy, you should see `SummitSESEmailPolicy` in the role's inline policies list.

**That's it!** Now proceed to email verification.
