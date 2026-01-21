#!/usr/bin/env python3
import boto3
import time
import base64

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🚀 Deploying Updated Presence Route")

# Read the built presence.js file
with open("summit/server/dist/routes/presence.js", "r") as f:
    presence_code = f.read()

# Base64 encode to safely transfer
presence_b64 = base64.b64encode(presence_code.encode()).decode()

command = f"""
export HOME=/home/ubuntu

echo "=== Backup current presence route ==="
cp /var/www/summit/dist/routes/presence.js /var/www/summit/dist/routes/presence.js.backup-$(date +%s)

echo ""
echo "=== Deploy new presence route ==="
echo "{presence_b64}" | base64 -d > /var/www/summit/dist/routes/presence.js

echo ""
echo "=== Verify deployment ==="
echo "File size:"
ls -lh /var/www/summit/dist/routes/presence.js

echo ""
echo "Check for computeActualStatus function:"
grep -c "computeActualStatus" /var/www/summit/dist/routes/presence.js || echo "Function not found!"

echo ""
echo "Check thresholds:"
grep "THRESHOLD" /var/www/summit/dist/routes/presence.js

echo ""
echo "=== Restart PM2 ==="
pm2 restart summit-backend
sleep 5

echo ""
echo "=== Check PM2 status ==="
pm2 list

echo ""
echo "=== Test presence API ==="
sleep 3
curl -s http://localhost:4000/health
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    
    time.sleep(15)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("\n=== STDERR ===")
        print(output['StandardErrorContent'])
    
    print("\n" + "="*60)
    print("✅ Deployment complete! Testing from outside...")
    print("="*60)
    
    # Test the API
    import requests
    time.sleep(3)
    
    try:
        # Login
        login_r = requests.post(
            "https://summit.api.codingeverest.com/api/auth/login",
            json={"email": "ico@astutetech.co.za", "password": "Stacey@1122"},
            timeout=10
        )
        if login_r.status_code == 200:
            token = login_r.json()["token"]
            
            # Test presence
            presence_r = requests.post(
                "https://summit.api.codingeverest.com/api/presence/batch",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"userIds": ["3958a577-dbe3-4d61-9966-49a1c10c0f79"]},  # Leonie - should be offline
                timeout=10
            )
            print(f"\nPresence API Status: {presence_r.status_code}")
            if presence_r.status_code == 200:
                data = presence_r.json()
                leonie_status = data.get("3958a577-dbe3-4d61-9966-49a1c10c0f79", {}).get("status")
                print(f"Leonie's status: {leonie_status}")
                if leonie_status == "offline":
                    print("✅✅✅ PRESENCE LOGIC IS WORKING! ✅✅✅")
                else:
                    print(f"⚠️  Expected 'offline' but got '{leonie_status}'")
            else:
                print(f"Response: {presence_r.text[:200]}")
    except Exception as e:
        print(f"Error testing: {e}")
    
except Exception as e:
    print(f"Error: {e}")
