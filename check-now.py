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

print("Checking backend status NOW...")

print("\n1. PM2 status:")
print(run_command("PM2_HOME=/etc/.pm2 pm2 list"))

print("\n2. Port 4000:")
print(run_command("ss -tlnp | grep 4000"))

print("\n3. Test login:")
print(run_command('''curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test123"}' '''))

print("\n4. Recent PM2 logs:")
print(run_command("PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 5 --nostream 2>&1 | tail -10"))
