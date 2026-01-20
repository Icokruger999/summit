#!/usr/bin/env python3
import boto3
import time

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

print("Debugging .env loading...")

# 1. Check ecosystem config cwd
print("\n1. Ecosystem config:")
stdout = run_command("cat /var/www/summit/server/ecosystem.config.cjs")
print(stdout)

# 2. Check PM2 process info
print("\n2. PM2 process info (cwd):")
stdout = run_command("PM2_HOME=/etc/.pm2 pm2 show summit-backend 2>/dev/null | grep -E 'cwd|script path|exec cwd'")
print(stdout)

# 3. Check both .env files
print("\n3. Server .env file:")
stdout = run_command("cat /var/www/summit/server/.env | head -10")
print(stdout)

# 4. Add debug logging to see what JWT_SECRET is being used
print("\n4. Adding debug endpoint to check env...")
stdout = run_command('''
# Create a simple test to check what JWT_SECRET the server sees
curl -s "http://localhost:4000/api/health" 2>/dev/null || echo "No health endpoint"

# Check PM2 logs for startup
PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 10 --nostream 2>&1 | grep -E 'CORS|Server|running'
''')
print(stdout)
