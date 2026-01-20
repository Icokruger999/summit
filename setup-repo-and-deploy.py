#!/usr/bin/env python3
"""
Setup repo and deploy chime routes
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, timeout=60):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=timeout
    )
    command_id = response['Command']['CommandId']
    time.sleep(10)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🚀 SETUP AND DEPLOY CHIME ROUTES")
print("=" * 60)

print("\n1. Cloning/updating repo...")
stdout = run_command("""
if [ ! -d "/var/www/summit-repo" ]; then
  cd /var/www
  git clone https://github.com/Icokruger999/summit.git summit-repo
else
  cd /var/www/summit-repo
  git fetch
  git reset --hard origin/main
fi
""", 120)
print("   ✅ Repo ready")

print("\n2. Verifying chime.ts exists...")
stdout = run_command("test -f /var/www/summit-repo/server/src/routes/chime.ts && echo 'EXISTS' || echo 'NOT FOUND'")
print(f"   {stdout}")

print("\n3. Building...")
stdout = run_command("cd /var/www/summit-repo/server && npm install && npm run build", 120)
print("   ✅ Built")

print("\n4. Copying to production...")
stdout = run_command("cp -r /var/www/summit-repo/server/dist/* /var/www/summit/")
print("   ✅ Copied")

print("\n5. Restarting...")
stdout = run_command("pm2 restart summit")
print("   ✅ Restarted")

time.sleep(5)

print("\n6. Testing...")
stdout = run_command("curl -s http://localhost:4000/health")
print(f"   {stdout}")

print("\n" + "=" * 60)
print("✅ DEPLOYED")
