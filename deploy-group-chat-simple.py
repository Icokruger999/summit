#!/usr/bin/env python3
import boto3
import time

instance_id = "i-0fba58db502cc8d39"
region = "eu-west-1"

ssm = boto3.client('ssm', region_name=region)

print("DEPLOYING GROUP CHAT FEATURES")
print("=" * 60)

# Read the TypeScript source
with open("summit/server/src/routes/chats.ts", "r", encoding="utf-8") as f:
    chats_ts_content = f.read()

# Upload and compile on server
deploy_cmd = f'''
# Backup
cp /var/www/summit/dist/routes/chats.js /var/www/summit/dist/routes/chats.js.backup

# Upload TypeScript source
cat > /tmp/chats.ts << 'CHATS_TS_EOF'
{chats_ts_content}
CHATS_TS_EOF

# Compile it
cd /var/www/summit
npx tsc /tmp/chats.ts --outDir /var/www/summit/dist/routes --module esnext --target es2020 --moduleResolution node --esModuleInterop

echo "Compiled and deployed"
ls -lah /var/www/summit/dist/routes/chats.js
'''

print("\n1. Deploying and compiling on EC2...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [deploy_cmd]},
    TimeoutSeconds=60
)

command_id = response['Command']['CommandId']
time.sleep(5)

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

print("\n2. Restarting PM2...")
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
