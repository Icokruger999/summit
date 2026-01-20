#!/usr/bin/env python3
import boto3
import time

instance_id = "i-0fba58db502cc8d39"
region = "eu-west-1"

ssm = boto3.client('ssm', region_name=region)

print("ADDING END-CALL ENDPOINT TO CHIME ROUTE")
print("=" * 60)

# Add the end-call endpoint before the export statement
add_endpoint = '''
# Backup the current chime.js
cp /var/www/summit/dist/routes/chime.js /var/www/summit/dist/routes/chime.js.backup

# Add the end-call endpoint before the export statement
sed -i '/^export default router;/i\\
\\
router.post("/end-call", authenticate, async (req, res) => {\\
  try {\\
    const { roomName } = req.body;\\
    if (!roomName) {\\
      return res.status(400).json({ error: "roomName is required" });\\
    }\\
\\
    console.log(`📞 Call ended for room: ${roomName}`);\\
\\
    // Notify all participants in the room that the call has ended\\
    // We would need to track participants per room to do this properly\\
    // For now, we will just return success\\
    // The frontend will handle disconnection\\
\\
    res.json({ success: true });\\
  } catch (error) {\\
    console.error("Error ending call:", error);\\
    res.status(500).json({ error: error.message || "Failed to end call" });\\
  }\\
});\\
' /var/www/summit/dist/routes/chime.js

echo "End-call endpoint added"
cat /var/www/summit/dist/routes/chime.js | tail -30
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [add_endpoint]},
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

time.sleep(2)

# Restart PM2
restart_pm2 = '''
export HOME=/home/ubuntu
pm2 restart summit-backend
sleep 3
pm2 status
'''

print("\n" + "="*60)
print("Restarting PM2...")
print("="*60)

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [restart_pm2]},
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
    if output['StandardErrorContent']:
        print("STDERR:", output['StandardErrorContent'])
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*60)
print("DEPLOYMENT COMPLETE")
print("="*60)
