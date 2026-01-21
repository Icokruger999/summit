# S3 Setup Guide for Image Uploads

## Overview
Summit uses AWS S3 to store chat images. This guide will help you set up an S3 bucket and configure the necessary permissions.

## Step 1: Create S3 Bucket

1. Go to AWS S3 Console: https://s3.console.aws.amazon.com/
2. Click "Create bucket"
3. **Bucket name**: `summit-chat-uploads` (or your preferred name)
4. **Region**: Choose same region as your EC2 instance (e.g., `eu-west-1`)
5. **Block Public Access settings**:
   - Uncheck "Block all public access"
   - Check "I acknowledge that the current settings might result in this bucket and the objects within becoming public"
6. Click "Create bucket"

## Step 2: Configure Bucket Policy

1. Go to your bucket → Permissions tab
2. Scroll to "Bucket policy"
3. Click "Edit" and paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::summit-chat-uploads/*"
    }
  ]
}
```

**Note**: Replace `summit-chat-uploads` with your actual bucket name.

4. Click "Save changes"

## Step 3: Enable CORS

1. Go to your bucket → Permissions tab
2. Scroll to "Cross-origin resource sharing (CORS)"
3. Click "Edit" and paste this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. Click "Save changes"

## Step 4: Create IAM User for S3 Access

1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. **User name**: `summit-s3-uploader`
4. Click "Next"
5. **Permissions**: Select "Attach policies directly"
6. Search for and select: `AmazonS3FullAccess` (or create a custom policy for just your bucket)
7. Click "Next" → "Create user"

### Create Access Keys

1. Click on the user you just created
2. Go to "Security credentials" tab
3. Scroll to "Access keys"
4. Click "Create access key"
5. Select "Application running on AWS compute service"
6. Click "Next" → "Create access key"
7. **IMPORTANT**: Copy the Access Key ID and Secret Access Key

## Step 5: Add Environment Variables

Add these to your `.env` file on the EC2 server:

```bash
# S3 Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=summit-chat-uploads
```

**On EC2 Server**:
```bash
# SSH into your server
ssh -i summit-keypair.pem ubuntu@your-ec2-ip

# Edit the .env file
cd /var/www/summit
nano .env

# Add the S3 variables above
# Save with Ctrl+X, Y, Enter

# Restart PM2
export HOME=/home/ubuntu
pm2 restart summit-backend
```

## Step 6: Install S3 SDK

The S3 SDK is already added to `package.json`. Install it:

```bash
# On EC2 server
cd /var/www/summit
npm install @aws-sdk/client-s3
```

## Step 7: Test Upload

After deployment, test the upload:

```bash
curl -X POST https://summit.api.codingeverest.com/api/uploads/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-image.jpg"
```

## Custom IAM Policy (Recommended)

Instead of `AmazonS3FullAccess`, create a custom policy for better security:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::summit-chat-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::summit-chat-uploads"
    }
  ]
}
```

## Troubleshooting

### Images not uploading
- Check AWS credentials in `.env`
- Verify bucket name matches
- Check IAM user has S3 permissions
- Look at PM2 logs: `pm2 logs summit-backend`

### Images not displaying
- Verify bucket policy allows public read
- Check CORS configuration
- Verify image URL format in browser

### Permission denied errors
- Check IAM user permissions
- Verify AWS credentials are correct
- Check bucket exists in the correct region

## Cost Estimation

S3 pricing (as of 2024):
- Storage: ~$0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

**Example**: 1000 images (avg 500KB each) = 500MB storage
- Storage cost: ~$0.01/month
- Upload cost: ~$0.005
- View cost (10,000 views): ~$0.004

**Total**: Less than $0.02/month for moderate usage.

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible
2. **Enable versioning** for backup/recovery
3. **Set lifecycle policies** to delete old images
4. **Use CloudFront** for better performance (optional)
5. **Enable server-side encryption** for sensitive data

## Next Steps

After S3 is configured:
1. Deploy the backend changes
2. Test image upload from the app
3. Monitor S3 usage in AWS Console
4. Set up CloudWatch alarms for unusual activity
