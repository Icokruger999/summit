#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Finding What's Using Port 4000")

command = """
export HOME=/home/ubuntu

echo "=== Stop PM2 completely ==="
pm2 kill
sleep 2

echo ""
echo "=== Find what's using port 4000 ==="
lsof -i :4000 || echo "Nothing found with lsof"

echo ""
netstat -tlnp | grep 4000 || echo "Nothing found with netstat"

echo ""
echo "=== Kill everything on port 4000 ==="
fuser -k 4000/tcp 2>&1 || echo "No process to kill"
sleep 2

echo ""
echo "=== Verify port is free ==="
lsof -i :4000 || echo "✅ Port 4000 is FREE"

echo ""
echo "=== Now start backend cleanly ==="
cd /var/www/summit/dist

PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:6432/summit" \
JWT_SECRET="summit-jwt-secret" \
CORS_ORIGIN="https://summit.codingeverest.com,https://www.codingeverest.com,https://codingeverest.com" \
pm2 start index.js --name summit-backend --time --max-restarts 3

pm2 save --force
sleep 5

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Check if it's actually running ==="
curl -s http://localhost:4000/health || echo "❌ Health check failed"

echo ""
echo "=== Check for errors ==="
pm2 logs summit-backend --err --lines 5 --nostream
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
            print("✅ BACKEND IS WORKING!")
        else:
            print(f"❌ Failed: {r.text[:300]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
