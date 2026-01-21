#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🚀 Starting Backend with Proper Environment")

command = """
export HOME=/home/ubuntu

# Stop any existing processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
fuser -k 4000/tcp 2>/dev/null || true

cd /var/www/summit/dist

# Start with environment variables
PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit:summit_password@summit-db.c9wpxqr8abcd.eu-west-1.rds.amazonaws.com:5432/summit" \
JWT_SECRET="summit-jwt-secret" \
CORS_ORIGIN="https://summit.codingeverest.com,https://www.codingeverest.com,https://codingeverest.com" \
pm2 start index.js --name summit-backend --time

pm2 save --force

echo ""
echo "=== Waiting for backend to start ==="
sleep 5

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Check Environment ==="
pm2 env 0 | grep -E "(DATABASE_URL|JWT_SECRET|PORT|NODE_ENV)" | head -10

echo ""
echo "=== Test Health Endpoint ==="
curl -s http://localhost:4000/health
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    
    time.sleep(10)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    # Test login
    print("\n" + "="*60)
    print("🧪 Testing Login Endpoint")
    print("="*60)
    
    import requests
    try:
        r = requests.post(
            "https://summit.api.codingeverest.com/api/auth/login",
            json={"email": "ico@astutetech.co.za", "password": "Stacey@1122"},
            timeout=10
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("✅ LOGIN WORKS!")
            print(f"Response: {r.json()}")
        else:
            print(f"❌ LOGIN FAILED")
            print(f"Response: {r.text[:500]}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
except Exception as e:
    print(f"Error: {e}")
