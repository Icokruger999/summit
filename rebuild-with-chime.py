#!/usr/bin/env python3
"""
Rebuild backend with chime routes
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
        TimeoutSeconds=120
    )
    command_id = response['Command']['CommandId']
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🔧 REBUILDING BACKEND WITH CHIME ROUTES")
print("=" * 60)

print("\n1. Pulling latest code...")
stdout = run_command("cd /var/www/summit-repo && git fetch && git reset --hard origin/main")
print("   ✅ Code updated")

print("\n2. Checking if chime.ts exists in source...")
stdout = run_command("ls -la /var/www/summit-repo/server/src/routes/chime.ts")
print(stdout)

print("\n3. Cleaning old build...")
stdout = run_command("cd /var/www/summit-repo/server && rm -rf dist && rm -rf node_modules/.cache")
print("   ✅ Cleaned")

print("\n4. Installing dependencies...")
stdout = run_command("cd /var/www/summit-repo/server && npm install")
print("   ✅ Installed")

print("\n5. Building TypeScript...")
stdout = run_command("cd /var/www/summit-repo/server && npm run build 2>&1")
print(stdout[-500:] if len(stdout) > 500 else stdout)

print("\n6. Checking if chime.js was built...")
stdout = run_command("ls -la /var/www/summit-repo/server/dist/routes/chime.js")
print(stdout)

print("\n7. Copying to production...")
stdout = run_command("cp -r /var/www/summit-repo/server/dist/* /var/www/summit/")
print("   ✅ Copied")

print("\n8. Verifying chime.js in production...")
stdout = run_command("ls -la /var/www/summit/routes/chime.js")
print(stdout)

print("\n9. Restarting PM2...")
stdout = run_command("pm2 restart summit")
print("   ✅ Restarted")

print("\n10. Waiting...")
time.sleep(5)

print("\n11. Testing notify endpoint...")
stdout = run_command("curl -s http://localhost:4000/api/chime/notify")
print(stdout[:200])

print("\n" + "=" * 60)
print("✅ REBUILD COMPLETE")
