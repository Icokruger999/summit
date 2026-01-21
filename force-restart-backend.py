#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔥 Force Restart Backend")

command = """
export HOME=/home/ubuntu

# Kill everything on port 4000
echo "=== Killing port 4000 ==="
fuser -k 4000/tcp 2>/dev/null || true
sleep 2

# Stop and delete all PM2 processes
echo "=== Stopping PM2 ==="
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 2

# Check port is free
echo "=== Checking port 4000 ==="
netstat -tlnp | grep 4000 || echo "Port 4000 is free"

cd /var/www/summit/dist

# Start fresh
echo "=== Starting backend ==="
PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:6432/summit" \
JWT_SECRET="summit-jwt-secret" \
CORS_ORIGIN="https://summit.codingeverest.com,https://www.codingeverest.com,https://codingeverest.com" \
pm2 start index.js --name summit-backend --time

pm2 save --force
sleep 5

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Health Check ==="
curl -s http://localhost:4000/health
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    
    time.sleep(12)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    # Test login
    print("\n" + "="*60)
    print("🧪 Testing Login")
    print("="*60)
    
    import requests
    time.sleep(2)
    
    try:
        r = requests.post(
            "https://summit.api.codingeverest.com/api/auth/login",
            json={"email": "ico@astutetech.co.za", "password": "Stacey@1122"},
            timeout=10
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("✅ BACKEND IS UP AND WORKING!")
        else:
            print(f"❌ Failed: {r.text[:300]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
