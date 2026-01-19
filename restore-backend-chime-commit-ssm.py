#!/usr/bin/env python3
"""
Restore backend to commit 3c62d34 (Chime decision commit) via SSM
This is the version that was working with Chime integration
"""
import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'
TARGET_COMMIT = '3c62d34'

def run_command(command, timeout=60):
    """Run command on EC2 via SSM"""
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'command': [command]},
            TimeoutSeconds=timeout
        )
        command_id = response['Command']['CommandId']
        
        # Wait for command to complete
        time.sleep(2)
        
        # Get command output
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        return {
            'status': output.get('Status', 'Unknown'),
            'stdout': output.get('StandardOutputContent', ''),
            'stderr': output.get('StandardErrorContent', '')
        }
    except Exception as e:
        return {'error': str(e), 'status': 'Failed', 'stdout': '', 'stderr': str(e)}

print(f"🔄 Restoring backend to commit {TARGET_COMMIT} (Chime decision)...")
print(f"Instance: {INSTANCE_ID}\n")

# Step 1: Stop backend
print("1️⃣  Stopping backend...")
result = run_command("pm2 stop summit")
print(result.get('stdout', result.get('error', 'No output')))
time.sleep(2)

# Step 2: Check current commit
print("\n2️⃣  Current commit:")
result = run_command("cd /var/www/summit && git log --oneline -1")
print(result.get('stdout', result.get('error', 'No output')))

# Step 3: Fetch latest from GitHub
print("\n3️⃣  Fetching latest from GitHub...")
result = run_command("cd /var/www/summit && git fetch origin")
print(result.get('stdout', result.get('error', 'No output')))

# Step 4: Checkout target commit
print(f"\n4️⃣  Checking out commit {TARGET_COMMIT}...")
result = run_command(f"cd /var/www/summit && git checkout {TARGET_COMMIT}")
print(result.get('stdout', result.get('error', 'No output')))
if result.get('stderr'):
    print("STDERR:", result['stderr'])

# Step 5: Verify commit
print("\n5️⃣  Verifying commit:")
result = run_command("cd /var/www/summit && git log --oneline -1")
print(result.get('stdout', result.get('error', 'No output')))

# Step 6: Install dependencies
print("\n6️⃣  Installing dependencies...")
result = run_command("cd /var/www/summit && npm install --legacy-peer-deps", timeout=120)
output = result.get('stdout', result.get('error', 'No output'))
print(output[-500:] if len(output) > 500 else output)

# Step 7: Build backend
print("\n7️⃣  Building backend...")
result = run_command("cd /var/www/summit && npm run build", timeout=120)
output = result.get('stdout', result.get('error', 'No output'))
print(output[-500:] if len(output) > 500 else output)

# Step 8: Start backend
print("\n8️⃣  Starting backend...")
result = run_command("pm2 start summit")
print(result.get('stdout', result.get('error', 'No output')))
time.sleep(3)

# Step 9: Check status
print("\n9️⃣  Checking backend status...")
result = run_command("pm2 status")
print(result.get('stdout', result.get('error', 'No output')))

# Step 10: Test endpoints
print("\n🔟 Testing endpoints...")
result = run_command("curl -s https://summit.api.codingeverest.com/health")
print("Health check:", result.get('stdout', result.get('error', 'No output')))

print("\n✅ Backend restoration complete!")
print(f"Backend is now running commit {TARGET_COMMIT}")
