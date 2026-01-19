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

print("Updating Chime client to use us-east-1...")
result = run_command("cd /var/www/summit && sed -i 's/region: process.env.AWS_REGION || .eu-west-1./region: .us-east-1./' index.js")
print("Updated Chime region in code")

print("Also updating MediaRegion to us-east-1...")
result = run_command("cd /var/www/summit && sed -i 's/MediaRegion: .eu-west-1./MediaRegion: .us-east-1./' index.js")
print("Updated MediaRegion")

print("Restarting backend...")
result = run_command("cd /var/www/summit && pm2 restart summit")
print("Restarted")

print("Testing Chime now...")
time.sleep(3)