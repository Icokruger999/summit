#!/usr/bin/env python3
"""
Sets up a stable PM2 configuration that:
1. Uses only ONE PM2 home directory (/etc/.pm2)
2. Auto-restarts on server reboot
3. Prevents duplicate processes
"""
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
            TimeoutSeconds=180
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

print("🔧 Setting up stable PM2 configuration...")

# 1. Create a proper systemd service for PM2
print("\n1. Creating systemd service for PM2...")
stdout, stderr = run_command('''
cat > /etc/systemd/system/summit-backend.service << 'EOF'
[Unit]
Description=Summit Backend API Server
Documentation=https://summit.astutetech.co.za
After=network.target postgresql.service

[Service]
Type=forking
User=root
Environment=PM2_HOME=/etc/.pm2
Environment=HOME=/root
WorkingDirectory=/var/www/summit/server

# Kill any rogue processes before starting
ExecStartPre=/bin/bash -c 'pkill -9 -f "node /var/www/summit/index.js" 2>/dev/null || true'
ExecStartPre=/bin/bash -c 'PM2_HOME=/home/ubuntu/.pm2 pm2 kill 2>/dev/null || true'
ExecStartPre=/bin/bash -c 'PM2_HOME=/root/.pm2 pm2 kill 2>/dev/null || true'

# Start PM2 with the correct config
ExecStart=/usr/lib/node_modules/pm2/bin/pm2 start /var/www/summit/server/ecosystem.config.cjs --env production
ExecReload=/usr/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/usr/lib/node_modules/pm2/bin/pm2 kill

# Restart on failure
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
echo "Service file created"
''')
print(stdout)

# 2. Disable old PM2 startup services
print("\n2. Disabling old PM2 services...")
stdout, stderr = run_command('''
systemctl disable pm2-root.service 2>/dev/null || true
systemctl disable pm2-ubuntu.service 2>/dev/null || true
systemctl stop pm2-root.service 2>/dev/null || true
systemctl stop pm2-ubuntu.service 2>/dev/null || true
echo "Old services disabled"
''')
print(stdout)

# 3. Enable the new service
print("\n3. Enabling summit-backend service...")
stdout, stderr = run_command('''
systemctl daemon-reload
systemctl enable summit-backend.service
echo "Service enabled"
''')
print(stdout)

# 4. Create a cleanup script that runs on boot
print("\n4. Creating boot cleanup script...")
stdout, stderr = run_command('''
cat > /usr/local/bin/summit-cleanup.sh << 'EOF'
#!/bin/bash
# Kill any rogue node processes not managed by PM2
for pid in $(pgrep -f "node /var/www/summit/index.js"); do
    # Check if this is managed by PM2
    if ! pm2 pid summit-backend | grep -q "$pid"; then
        kill -9 $pid 2>/dev/null
    fi
done
EOF
chmod +x /usr/local/bin/summit-cleanup.sh
echo "Cleanup script created"
''')
print(stdout)

# 5. Add cleanup to cron (runs every 5 minutes)
print("\n5. Setting up monitoring cron job...")
stdout, stderr = run_command('''
# Remove old cron entries
crontab -l 2>/dev/null | grep -v summit-cleanup > /tmp/crontab.tmp || true
# Add new entry
echo "*/5 * * * * /usr/local/bin/summit-cleanup.sh >> /var/log/summit-cleanup.log 2>&1" >> /tmp/crontab.tmp
crontab /tmp/crontab.tmp
rm /tmp/crontab.tmp
echo "Cron job added"
''')
print(stdout)

# 6. Verify current status
print("\n6. Current status...")
stdout, stderr = run_command("PM2_HOME=/etc/.pm2 pm2 list")
print(stdout)

print("\n✅ Stable PM2 setup complete!")
print("The backend will now:")
print("  - Auto-start on server reboot")
print("  - Kill rogue processes before starting")
print("  - Be monitored every 5 minutes")
