#!/usr/bin/env pwsh
# Deploy user search fix to EC2

$INSTANCE_ID = "i-0fba58db502cc8d39"
$REGION = "us-east-1"
$S3_BUCKET = "summit-deployment"

Write-Host "[INFO] Deploying user search fix..." -ForegroundColor Green

# Step 1: Create archive
Write-Host "[1] Creating archive..." -ForegroundColor Cyan
tar -czf server-dist-fix.tar.gz -C server dist
Write-Host "[OK] Archive created" -ForegroundColor Green

# Step 2: Upload to S3
Write-Host "[2] Uploading to S3..." -ForegroundColor Cyan
aws s3 cp server-dist-fix.tar.gz "s3://$S3_BUCKET/server-dist-fix.tar.gz" --region $REGION
Write-Host "[OK] Uploaded to S3" -ForegroundColor Green

# Step 3: Deploy on EC2
Write-Host "[3] Deploying on EC2..." -ForegroundColor Cyan

$commands = @(
    "cd /tmp && aws s3 cp s3://$S3_BUCKET/server-dist-fix.tar.gz . --region $REGION",
    "cd /home/ubuntu/summit/server && tar -xzf /tmp/server-dist-fix.tar.gz",
    "pm2 restart summit-backend",
    "sleep 3 && pm2 status"
)

$commandsJson = $commands | ConvertTo-Json -AsArray

aws ssm send-command `
  --instance-ids $INSTANCE_ID `
  --document-name "AWS-RunShellScript" `
  --parameters "commands=$commandsJson" `
  --region $REGION

Write-Host "[OK] Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Changes deployed:" -ForegroundColor Yellow
Write-Host "  [OK] Removed subscription check from /api/users route" -ForegroundColor Green
Write-Host "  [OK] User search now works without subscription" -ForegroundColor Green
Write-Host "  [OK] Users can find contacts like ico@astutetech.co.za" -ForegroundColor Green
