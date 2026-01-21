#!/usr/bin/env python3
"""
Check backend health and logs
"""

import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

def main():
    print("🔍 Checking Backend Health")
    print("="*60)
    
    ssm = boto3.client("ssm", region_name=REGION)
    
    commands = [
        "export HOME=/home/ubuntu",
        "pm2 status",
        "echo '---'",
        "curl -s http://localhost:4000/health || echo 'Health check failed'",
        "echo '---'",
        "pm2 logs summit-backend --lines 30 --nostream --err"
    ]
    
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": commands},
            Comment="Check backend health"
        )
        
        command_id = response["Command"]["CommandId"]
        time.sleep(5)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        print(f"\n📊 Output:\n{output['StandardOutputContent']}")
        
        if output.get('StandardErrorContent'):
            print(f"\n❌ Errors:\n{output['StandardErrorContent']}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
