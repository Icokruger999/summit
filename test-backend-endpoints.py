import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("Testing backend endpoints...")
print("=" * 60)

# Test various endpoints
endpoints = [
    "/api/users/search?email=test@test.com",
    "/api/chat-requests/received",
    "/api/chat-requests/contacts",
    "/api/presence/test-id"
]

for endpoint in endpoints:
    print(f"\nTesting: {endpoint}")
    stdout = run_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:4000{endpoint}")
    print(f"Status: {stdout.strip()}")

# Check what's actually running
print("\n" + "=" * 60)
print("Checking backend process:")
stdout = run_command("ps aux | grep 'node.*summit' | grep -v grep")
print(stdout)

# Check the actual index.js file being used
print("\n" + "=" * 60)
print("Checking which index.js PM2 is using:")
stdout = run_command("pm2 info summit-backend | grep 'script path'")
print(stdout)
