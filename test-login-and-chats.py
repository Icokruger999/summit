import boto3
import time
import json

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
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("=" * 60)
print("TESTING LOGIN AND DATABASE")
print("=" * 60)

# Check users in database
print("\n1. Users in database:")
stdout = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 -t -c "SELECT email, name FROM users LIMIT 5;"
""")
print(stdout)

# Check chats in database
print("\n2. Chats in database:")
stdout = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 -t -c "SELECT id, type, created_at FROM chats LIMIT 5;"
""")
print(stdout)

# Try to login with your email
print("\n3. Testing login for ico@astutetech.co.za:")
stdout = run_command("""
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Astute2024!"}'
""")
print(stdout[:500])

print("\n" + "=" * 60)
print("What password should I try for ico@astutetech.co.za?")
print("=" * 60)
