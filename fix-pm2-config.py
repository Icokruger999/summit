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
    
    return output['StandardOutputContent'], output['StandardErrorContent']

print("=" * 60)
print("FIXING PM2 CONFIGURATION")
print("=" * 60)

# Check current PM2 config
print("\n1. Current PM2 info:")
stdout, stderr = run_command("pm2 info summit-backend")
print(stdout[:1000])

# Stop PM2
print("\n2. Stopping PM2...")
stdout, stderr = run_command("pm2 stop summit-backend")
print(stdout)

# Delete PM2 process
print("\n3. Deleting PM2 process...")
stdout, stderr = run_command("pm2 delete summit-backend")
print(stdout)

# Start with correct path
print("\n4. Starting with dist/index.js...")
stdout, stderr = run_command("""
cd /var/www/summit
pm2 start dist/index.js --name summit-backend
pm2 save
""")
print(stdout)

# Test endpoints
print("\n5. Testing endpoints...")
time.sleep(3)
stdout, stderr = run_command("""
curl -s -o /dev/null -w 'users/search: %{http_code}\\n' http://localhost:4000/api/users/search?email=test@test.com
curl -s -o /dev/null -w 'chat-requests/contacts: %{http_code}\\n' http://localhost:4000/api/chat-requests/contacts
curl -s -o /dev/null -w 'presence: %{http_code}\\n' http://localhost:4000/api/presence/test-id
""")
print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
