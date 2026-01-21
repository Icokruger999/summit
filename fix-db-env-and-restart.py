#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Setting database environment and restarting...")

command = """
# Stop PM2
pm2 stop all
pm2 delete all

# Start with proper environment variables
cd /var/www/summit/dist

# Get database password from SSM
DB_PASSWORD=$(aws ssm get-parameter --name "/summit/db/password" --with-decryption --region eu-west-1 --query "Parameter.Value" --output text 2>/dev/null || echo "summit_password")

# Start with all environment variables
PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit:${DB_PASSWORD}@localhost:5432/summit" \
JWT_SECRET="summit-jwt-secret" \
pm2 start index.js --name summit-backend --time

pm2 save --force

sleep 3

echo "✅ Backend restarted with database credentials"
pm2 list
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=120
    )
    
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
except Exception as e:
    print(f"Error: {e}")
