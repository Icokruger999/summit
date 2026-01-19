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
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("=" * 60)
print("TESTING REAL LOGIN")
print("=" * 60)

# Test login
print("\n1. Testing login:")
stdout = run_command("""
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}'
""")
print(stdout)

# If login works, extract token and get chats
if '"token"' in stdout:
    print("\n✅ Login successful!")
    
    # Extract token (simple parsing)
    import json
    try:
        data = json.loads(stdout)
        token = data.get('token')
        
        if token:
            print(f"\n2. Getting chats with token...")
            stdout2 = run_command(f"""
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer {token}"
""")
            print(stdout2[:1000])
    except:
        print("Could not parse token")
else:
    print("\n❌ Login failed")
    print("\n2. Checking if user exists in database:")
    stdout = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 -t -c "SELECT email, name, created_at FROM users WHERE email='ico@astutetech.co.za';"
""")
    print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
