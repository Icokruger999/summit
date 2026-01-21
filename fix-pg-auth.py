#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Fixing PostgreSQL Authentication")

command = """
export HOME=/home/ubuntu

echo "=== Check pg_hba.conf ==="
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"

echo ""
echo "=== Update pg_hba.conf to allow md5 auth for summit_user ==="
sudo bash -c 'cat >> /etc/postgresql/*/main/pg_hba.conf << EOF

# Summit app connection
host    summit    summit_user    127.0.0.1/32    md5
EOF'

echo ""
echo "=== Reload PostgreSQL ==="
sudo systemctl reload postgresql

echo ""
echo "=== Test connection directly ==="
PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -U summit_user -d summit -c "SELECT 'Connection works!' as status;"

echo ""
echo "=== Restart backend ==="
pm2 restart summit-backend
sleep 5

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
            print(f"Welcome back, {r.json().get('user', {}).get('name')}!")
        else:
            print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
