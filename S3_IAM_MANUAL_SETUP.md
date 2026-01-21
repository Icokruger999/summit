# S3 IAM Permissions - Manual Setup Required

## Issue
The AWS IAM user credentials are currently quarantined due to `AWSCompromisedKeyQuarantineV3` policy, which prevents automated IAM role modifications.

## What Was Done
✅ S3 bucket created: `summit-chat-uploads` in `eu-west-1`
✅ Backend upload endpoint deployed: `/api/uploads/image`
✅ Frontend paste handler implemented
✅ IAM policy created: `SummitS3ChatUploadsPolicy` (arn:aws:iam::148450585085:policy/SummitS3ChatUploadsPolicy)

## What Needs Manual Setup

### Option 1: Add Inline Policy to EC2 Role (Recommended)

1. Go to AWS Console → IAM → Roles
2. Find role: `EC2-SSM-Role`
3. Click "Add permissions" → "Create inline policy"
4. Switch to JSON tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
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

5. Name it: `SummitS3ChatUploadsInlinePolicy`
6. Click "Create policy"

### Option 2: Attach Existing Policy

1. Go to AWS Console → IAM → Roles
2. Find role: `EC2-SSM-Role`
3. Click "Add permissions" → "Attach policies"
4. Search for: `SummitS3ChatUploadsPolicy`
5. Select it and click "Attach policies"

## Verify Setup

After adding permissions, the backend should automatically work (it's already configured to use IAM role).

Test with:
```bash
curl -X POST https://summit.api.codingeverest.com/api/uploads/image \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'image=@test.jpg'
```

## Backend Configuration

The backend is already configured with:
- `AWS_REGION=eu-west-1`
- `S3_BUCKET_NAME=summit-chat-uploads`
- No access keys needed (uses IAM role)

## Frontend Features

✅ Paste images directly into chat (Ctrl+V)
✅ Image preview before sending
✅ Upload to S3
✅ Display images in chat
✅ Click to open full size

## Current Status

🟡 **Waiting for manual IAM permissions**

Once IAM permissions are added:
- Image paste will work immediately
- No backend restart needed
- No code changes needed

## Troubleshooting

If uploads fail after adding permissions:
1. Check CloudWatch logs for the backend
2. Verify IAM role is attached to EC2 instance
3. Verify S3 bucket exists and is in `eu-west-1`
4. Test with: `aws s3 ls s3://summit-chat-uploads` from EC2 instance
