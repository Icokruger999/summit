#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=10):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=120
        )
        command_id = response['Command']['CommandId']
        time.sleep(wait)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        stdout = output.get('StandardOutputContent', '').strip()
        stderr = output.get('StandardErrorContent', '').strip()
        return stdout, stderr
    except Exception as e:
        return f"Error: {str(e)}", ""

print("🧹 CLEANING UP ALL PM2 INSTANCES...")

# 1. Kill ALL PM2 daemons and node processes
print("\n1. Killing ALL PM2 daemons and node processes...")
stdout, stderr = run_command("""
# Kill all PM2 daemons
PM2_HOME=/home/ubuntu/.pm2 pm2 kill 2>/dev/null
PM2_HOME=/root/.pm2 pm2 kill 2>/dev/null
PM2_HOME=/etc/.pm2 pm2 kill 2>/dev/null

# Kill any remaining node processes
pkill -9 -f 'node' 2>/dev/null
pkill -9 -f 'PM2' 2>/dev/null

sleep 3
echo "All killed"
""", wait=15)
print(stdout)

# 2. Verify nothing is running
print("\n2. Verifying nothing is running...")
stdout, stderr = run_command("ps aux | grep -E 'node|pm2|PM2' | grep -v grep || echo 'All clear'")
print(stdout)

# 3. Clean up old PM2 dump files
print("\n3. Cleaning up old PM2 dump files...")
stdout, stderr = run_command("""
rm -f /home/ubuntu/.pm2/dump.pm2 2>/dev/null
rm -f /root/.pm2/dump.pm2 2>/dev/null
# Keep /etc/.pm2 as the main one
echo "Cleaned"
""")
print(stdout)

# 4. Start PM2 with correct HOME
print("\n4. Starting PM2 with correct config...")
stdout, stderr = run_command("""
export HOME=/root
export PM2_HOME=/etc/.pm2
cd /var/www/summit/server && \
pm2 start ecosystem.config.cjs && \
pm2 save && \
pm2 startup systemd -u root --hp /root 2>&1 | tail -3
""", wait=15)
print(stdout)

# 5. Check status
print("\n5. PM2 Status...")
stdout, stderr = run_command("PM2_HOME=/etc/.pm2 pm2 list")
print(stdout)

# 6. Check ports
print("\n6. Checking ports...")
stdout, stderr = run_command("ss -tlnp | grep -E '4000|3000' || netstat -tlnp | grep -E '4000|3000'")
print(f"Ports: {stdout}")

# 7. Test API
print("\n7. Testing API...")
stdout, stderr = run_command('''curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Summit@2024"}' ''')
print(f"Login: {stdout[:150] if stdout else 'No response'}...")
