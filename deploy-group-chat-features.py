#!/usr/bin/env python3
import boto3
import subprocess
import time

instance_id = "i-0fba58db502cc8d39"
region = "eu-west-1"

print("DEPLOYING GROUP CHAT FEATURES")
print("=" * 60)

# Build the TypeScript file locally
print("\n1. Building chats.ts locally...")
result = subprocess.run(
    ["npx", "tsc", "server/src/routes/chats.ts", "--outDir", "server/dist/routes", "--module", "esnext", "--target", "es2020", "--moduleResolution", "node"],
    cwd="summit",
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print("Error building TypeScript:")
    print(result.stderr)
    exit(1)

print("✅ TypeScript compiled successfully")

# Read the compiled file
with open("summit/server/dist/routes/chats.js", "r") as f:
    chats_js_content = f.read()

print(f"✅ Read compiled file ({len(chats_js_content)} bytes)")

# Deploy to EC2
ssm = boto3.client('ssm', region_name=region)

# Create the file on the server
deploy_cmd = f'''
# Backup current file
cp /var/www/summit/dist/routes/chats.js /var/www/summit/dist/routes/chats.js.backup

# Create new file
cat > /var/www/summit/dist/routes/chats.js << 'CHATS_EOF'
{chats_js_content}
CHATS_EOF

echo "File deployed"
ls -lah /var/www/summit/dist/routes/chats.js
'''

print("\n2. Deploying to EC2...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [deploy_cmd]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(3)

try:
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id,
    )
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("STDERR:", output['StandardErrorContent'])
except Exception as e:
    print(f"Error: {e}")

# Restart PM2
restart_cmd = '''
export HOME=/home/ubuntu
pm2 restart summit-backend
sleep 3
pm2 status
'''

print("\n3. Restarting PM2...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [restart_cmd]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(5)

try:
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id,
    )
    print(output['StandardOutputContent'])
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*60)
print("DEPLOYMENT COMPLETE")
print("="*60)
