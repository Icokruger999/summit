#!/bin/bash
# Deploy Summit Backend to EC2 via SSM
# This script deploys your backend server to EC2 through SSM Session Manager

set -e

echo "========================================"
echo "   Summit Backend Deployment to EC2"
echo "========================================"
echo ""

# Check if INSTANCE_ID is provided
if [ -z "$1" ]; then
    echo "❌ Error: Instance ID required"
    echo ""
    echo "Usage: $0 <instance-id>"
    echo ""
    echo "Example:"
    echo "  $0 i-0123456789abcdef0"
    echo ""
    echo "To find your instance ID, run:"
    echo "  aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,Tags[?Key==\`Name\`].Value|[0]]' --output table"
    echo ""
    exit 1
fi

INSTANCE_ID=$1
APP_DIR="/opt/summit"

echo "📦 Target Instance: $INSTANCE_ID"
echo "📁 Deploy Directory: $APP_DIR"
echo ""

# Verify instance is accessible via SSM
echo "🔍 Checking SSM connectivity..."
if ! aws ssm describe-instance-information --instance-information-filter-list "key=InstanceIds,valueSet=$INSTANCE_ID" --query "InstanceInformationList[0].InstanceId" --output text | grep -q "$INSTANCE_ID"; then
    echo "❌ Instance not accessible via SSM!"
    echo ""
    echo "Please ensure:"
    echo "  1. Instance has IAM role with SSM permissions"
    echo "  2. SSM Agent is running"
    echo "  3. Instance has internet access"
    echo ""
    echo "See AWS_SSM_SETUP.md for setup instructions"
    exit 1
fi
echo "✅ Instance is accessible"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
cd server
npm run build
cd ..

# Create tarball
tar -czf summit-backend.tar.gz \
    server/dist \
    server/package.json \
    server/package-lock.json \
    database/complete_schema.sql

echo "✅ Package created: summit-backend.tar.gz"
echo ""

# Upload to S3 (temporary storage)
BUCKET_NAME="summit-deployment-$(date +%s)"
echo "📤 Uploading to S3..."
aws s3 mb s3://$BUCKET_NAME --region eu-west-1
aws s3 cp summit-backend.tar.gz s3://$BUCKET_NAME/

echo "✅ Uploaded to S3"
echo ""

# Deploy via SSM
echo "🚀 Deploying to EC2..."

DEPLOY_SCRIPT=$(cat <<'EOF'
#!/bin/bash
set -e

BUCKET_NAME="$1"
APP_DIR="/opt/summit"

echo "📥 Downloading deployment package..."
mkdir -p $APP_DIR
cd $APP_DIR
aws s3 cp s3://$BUCKET_NAME/summit-backend.tar.gz .

echo "📦 Extracting..."
tar -xzf summit-backend.tar.gz
rm summit-backend.tar.gz

echo "📦 Installing dependencies..."
cd server
npm ci --production

echo "⚙️  Configuring environment..."
if [ ! -f .env ]; then
    cat > .env << 'ENVEOF'
PORT=3000
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=Stacey1122
JWT_SECRET=change-this-in-production
LIVEKIT_URL=ws://localhost:7880
ENVEOF
    echo "⚠️  Created default .env file - please update with production values!"
fi

echo "🔄 Restarting service..."
pm2 delete summit-server 2>/dev/null || true
pm2 start dist/index.js --name summit-server
pm2 save

echo "✅ Deployment complete!"
pm2 status
EOF
)

aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$DEPLOY_SCRIPT\"]" \
    --comment "Deploy Summit Backend" \
    --output text

echo "✅ Deployment initiated!"
echo ""

# Cleanup
echo "🧹 Cleaning up..."
aws s3 rm s3://$BUCKET_NAME/summit-backend.tar.gz
aws s3 rb s3://$BUCKET_NAME
rm summit-backend.tar.gz

echo "✅ Cleanup complete"
echo ""
echo "=========================================="
echo "   Deployment Complete!"
echo "=========================================="
echo ""
echo "To check status, run:"
echo "  aws ssm start-session --target $INSTANCE_ID"
echo "  pm2 status"
echo ""
echo "To view logs:"
echo "  pm2 logs summit-server"
echo ""

