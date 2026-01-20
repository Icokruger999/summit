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

print("Checking auth middleware on server...")

# 1. Check the compiled auth middleware
print("\n1. Auth middleware (dist):")
stdout = run_command("cat /var/www/summit/server/dist/middleware/auth.js")
print(stdout[:2000])

# 2. Check what JWT_SECRET the server is actually using
print("\n\n2. Check server logs for JWT issues:")
stdout = run_command("PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 50 --nostream 2>&1 | grep -i 'jwt\\|secret\\|auth\\|unauthorized' | tail -20")
print(stdout if stdout else "No JWT logs found")

# 3. Check if dotenv is loading correctly
print("\n3. Check if .env is being loaded:")
stdout = run_command("head -30 /var/www/summit/server/dist/index.js | grep -i dotenv")
print(stdout if stdout else "No dotenv reference found")
