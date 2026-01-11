# How to Set Up AWS Credentials for GitHub Actions

## Overview

To use the GitHub Actions workflows for SSL certificate management, you need to add your AWS credentials as GitHub Secrets. These credentials allow GitHub Actions to interact with your AWS account.

## Step 1: Get or Create AWS Access Keys

You have two options:

### Option A: Use Existing AWS Access Keys

If you already have AWS access keys, you can use those. Make sure they have the necessary permissions (see Step 2).

### Option B: Create New IAM User and Access Keys (Recommended)

**Creating a dedicated IAM user for GitHub Actions is the recommended approach:**

1. **Go to AWS IAM Console**
   - Navigate to: https://console.aws.amazon.com/iam/
   - Sign in with your AWS account

2. **Create a New IAM User**
   - Click **"Users"** in the left sidebar
   - Click **"Create user"**
   - Enter username: `github-actions-summit` (or any name you prefer)
   - Click **"Next"**

3. **Attach Policies**
   - Select **"Attach policies directly"**
   - Add these policies (minimum required):
     - `AmazonRoute53ReadOnlyAccess` - For checking DNS records
     - `AWSAmplifyReadOnlyAccess` - For checking Amplify domain status
     - `AWSCertificateManagerReadOnlyAccess` - For checking SSL certificates
   
   **Or create a custom policy with minimal permissions:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "amplify:ListDomainAssociations",
           "amplify:GetDomainAssociation",
           "route53:ListResourceRecordSets",
           "route53:GetHostedZone",
           "acm:ListCertificates",
           "acm:DescribeCertificate"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

4. **Create Access Key**
   - Click on the created user
   - Go to **"Security credentials"** tab
   - Scroll to **"Access keys"** section
   - Click **"Create access key"**
   - Select **"Application running outside AWS"**
   - Click **"Next"** and then **"Create access key"**

5. **Save Your Credentials**
   - **IMPORTANT:** Save these credentials immediately - you won't be able to see the secret key again!
   - Copy the **Access key ID** and **Secret access key**
   - Store them securely (you'll add them to GitHub in the next step)

## Step 2: Add Credentials to GitHub Secrets

1. **Go to Your GitHub Repository**
   - Navigate to: https://github.com/YOUR_USERNAME/YOUR_REPO
   - (Replace with your actual GitHub username and repository name)

2. **Open Repository Settings**
   - Click on **"Settings"** tab (top menu)
   - If you don't see Settings, make sure you have admin access to the repository

3. **Navigate to Secrets**
   - In the left sidebar, click **"Secrets and variables"**
   - Click **"Actions"**

4. **Add AWS Access Key ID**
   - Click **"New repository secret"**
   - **Name:** `AWS_ACCESS_KEY_ID`
   - **Value:** Paste your AWS Access Key ID
   - Click **"Add secret"**

5. **Add AWS Secret Access Key**
   - Click **"New repository secret"** again
   - **Name:** `AWS_SECRET_ACCESS_KEY`
   - **Value:** Paste your AWS Secret Access Key
   - Click **"Add secret"**

6. **Verify Secrets**
   - You should now see both secrets listed (values will be hidden)
   - Secrets are encrypted and only visible to GitHub Actions workflows

## Step 3: Verify Setup

1. **Test the Workflow**
   - Go to **"Actions"** tab in your GitHub repository
   - Select **"Configure SSL Domain"** workflow
   - Click **"Run workflow"**
   - Select **"check-status"** from the dropdown
   - Click **"Run workflow"**

2. **Check Results**
   - The workflow should run successfully
   - Check the logs to verify it can access AWS services
   - If you see errors, verify your credentials and permissions

## Security Best Practices

✅ **DO:**
- Use a dedicated IAM user for GitHub Actions (not your root account)
- Grant only the minimum required permissions
- Regularly rotate access keys
- Use separate credentials for different environments (dev/prod)
- Monitor access in AWS CloudTrail

❌ **DON'T:**
- Use your root AWS account credentials
- Commit credentials to code or configuration files
- Share credentials publicly
- Grant more permissions than necessary
- Use the same credentials for multiple services

## Troubleshooting

### Error: "Access Denied" or "Unauthorized"

**Solution:** Check that your IAM user has the required permissions:
- `amplify:ListDomainAssociations`
- `route53:ListResourceRecordSets`
- `acm:ListCertificates`

### Error: "Invalid credentials"

**Solution:**
- Verify the credentials are copied correctly (no extra spaces)
- Check that the access key is active in AWS IAM
- Ensure you're using the correct AWS region (eu-west-1)

### Can't See "Settings" Tab

**Solution:**
- Make sure you have admin access to the repository
- If it's not your repository, ask the owner to add you as a collaborator with admin rights

## Required AWS Permissions Summary

The GitHub Actions workflows need these permissions:

| Service | Permission | Purpose |
|---------|-----------|---------|
| Amplify | `ListDomainAssociations` | Check domain configuration |
| Route 53 | `ListResourceRecordSets` | Check DNS records |
| ACM | `ListCertificates` | Check SSL certificate status |
| ACM | `DescribeCertificate` | Get certificate details |

## Next Steps

Once credentials are set up:

1. ✅ Commit the workflow files to GitHub
2. ✅ Run the workflow to test
3. ✅ Set up daily monitoring (workflow runs automatically)
4. ✅ Use workflows to diagnose SSL issues when they occur

## Support

If you encounter issues:
1. Check AWS IAM Console for user permissions
2. Verify credentials in GitHub Secrets
3. Check workflow logs in GitHub Actions
4. Review AWS CloudTrail for access attempts

