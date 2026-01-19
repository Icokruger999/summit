import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command, timeout=60):
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=timeout
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("=" * 60)
print("TESTING ALL BACKUP FILES")
print("=" * 60)

# List all backups
stdout = run_command("""
ls -lh /var/www/summit/*.backup* | grep "Jan 18" | awk '{print $9, $5}' | sort -k2 -rn
""")
print("\nBackup files (sorted by size):")
print(stdout)

# Test each backup
backups_to_test = [
    "index.js.backup-before-endpoint-fix",  # Jan 18 17:40 - 24K
    "index.js.backup-before-chime-handlers",  # Jan 18 17:37 - 23K
    "index.js.backup-before-chime-v2",  # Jan 18 15:31 - 19K
    "index.js.backup-typing",  # Jan 17 18:29 - 17K
]

for backup in backups_to_test:
    print(f"\n{'=' * 60}")
    print(f"Testing: {backup}")
    print('=' * 60)
    
    stdout = run_command(f"""
# Use backup
sudo cp /var/www/summit/{backup} /var/www/summit/index.js

# Restart PM2
pm2 restart summit-backend
sleep 3

# Test
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{{"email":"ico@astutetech.co.za","password":"Stacey@1122"}}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
else
  echo "✅ Login successful"
  echo "Testing chats endpoint..."
  RESPONSE=$(curl -s http://localhost:4000/api/chats \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Chats endpoint returned error: $RESPONSE"
  else
    echo "✅ Chats endpoint working!"
    echo "Response: $RESPONSE"
  fi
fi
""")
    
    print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
