import boto3
import time
import json
import requests

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

print("Testing backup: index.js.backup-before-chime-handlers (23K, Jan 18 17:37)")

# Deploy backup
stdout = run_command("""
sudo cp /var/www/summit/index.js.backup-before-chime-handlers /var/www/summit/index.js
pm2 restart summit-backend
sleep 4
echo "Backend restarted"
""")
print(stdout)

# Test via direct HTTP
print("\nTesting via HTTP...")
try:
    # Login
    login_response = requests.post(
        'http://localhost:4000/api/auth/login',
        json={'email': 'ico@astutetech.co.za', 'password': 'Stacey@1122'},
        timeout=5
    )
    print(f"Login status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        data = login_response.json()
        token = data.get('token')
        print(f"Token: {token[:50] if token else 'None'}...")
        
        # Get chats
        chats_response = requests.get(
            'http://localhost:4000/api/chats',
            headers={'Authorization': f'Bearer {token}'},
            timeout=5
        )
        print(f"Chats status: {chats_response.status_code}")
        print(f"Chats response: {chats_response.text[:500]}")
    else:
        print(f"Login failed: {login_response.text}")
except Exception as e:
    print(f"Error: {e}")
