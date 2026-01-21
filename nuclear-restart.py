#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("☢️  Nuclear Restart - Kill Everything")

command = """
export HOME=/home/ubuntu

echo "=== Nuclear option: Kill everything ==="
pm2 kill
killall -9 node 2>/dev/null || true
killall -9 PM2 2>/dev/null || true
sleep 3

echo ""
echo "=== Verify nothing is running ==="
ps aux | grep -E "(node|pm2)" | grep -v grep || echo "✅ All processes killed"
lsof -i :4000 || echo "✅ Port 4000 is FREE"

echo ""
echo "=== Wait 5 seconds ==="
sleep 5

echo ""
echo "=== Start backend fresh ==="
cd /var/www/summit/dist

PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:5432/summit" \
JWT_SECRET="summit-jwt-secret" \
CORS_ORIGIN="https://summit.codingeverest.com" \
pm2 start index.js --name summit-backend --time --no-autorestart

sleep 8

echo ""
echo "=== Check status ==="
pm2 status

echo ""
echo "=== Test health ==="
curl -s http://localhost:4000/health

echo ""
echo "=== Test login ==="
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}'

echo ""
echo ""
echo "=== If working, enable autorestart ==="
if curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -q "token"; then
    echo "✅ Login works! Enabling autorestart..."
    pm2 delete summit-backend
    PORT=4000 \
    NODE_ENV=production \
    DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:5432/summit" \
    JWT_SECRET="summit-jwt-secret" \
    CORS_ORIGIN="https://summit.codingeverest.com" \
    pm2 start index.js --name summit-backend --time
    pm2 save --force
    echo "✅ Backend is stable and saved"
else
    echo "❌ Login failed, check logs"
    pm2 logs summit-backend --lines 20 --nostream
fi
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=90
    )
    
    time.sleep(20)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    # Test from outside
    print("\n" + "="*60)
    print("🧪 Final Test from Outside")
    print("="*60)
    
    import requests
    time.sleep(3)
    
    try:
        r = requests.post(
            "https://summit.api.codingeverest.com/api/auth/login",
            json={"email": "ico@astutetech.co.za", "password": "Stacey@1122"},
            timeout=10
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("✅✅✅ BACKEND IS FULLY RESTORED AND WORKING! ✅✅✅")
            print(f"User: {r.json().get('user', {}).get('name')}")
        else:
            print(f"❌ Failed: {r.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
