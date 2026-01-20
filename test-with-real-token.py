#!/usr/bin/env python3
"""
Test with real JWT secret
"""
import boto3
import time

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

print("🧪 TESTING WITH REAL JWT SECRET")
print("=" * 60)

print("\n1. Getting JWT secret from .env...")
jwt_secret = run_command("grep JWT_SECRET /var/www/summit/.env | cut -d= -f2")
print(f"   JWT_SECRET found: {jwt_secret[:20]}...")

print("\n2. Creating token with real secret...")
test_script = f"""
cd /var/www/summit
node -e "
const jwt = require('jsonwebtoken');
const JWT_SECRET = '{jwt_secret}';

const token = jwt.sign(
  {{ id: 'test-user-id', email: 'test@example.com' }},
  JWT_SECRET,
  {{ expiresIn: '1h' }}
);

console.log(token);
" 2>&1
"""

token = run_command(test_script)
print(f"   Token created: {token[:50]}...")

print("\n3. Testing Chime endpoint...")
test_curl = f"""
curl -X POST http://localhost:4000/api/chime/meeting \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer {token}' \\
  -d '{{"chatId": "test-chat-123"}}' \\
  -s -w "\\nHTTP Status: %{{http_code}}\\n"
"""

stdout = run_command(test_curl)
print(stdout)

print("\n" + "=" * 60)
