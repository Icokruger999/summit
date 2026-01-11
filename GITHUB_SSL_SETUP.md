# Using GitHub to Manage SSL Certificate for summit.codingeverest.com

## Overview

This repository includes GitHub Actions workflows and scripts to monitor and manage the SSL certificate for the Summit domain hosted on AWS Amplify.

## GitHub Actions Workflows

### 1. SSL Certificate Status Check (`ssl-certificate-check.yml`)

**Purpose:** Automatically check SSL certificate status daily and on push.

**Features:**
- Checks Amplify domain configuration status
- Verifies certificate in AWS Certificate Manager (ACM)
- Tests HTTPS connection
- Creates status summary

**Usage:**
- Runs automatically daily at 2 AM UTC
- Runs on push to main branch
- Can be triggered manually via GitHub Actions UI

**Required Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 2. Configure SSL Domain (`configure-ssl-domain.yml`)

**Purpose:** Manual workflow to configure and diagnose SSL issues.

**Actions:**
- `check-status` - Check current domain and certificate status
- `request-certificate` - Get instructions for certificate setup
- `validate-dns` - Validate DNS records for certificate validation

**Usage:**
1. Go to GitHub Actions tab
2. Select "Configure SSL Domain"
3. Click "Run workflow"
4. Choose an action from the dropdown
5. Click "Run workflow"

## Scripts

### fix-ssl-certificate.sh

Bash script to diagnose and fix SSL certificate issues.

**Usage:**
```bash
chmod +x scripts/fix-ssl-certificate.sh
./scripts/fix-ssl-certificate.sh
```

**Requirements:**
- AWS CLI installed and configured
- `jq` installed (for JSON parsing)
- Appropriate AWS permissions

## Setting Up GitHub Secrets

To use the GitHub Actions workflows, you need to add AWS credentials as secrets:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

   - **Name:** `AWS_ACCESS_KEY_ID`
     **Value:** Your AWS access key ID

   - **Name:** `AWS_SECRET_ACCESS_KEY`
     **Value:** Your AWS secret access key

## How SSL Certificates Work with Amplify

AWS Amplify **automatically provisions SSL certificates** via AWS Certificate Manager (ACM) when you add a custom domain. You cannot manually create certificates for Amplify domains - they are managed automatically.

### Process:

1. **Add Domain in Amplify Console**
   - Go to Amplify Console → Your App → Domain management
   - Click "Add domain"
   - Enter domain name: `summit.codingeverest.com`

2. **Add DNS Validation Record**
   - Amplify provides a CNAME record for certificate validation
   - Add this record to Route 53 (or your DNS provider)
   - Format: `_xxxxx.summit.codingeverest.com CNAME _xxxxx.acm-validations.aws`

3. **Wait for Certificate**
   - AWS automatically validates the certificate (10-30 minutes)
   - Once validated, certificate is automatically attached to CloudFront

4. **Update DNS (if needed)**
   - Amplify may provide a CloudFront URL
   - Update Route 53 CNAME to point to CloudFront URL (not the default Amplify URL)

## Current Status

To check the current SSL certificate status:

### Via GitHub Actions:
1. Go to **Actions** tab
2. Run "Configure SSL Domain" workflow
3. Select "check-status" action

### Via AWS CLI:
```bash
aws amplify list-domain-associations \
  --app-id d1mhd5fnnjyucj \
  --region eu-west-1
```

### Via Script:
```bash
./scripts/fix-ssl-certificate.sh
```

## Troubleshooting

### Domain Status: FAILED

**Solution:** Re-add the domain in Amplify Console
1. Remove the domain from Amplify
2. Wait a few minutes
3. Add it again
4. Add the new validation DNS record to Route 53

### Certificate Validation Failing

**Check:**
1. Validation DNS record exists in Route 53
2. Record name and value match exactly what Amplify provides
3. DNS has propagated (wait 5-10 minutes)

### HTTPS Connection Fails

**Possible causes:**
1. Certificate not yet issued (wait 10-30 minutes)
2. DNS points to wrong URL (should be CloudFront, not Amplify default)
3. Certificate validation failed (check DNS records)

## Manual Steps (if automation fails)

If GitHub Actions or scripts don't work, you can manually configure:

1. **AWS Amplify Console**
   - https://console.aws.amazon.com/amplify/home?region=eu-west-1#/d1mhd5fnnjyucj
   - Domain management → Add domain

2. **Route 53 Console**
   - https://console.aws.amazon.com/route53/home?region=eu-west-1#resource-record-sets:Z024513220PNY1F3PO6K5
   - Add validation CNAME record

3. **AWS Certificate Manager**
   - https://console.aws.amazon.com/acm/home?region=eu-west-1
   - Check certificate status

## Monitoring

The GitHub Actions workflow runs daily to monitor SSL certificate status. Check the Actions tab for:

- ✅ Green checkmark = SSL is working
- ❌ Red X = SSL issue detected
- ⏳ Yellow circle = In progress

## Important Notes

- SSL certificates for Amplify are **free** and **automatically renewed**
- Certificate provisioning takes **10-30 minutes**
- DNS propagation can take up to **48 hours** (usually < 1 hour)
- You cannot manually upload certificates to Amplify - they are managed automatically
- If domain status shows "FAILED", you must re-add the domain

## Resources

- [AWS Amplify Domain Management](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html)
- [AWS Certificate Manager](https://aws.amazon.com/certificate-manager/)
- [Route 53 DNS](https://docs.aws.amazon.com/route53/)

