#!/usr/bin/env python3
import boto3
import time
import json
import base64

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=5):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=60
        )
        command_id = response['Command']['CommandId']
        time.sleep(wait)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("Debugging token verification...")

# Get a token
stdout = run_command('''curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' ''')
data = json.loads(stdout)
token = data.get('token', '')

print(f"Token: {token[:80]}...")

# Decode the token payload (middle part)
parts = token.split('.')
if len(parts) == 3:
    # Add padding if needed
    payload = parts[1]
    padding = 4 - len(payload) % 4
    if padding != 4:
        payload += '=' * padding
    decoded = base64.b64decode(payload)
    print(f"\nToken payload: {decoded.decode()}")

# Test manually verifying the token on the server
print("\n\nTesting token verification on server...")
stdout = run_command(f'''
cd /var/www/summit/server
node -e "
const jwt = require('jsonwebtoken');
const token = '{token}';
const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
console.log('Using secret:', secret);
try {{
  const decoded = jwt.verify(token, secret);
  console.log('Decoded:', JSON.stringify(decoded));
}} catch (e) {{
  console.log('Error:', e.message);
}}
"
''')
print(stdout)

# Check what secret is actually in the environment
print("\n\nChecking actual environment in running process...")
stdout = run_command('''
# Get the PID of the node process
PID=$(PM2_HOME=/etc/.pm2 pm2 pid summit-backend)
echo "Process PID: $PID"

# Check the environment of the running process
cat /proc/$PID/environ 2>/dev/null | tr '\\0' '\\n' | grep JWT_SECRET || echo "JWT_SECRET not in process env"
''')
print(stdout)
