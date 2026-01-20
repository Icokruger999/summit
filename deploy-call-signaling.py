#!/usr/bin/env python3
"""
Deploy call signaling backend update
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
        TimeoutSeconds=60
    )
    command_id = response['Command']['CommandId']
    time.sleep(5)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🚀 DEPLOYING CALL SIGNALING BACKEND")
print("=" * 60)

print("\n1. Pulling latest code from GitHub...")
stdout = run_command("cd /var/www/summit-repo && git pull origin main")
print(stdout)

print("\n2. Installing dependencies...")
stdout = run_command("cd /var/www/summit-repo/server && npm install")
print("   ✅ Dependencies installed")

print("\n3. Building TypeScript...")
stdout = run_command("cd /var/www/summit-repo/server && npm run build")
print("   ✅ Build complete")

print("\n4. Copying built files to production...")
stdout = run_command("cp -r /var/www/summit-repo/server/dist/* /var/www/summit/")
print("   ✅ Files copied")

print("\n5. Restarting PM2...")
stdout = run_command("pm2 restart summit")
print("   ✅ PM2 restarted")

print("\n6. Waiting for server to start...")
time.sleep(5)

print("\n7. Checking server health...")
stdout = run_command("curl -s http://localhost:4000/health")
print(f"   {stdout}")

print("\n" + "=" * 60)
print("✅ CALL SIGNALING DEPLOYED")
print("\nBackend now has:")
print("  - POST /api/chime/notify - Send call notifications")
print("  - WebSocket INCOMING_CALL messages")
print("\nFrontend (deploying via Amplify):")
print("  - Sends notification when starting call")
print("  - Receives and displays incoming calls")
