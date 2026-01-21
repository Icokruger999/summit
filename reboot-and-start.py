#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ec2 = boto3.client('ec2', region_name=REGION)
ssm = boto3.client('ssm', region_name=REGION)

print("🔄 Rebooting EC2 Instance to Clear Zombie Processes")
print("="*60)

# Reboot
print("Rebooting instance...")
ec2.reboot_instances(InstanceIds=[INSTANCE_ID])

print("Waiting 60 seconds for reboot...")
time.sleep(60)

# Wait for instance to be running
print("Waiting for instance to be running...")
waiter = ec2.get_waiter('instance_running')
waiter.wait(InstanceIds=[INSTANCE_ID])
print("✅ Instance is running")

# Wait for SSM to be ready
print("Waiting 30 seconds for SSM to be ready...")
time.sleep(30)

# Start backend
print("\n" + "="*60)
print("Starting Backend")
print("="*60)

command = """
export HOME=/home/ubuntu

echo "=== Check no processes on port 4000 ==="
lsof -i :4000 || echo "✅ Port 4000 is free"

echo ""
echo "=== Start backend ==="
cd /var/www/summit/dist

PORT=4000 \
NODE_ENV=production \
DATABASE_URL="postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:5432/summit" \
JWT_SECRET="summit-jwt-secret" \
CORS_ORIGIN="https://summit.codingeverest.com" \
pm2 start index.js --name summit-backend --time

pm2 save --force
sleep 5

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Test login ==="
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}'
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
    
    # Test from outside
    print("\n" + "="*60)
    print("🧪 Testing Login from Outside")
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
            print("✅✅✅ BACKEND IS FULLY RESTORED! ✅✅✅")
            print(f"User: {r.json().get('user', {}).get('name')}")
        else:
            print(f"❌ Failed: {r.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
