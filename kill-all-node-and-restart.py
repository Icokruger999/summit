#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔥 Kill ALL Node Processes and Restart Clean")

command = """
export HOME=/home/ubuntu

echo "=== Kill PM2 ==="
pm2 kill
sleep 2

echo ""
echo "=== Kill ALL node processes ==="
pkill -9 node
sleep 3

echo ""
echo "=== Verify no node processes ==="
ps aux | grep node | grep -v grep || echo "✅ No node processes"

echo ""
echo "=== Verify port 4000 is free ==="
lsof -i :4000 || echo "✅ Port 4000 is FREE"

echo ""
echo "=== Start backend with single instance ==="
cd /var/www/summit/dist

PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:6432/summit" \
JWT_SECRET="summit-jwt-secret" \
CORS_ORIGIN="https://summit.codingeverest.com,https://www.codingeverest.com,https://codingeverest.com" \
pm2 start index.js --name summit-backend --time --max-restarts 5 --restart-delay 3000

pm2 save --force
sleep 8

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Check logs ==="
pm2 logs summit-backend --lines 15 --nostream

echo ""
echo "=== Test health ==="
curl -s http://localhost:4000/health
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=90
    )
    
    time.sleep(15)
    
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
    time.sleep(3)
    
    try:
        r = requests.post(
            "https://summit.api.codingeverest.com/api/auth/login",
            json={"email": "ico@astutetech.co.za", "password": "Stacey@1122"},
            timeout=10
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("✅ BACKEND IS WORKING!")
            print(f"User: {r.json().get('user', {}).get('name')}")
        else:
            print(f"❌ Failed: {r.text[:300]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
