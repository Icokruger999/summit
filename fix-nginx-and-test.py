#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Fixing Nginx")

command = """
export HOME=/home/ubuntu

echo "=== Test backend directly ==="
curl -s http://localhost:4000/health

echo ""
echo "=== Restart nginx ==="
sudo systemctl restart nginx

echo ""
echo "=== Test through nginx ==="
curl -s https://summit.api.codingeverest.com/health

echo ""
echo "=== Test login ==="
curl -s -X POST https://summit.api.codingeverest.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}'
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
    # Test from outside
    print("\n" + "="*60)
    print("🧪 Final Test")
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
            print("✅✅✅ BACKEND IS WORKING! ✅✅✅")
            print(f"Welcome back, {r.json().get('user', {}).get('name')}!")
        else:
            print(f"Response: {r.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
