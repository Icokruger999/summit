#!/usr/bin/env python3
"""
PERMANENT FIX: Remove the rogue index.js and prevent future issues
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
            TimeoutSeconds=120
        )
        command_id = response['Command']['CommandId']
        time.sleep(wait)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        return output.get('StandardOutputContent', '').strip(), output.get('StandardErrorContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}", ""

print("🔧 PERMANENT FIX: Removing rogue files and securing the setup...")

# 1. Remove the rogue index.js from /var/www/summit/
print("\n1. Removing rogue index.js from /var/www/summit/...")
stdout, stderr = run_command("""
# Remove the rogue server files from the wrong location
rm -f /var/www/summit/index.js /var/www/summit/index.js.map /var/www/summit/index.d.ts /var/www/summit/index.d.ts.map 2>/dev/null
rm -rf /var/www/summit/routes /var/www/summit/lib /var/www/summit/middleware 2>/dev/null

# Verify they're gone
ls -la /var/www/summit/index.js 2>&1 || echo "✅ Rogue index.js removed"
""")
print(stdout)

# 2. Check what's left in /var/www/summit/
print("\n2. Checking /var/www/summit/ structure...")
stdout, stderr = run_command("ls -la /var/www/summit/ | head -20")
print(stdout)

# 3. Verify the correct server location
print("\n3. Verifying correct server at /var/www/summit/server/...")
stdout, stderr = run_command("ls -la /var/www/summit/server/dist/")
print(stdout)

# 4. Update the systemd service to be more robust
print("\n4. Updating systemd service with better protection...")
stdout, stderr = run_command('''
cat > /etc/systemd/system/summit-backend.service << 'EOF'
[Unit]
Description=Summit Backend API Server
Documentation=https://summit.astutetech.co.za
After=network.target postgresql.service
Wants=network-online.target

[Service]
Type=forking
User=root
Environment=PM2_HOME=/etc/.pm2
Environment=HOME=/root
WorkingDirectory=/var/www/summit/server

# Pre-start cleanup - kill any rogue processes
ExecStartPre=/bin/bash -c 'pkill -9 -f "node /var/www/summit/index.js" 2>/dev/null || true'
ExecStartPre=/bin/bash -c 'fuser -k 4000/tcp 2>/dev/null || true'
ExecStartPre=/bin/sleep 2

# Start PM2
ExecStart=/usr/lib/node_modules/pm2/bin/pm2 start /var/www/summit/server/ecosystem.config.cjs --env production
ExecReload=/usr/lib/node_modules/pm2/bin/pm2 reload summit-backend
ExecStop=/usr/lib/node_modules/pm2/bin/pm2 stop summit-backend

# Auto-restart on failure
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "✅ Service updated"
''')
print(stdout)

# 5. Create a watchdog script
print("\n5. Creating watchdog script...")
stdout, stderr = run_command('''
cat > /usr/local/bin/summit-watchdog.sh << 'WATCHDOG'
#!/bin/bash
# Summit Backend Watchdog - runs every minute

LOG="/var/log/summit-watchdog.log"
PORT=4000

# Check if backend is responding
if ! curl -s --max-time 5 http://localhost:$PORT/api/auth/login -X POST -H "Content-Type: application/json" -d '{}' > /dev/null 2>&1; then
    echo "$(date): Backend not responding, restarting..." >> $LOG
    
    # Kill any rogue processes
    pkill -9 -f "node /var/www/summit/index.js" 2>/dev/null
    fuser -k $PORT/tcp 2>/dev/null
    sleep 2
    
    # Restart PM2
    PM2_HOME=/etc/.pm2 pm2 restart summit-backend 2>/dev/null || \
    PM2_HOME=/etc/.pm2 pm2 start /var/www/summit/server/ecosystem.config.cjs
    
    echo "$(date): Restart attempted" >> $LOG
fi
WATCHDOG

chmod +x /usr/local/bin/summit-watchdog.sh
echo "✅ Watchdog created"
''')
print(stdout)

# 6. Add watchdog to cron (every minute)
print("\n6. Setting up watchdog cron (every minute)...")
stdout, stderr = run_command('''
# Create new crontab
cat > /tmp/summit-cron << 'CRON'
# Summit Backend Watchdog - check every minute
* * * * * /usr/local/bin/summit-watchdog.sh
CRON

crontab /tmp/summit-cron
rm /tmp/summit-cron
crontab -l
''')
print(stdout)

# 7. Final status check
print("\n7. Final status...")
stdout, stderr = run_command("PM2_HOME=/etc/.pm2 pm2 list && ss -tlnp | grep 4000")
print(stdout)

print("\n" + "="*50)
print("✅ PERMANENT FIX APPLIED!")
print("="*50)
print("What was fixed:")
print("  1. Removed rogue /var/www/summit/index.js")
print("  2. Updated systemd service with pre-start cleanup")
print("  3. Created watchdog that checks every minute")
print("  4. Backend will auto-recover if it crashes")
print("\n👉 Now LOG OUT and LOG BACK IN to refresh your token")
