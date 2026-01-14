# Why Do We Need to Add SES Policy to IAM Role?

## The Problem

When your server tries to send an email via AWS SES, it needs **permission** to do so. Without the IAM policy, you'll get this error:

```
AccessDenied: User is not authorized to perform: ses:SendEmail
```

## How It Works

### Current Setup:
1. **EC2 Instance** has IAM role: `EC2-SSM-Role`
2. **Server code** uses AWS SES SDK to send emails
3. **AWS SES SDK** automatically uses the EC2 instance's IAM role for authentication
4. **But the IAM role doesn't have SES permissions yet!**

### What Happens When Sending Email:

```
Server Code → AWS SES SDK → AWS SES Service
                ↓
        Uses IAM Role (EC2-SSM-Role)
                ↓
        AWS Checks: "Does this role have ses:SendEmail permission?"
                ↓
        ❌ NO → Access Denied Error
        ✅ YES → Email Sent Successfully
```

## The Solution

By adding the SES policy to the IAM role, you're giving the EC2 instance permission to:
- `ses:SendEmail` - Send emails via SES
- `ses:SendRawEmail` - Send raw emails (for advanced use cases)

## Why Use IAM Role Instead of Access Keys?

**Benefits of IAM Role:**
- ✅ More secure (no keys to manage)
- ✅ Automatic credential rotation
- ✅ No keys stored in `.env` file
- ✅ AWS best practice

**Without IAM Role:**
- ❌ Need to store access keys in `.env` file
- ❌ Keys can be compromised
- ❌ Need to rotate keys manually
- ❌ Less secure

## What the Code Does

Look at `server/src/lib/email.ts`:

```typescript
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // ← Uses IAM role if no keys provided
});
```

**Line 15:** If no access keys are in `.env`, it uses `undefined`, which tells the SDK to **automatically use the EC2 instance's IAM role**.

But the IAM role needs SES permissions, or it will fail!

## Alternative: Use Access Keys (Not Recommended)

If you don't want to modify the IAM role, you could:
1. Create IAM user with SES permissions
2. Generate access keys
3. Add to `.env`:
   ```
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```

But this is **less secure** and **not recommended**.

## Summary

**Why add the policy?**
- So the EC2 instance can send emails via AWS SES
- Without it, email sending will fail with "Access Denied"
- It's the secure way (using IAM role instead of access keys)

**Is it safe for Milo?**
- ✅ YES - Only adds email permissions
- ✅ Milo's S3 permissions remain unchanged
- ✅ SES and S3 are completely separate services

---

**Bottom line:** The IAM policy gives your server permission to send emails. Without it, the signup feature won't be able to email temporary passwords to users.
