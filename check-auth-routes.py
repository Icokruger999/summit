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

print("Checking auth routes for JWT_SECRET usage...")

# Check the auth routes file
print("\n1. Auth routes (looking for JWT_SECRET):")
stdout = run_command("grep -n 'JWT_SECRET\\|jwt.sign' /var/www/summit/server/dist/routes/auth.js | head -20")
print(stdout)

# Check the full auth.js to see how token is created
print("\n2. Full auth routes file:")
stdout = run_command("cat /var/www/summit/server/dist/routes/auth.js | head -80")
print(stdout)
