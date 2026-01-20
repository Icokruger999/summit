#!/usr/bin/env python3
"""
Protect critical production files from accidental modification
Run this after every deployment to lock down configuration files
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🔒 PROTECTING PRODUCTION FILES")
print("=" * 60)

# Create backup of current working configuration
print("\n1. Creating backup of working configuration...")
stdout = run_command("""
cd /var/www/summit
cp index.js index.js.WORKING_BACKUP_$(date +%Y%m%d_%H%M%S)
cp .env .env.WORKING_BACKUP_$(date +%Y%m%d_%H%M%S)
echo "Backups created"
""")
print(stdout)

# Make files read-only (but keep writable by root for emergency fixes)
print("\n2. Setting file permissions to read-only...")
stdout = run_command("""
cd /var/www/summit
chmod 444 index.js
chmod 440 .env
echo "Files protected"
""")
print(stdout)

# Protect nginx configuration
print("\n3. Protecting nginx configuration...")
stdout = run_command("""
chmod 444 /etc/nginx/sites-enabled/summit.api.codingeverest.com
echo "Nginx config protected"
""")
print(stdout)

# Create a validation script on the server
print("\n4. Creating validation script on server...")
stdout = run_command("""
cat > /var/www/summit/validate.sh << 'EOF'
#!/bin/bash
# Validate critical configuration values

echo "Validating production configuration..."

# Check if index.js has correct region syntax
if grep -q "region: 'us-east-1'" /var/www/summit/index.js; then
    echo "✅ Chime region: CORRECT"
else
    echo "❌ Chime region: INCORRECT - Missing quotes!"
    exit 1
fi

# Check if server is listening on port 4000
if netstat -tlnp | grep -q ":4000"; then
    echo "✅ Server port 4000: LISTENING"
else
    echo "❌ Server port 4000: NOT LISTENING"
    exit 1
fi

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: RUNNING"
else
    echo "❌ Nginx: NOT RUNNING"
    exit 1
fi

# Check if PM2 process is online
if pm2 status | grep -q "online"; then
    echo "✅ PM2 process: ONLINE"
else
    echo "❌ PM2 process: NOT ONLINE"
    exit 1
fi

echo ""
echo "All validations passed!"
EOF

chmod +x /var/www/summit/validate.sh
echo "Validation script created"
""")
print(stdout)

# Run validation
print("\n5. Running validation...")
stdout = run_command("/var/www/summit/validate.sh")
print(stdout)

print("\n" + "=" * 60)
print("✅ PROTECTION COMPLETE")
print("\nCritical files are now protected from accidental modification.")
print("To make emergency changes, you must explicitly change permissions first.")
