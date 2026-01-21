# Quick S3 Setup Guide (5 minutes)

## Step 1: Create S3 Bucket (2 minutes)

1. Go to: https://s3.console.aws.amazon.com/s3/buckets
2. Click **"Create bucket"**
3. **Bucket name**: `summit-chat-uploads`
4. **Region**: `Europe (Ireland) eu-west-1`
5. **Object Ownership**: ACLs enabled
6. **Block Public Access**: UNCHECK "Block all public access"
7. Check the acknowledgment box
8. Click **"Create bucket"**

## Step 2: Set Bucket Policy (1 minute)

1. Click on your new bucket `summit-chat-uploads`
2. Go to **Permissions** tab
3. Scroll to **Bucket policy** → Click **Edit**
4. Paste this policy:

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

5. Click **Save changes**

## Step 3: Configure CORS (1 minute)

1. Still in **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)** → Click **Edit**
3. Paste this configuration:

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

4. Click **Save changes**

## Step 4: Create IAM User (1 minute)

1. Go to: https://console.aws.amazon.com/iam/home#/users
2. Click **"Create user"**
3. **User name**: `summit-s3-uploader`
4. Click **Next**
5. Select **"Attach policies directly"**
6. Search for: `AmazonS3FullAccess`
7. Check the box next to it
8. Click **Next** → **Create user**

## Step 5: Create Access Keys

1. Click on the user `summit-s3-uploader`
2. Go to **Security credentials** tab
3. Scroll to **Access keys** → Click **"Create access key"**
4. Select **"Application running on AWS compute service"**
5. Click **Next** → **Create access key**
6. **COPY BOTH KEYS NOW** (you won't see the secret again!)

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

## Step 6: Add to EC2 Server

SSH into your EC2 server and add these to `.env`:

```bash
# SSH into server
ssh -i summit-keypair.pem ubuntu@your-ec2-ip

# Edit .env file
cd /var/www/summit
nano .env

# Add these lines:
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=summit-chat-uploads

# Save: Ctrl+X, Y, Enter
```

## Step 7: Deploy Backend

Run the deployment script:

```bash
# On your local machine
cd summit
python deploy-image-paste-backend.py
```

## Done! ✅

Your S3 bucket is ready for image uploads. The images will be stored at:
`https://summit-chat-uploads.s3.eu-west-1.amazonaws.com/chat-images/...`

## Test It

After deploying frontend changes, paste an image in a chat and it should upload to S3!

## Troubleshooting

**Images not uploading?**
- Check PM2 logs: `pm2 logs summit-backend`
- Verify AWS credentials in `.env`
- Check bucket name matches exactly

**Images not displaying?**
- Verify bucket policy is set
- Check CORS configuration
- Try accessing image URL directly in browser

## Cost

S3 is very cheap for this use case:
- Storage: ~$0.023/GB/month
- Uploads: $0.005/1000 requests
- Downloads: $0.0004/1000 requests

**Example**: 1000 images (500KB each) = ~$0.02/month
