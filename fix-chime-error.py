#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    try:
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
    except Exception as e:
        return f"Error: {str(e)}"

print("Checking PM2 logs for Chime errors...")
result = run_command("cd /var/www/summit && pm2 logs summit --lines 10 --nostream")
print("Recent logs:", result)

print("\nChecking AWS region in .env...")
result = run_command("cd /var/www/summit && grep AWS_REGION .env || echo 'AWS_REGION not set'")
print("AWS Region:", result)

print("\nAdding AWS_REGION and restarting...")
result = run_command("cd /var/www/summit && echo 'AWS_REGION=eu-west-1' >> .env && pm2 restart summit")
print("Restart result:", result[:100])