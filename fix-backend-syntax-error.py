#!/usr/bin/env python3
"""
Fix the duplicate messageNotifier import in backend
"""

import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

def main():
    print("🔧 Fixing Backend Syntax Error")
    print("="*60)
    
    ssm = boto3.client("ssm", region_name=REGION)
    
    # Check the uploads.ts file for duplicate imports
    commands = [
        "cd /var/www/summit/dist/routes",
        "ls -la uploads.js 2>/dev/null || echo 'uploads.js not found'",
        "head -20 uploads.js 2>/dev/null || echo 'Cannot read uploads.js'"
    ]
    
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": commands},
            Comment="Check uploads file"
        )
        
        command_id = response["Command"]["CommandId"]
        time.sleep(3)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        print(f"\n📄 File check:\n{output['StandardOutputContent']}")
        
        # The issue is uploads.js exists but has syntax error
        # Let's just remove it since we reverted the feature
        print("\n🗑️  Removing uploads.js (feature was reverted)...")
        
        remove_commands = [
            "cd /var/www/summit/dist/routes",
            "rm -f uploads.js",
            "export HOME=/home/ubuntu",
            "pm2 restart summit-backend",
            "sleep 3",
            "curl -s http://localhost:4000/health"
        ]
        
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": remove_commands},
            Comment="Remove uploads.js and restart"
        )
        
        command_id = response["Command"]["CommandId"]
        time.sleep(5)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        print(f"\n✅ Output:\n{output['StandardOutputContent']}")
        
        if '"status":"ok"' in output['StandardOutputContent']:
            print("\n✅ Backend is HEALTHY!")
        else:
            print("\n⚠️  Health check didn't return OK")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
