#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Fixing pg_hba.conf for md5 Authentication")

command = """
export HOME=/home/ubuntu

echo "=== Backup pg_hba.conf ==="
cp /etc/postgresql/14/main/pg_hba.conf /etc/postgresql/14/main/pg_hba.conf.backup-$(date +%s)

echo ""
echo "=== Change scram-sha-256 to md5 for localhost ==="
sed -i 's/host    all             all             127.0.0.1\\/32            scram-sha-256/host    all             all             127.0.0.1\\/32            md5/g' /etc/postgresql/14/main/pg_hba.conf

echo ""
echo "=== Show the changed line ==="
grep "127.0.0.1/32" /etc/postgresql/14/main/pg_hba.conf

echo ""
echo "=== Reload PostgreSQL configuration ==="
systemctl reload postgresql

echo ""
echo "=== Wait for reload ==="
sleep 3

echo ""
echo "=== Test database connection ==="
PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 5432 -U summit_user -d summit -c "SELECT 'PostgreSQL Connected!' as status;"

echo ""
echo "=== Test PgBouncer connection ==="
PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 'PgBouncer Connected!' as status;"

echo ""
echo "=== Restart backend ==="
pm2 restart summit-backend
sleep 5

echo ""
echo "=== Test login endpoint ==="
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | head -c 200
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    time.sleep(12)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("\n=== STDERR ===")
        print(output['StandardErrorContent'])
    
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
            print("✅✅✅ BACKEND IS WORKING! ✅✅✅")
            data = r.json()
            print(f"Welcome back, {data.get('user', {}).get('name')}!")
        else:
            print(f"Response: {r.text[:300]}")
    except Exception as e:
        print(f"Error: {e}")
    
except Exception as e:
    print(f"Error: {e}")
