#!/bin/bash
# Deploy user search fix to EC2

INSTANCE_ID="i-0fba58db502cc8d39"
REGION="us-east-1"

echo "[INFO] Deploying user search fix..."

# Create archive
echo "[1] Creating archive..."
tar -czf server-dist-fix.tar.gz -C server dist
echo "[OK] Archive created"

# Upload to S3 first (simpler than SSM for large files)
echo "[2] Uploading to S3..."
aws s3 cp server-dist-fix.tar.gz s3://summit-deployment/server-dist-fix.tar.gz --region $REGION
echo "[OK] Uploaded to S3"

# Download on EC2 and deploy
echo "[3] Deploying on EC2..."
aws ssm send-command \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "cd /tmp && aws s3 cp s3://summit-deployment/server-dist-fix.tar.gz . --region us-east-1",
    "cd /home/ubuntu/summit/server && tar -xzf /tmp/server-dist-fix.tar.gz",
    "pm2 restart summit-backend",
    "sleep 3 && pm2 status"
  ]' \
  --region $REGION

echo "[OK] Deployment complete!"
echo ""
echo "[INFO] Changes deployed:"
echo "  [OK] Removed subscription check from /api/users route"
echo "  [OK] User search now works without subscription"
echo "  [OK] Users can find contacts like ico@astutetech.co.za"
