#!/usr/bin/env python3
"""
Test the API call directly to see the actual error response
"""
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🧪 TESTING API CALL DIRECTLY")
print("=" * 60)

print("\n1. Creating a test JWT token...")
# Create a simple test token (this won't work for real auth, but we can test the endpoint)
test_script = """
cd /var/www/summit
node -e "
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Create a test token
const token = jwt.sign(
  { id: 'test-user-id', email: 'test@example.com' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log(token);
" 2>&1
"""

token = run_command(test_script)
print(f"   Token: {token[:50]}...")

print("\n2. Testing Chime meeting endpoint with curl...")
test_curl = f"""
curl -X POST http://localhost:4000/api/chime/meeting \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer {token}' \\
  -d '{{"chatId": "test-chat-123"}}' \\
  -v 2>&1
"""

stdout = run_command(test_curl)
print(stdout)

print("\n" + "=" * 60)
print("\nThis should show us the actual error response from the backend")
