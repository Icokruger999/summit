#!/usr/bin/env python3
"""
Test persistent notifications system
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu

echo "=== Check notifications table ==="
sudo -u postgres psql -d summit -c "SELECT COUNT(*) as total_notifications FROM notifications;"

echo ""
echo "=== Recent notifications ==="
sudo -u postgres psql -d summit -c "
SELECT 
  n.id,
  u.name as user_name,
  n.type,
  n.title,
  n.message,
  n.read,
  n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 10;
"

echo ""
echo "=== Unread notifications by user ==="
sudo -u postgres psql -d summit -c "
SELECT 
  u.name as user_name,
  COUNT(*) as unread_count
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.read = FALSE
GROUP BY u.name
ORDER BY unread_count DESC;
"

echo ""
echo "=== Test notifications API endpoint ==="
curl -s http://localhost:4000/health
"""

print("🧪 Testing persistent notifications system...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

time.sleep(4)

output = ssm.get_command_invocation(
    CommandId=response['Command']['CommandId'],
    InstanceId=INSTANCE_ID
)

print(output['StandardOutputContent'])

print("\n✅ Test complete!")
print("\nNow try:")
print("1. Create a new group with Stacey (who is offline)")
print("2. Check if notification is saved to database")
print("3. Have Stacey log in and see if she gets the notification")
