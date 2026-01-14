# AWS SES Setup - Configuration Options

## Current Situation

Your EC2 instance (`i-0fba58db502cc8d39`) uses the IAM role: **EC2-SSM-Role**

This role currently has:
- `AmazonSSMManagedInstanceCore` (for SSM access)
- `AWSCompromisedKeyQuarantineV3` (security)
- `MiloS3DeployAccess` (for Milo project - **DO NOT MODIFY**)

## Option 1: Add SES Permissions to Existing Role (Recommended)

**Pros:**
- Simple, no new resources
- Uses existing role
- Doesn't affect Milo

**Cons:**
- Adds permissions to shared role
- Less separation of concerns

**Steps:**
1. Go to IAM Console → Roles → `EC2-SSM-Role`
2. Click "Add permissions" → "Attach policies"
3. Search for "AmazonSESFullAccess" OR create custom policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["ses:SendEmail", "ses:SendRawEmail"],
       "Resource": "*"
     }]
   }
   ```
4. Name it: `SummitSESPolicy`
5. Attach to `EC2-SSM-Role`

**This will NOT affect Milo** - it only adds SES email sending permissions.

## Option 2: Create New IAM Role for Summit (Cleaner Separation)

**Pros:**
- Better separation of concerns
- Summit-specific permissions
- Easier to manage independently

**Cons:**
- Need to create new role
- Need to attach to EC2 instance
- More steps

**Steps:**
1. **Create New IAM Role:**
   - IAM Console → Roles → Create role
   - Select "AWS service" → "EC2"
   - Click "Next"

2. **Attach Policies:**
   - Attach: `AmazonSSMManagedInstanceCore` (for SSM)
   - Create custom policy for SES:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Action": ["ses:SendEmail", "ses:SendRawEmail"],
         "Resource": "*"
       }]
     }
     ```
   - Name: `SummitSESPolicy`
   - Attach to new role

3. **Name the Role:**
   - Role name: `Summit-EC2-Role`
   - Description: "IAM role for Summit EC2 instance with SES permissions"

4. **Attach Role to EC2 Instance:**
   - EC2 Console → Instances → Select `i-0fba58db502cc8d39`
   - Actions → Security → Modify IAM role
   - Select `Summit-EC2-Role`
   - Save

**This completely separates Summit from Milo.**

## Option 3: Use Access Keys (Not Recommended)

If you don't want to modify IAM roles at all:

1. Create IAM user with SES permissions
2. Generate access keys
3. Add to `.env` file:
   ```
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```

**Not recommended** because:
- Less secure than IAM roles
- Need to manage keys manually
- Keys can be compromised

## Recommendation

**I recommend Option 1** - Adding SES permissions to the existing `EC2-SSM-Role`:
- ✅ Simple and quick
- ✅ Doesn't affect Milo (only adds email permissions)
- ✅ No EC2 instance changes needed
- ✅ Uses existing infrastructure

The SES permissions are read-only for SES (can only send emails), so they won't interfere with Milo's S3 access or any other functionality.

## What I Can Do

I can:
- ✅ Update the `.env` file with SES configuration
- ✅ Verify email in SES (if you provide the email address)
- ✅ Restart the server
- ✅ Test the configuration

I **cannot** (you need to do):
- ❌ Modify IAM roles (requires AWS Console access)
- ❌ Verify email addresses in SES (requires email access)
- ❌ Request production access (requires AWS Console)

## Next Steps

**Please choose:**
1. **Option 1** - Add SES to existing role (I'll guide you)
2. **Option 2** - Create new role (I'll guide you)
3. **Option 3** - Use access keys (I'll help configure)

Once you choose, I'll:
1. Guide you through the IAM setup
2. Configure the `.env` file
3. Restart the server
4. Test everything

---

**Important:** Nothing will be modified related to Milo. All changes are isolated to Summit's email functionality.
