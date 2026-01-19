import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command, timeout=60):
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=timeout
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("=" * 60)
print("FIXING DATABASE CONNECTION")
print("=" * 60)

# Check PostgreSQL and PgBouncer status
print("\n1. Checking PostgreSQL and PgBouncer:")
stdout = run_command("""
sudo systemctl status postgresql | head -5
sudo systemctl status pgbouncer | head -5
""")
print(stdout[:500])

# Test direct PostgreSQL connection
print("\n2. Testing direct PostgreSQL connection:")
stdout = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 5432 -c "SELECT COUNT(*) as user_count FROM users;"
""")
print(stdout)

# Test PgBouncer connection
print("\n3. Testing PgBouncer connection:")
stdout = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 -c "SELECT COUNT(*) as user_count FROM users;"
""")
print(stdout)

# Check backend .env
print("\n4. Checking backend .env database config:")
stdout = run_command("""
grep -E "DB_|DATABASE" /var/www/summit/.env
""")
print(stdout)

# Restart services
print("\n5. Restarting PostgreSQL and PgBouncer:")
stdout = run_command("""
sudo systemctl restart postgresql
sudo systemctl restart pgbouncer
sleep 3
pm2 restart summit-backend
sleep 3
""")
print(stdout[:300])

# Final test
print("\n6. Final test - login and get chats:")
stdout = run_command("""
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"
""")
print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
