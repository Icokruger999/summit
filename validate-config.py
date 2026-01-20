#!/usr/bin/env python3
"""
Validate production configuration before deployment
Run this before any deployment to catch errors early
"""
import boto3
import time
import sys

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
    
    return output.get('StandardOutputContent', '').strip(), output.get('StandardErrorContent', '').strip()

print("🔍 VALIDATING PRODUCTION CONFIGURATION")
print("=" * 60)

all_passed = True

# Check 1: Chime region syntax
print("\n1. Checking Chime SDK region configuration...")
stdout, stderr = run_command("grep -n 'region:' /var/www/summit/index.js | head -1")
if "'us-east-1'" in stdout or '"us-east-1"' in stdout:
    print("   ✅ Region has quotes: CORRECT")
else:
    print("   ❌ Region missing quotes: INCORRECT")
    print(f"   Found: {stdout}")
    all_passed = False

# Check 2: Server port
print("\n2. Checking server port configuration...")
stdout, stderr = run_command("grep -n 'const PORT' /var/www/summit/index.js")
if "4000" in stdout:
    print("   ✅ Server port 4000: CORRECT")
else:
    print("   ❌ Server port incorrect")
    print(f"   Found: {stdout}")
    all_passed = False

# Check 3: Nginx proxy configuration
print("\n3. Checking nginx proxy configuration...")
stdout, stderr = run_command("grep 'proxy_pass' /etc/nginx/sites-enabled/summit.api.codingeverest.com | head -1")
if "127.0.0.1:4000" in stdout:
    print("   ✅ Nginx proxies to port 4000: CORRECT")
else:
    print("   ❌ Nginx proxy configuration incorrect")
    print(f"   Found: {stdout}")
    all_passed = False

# Check 4: Database configuration
print("\n4. Checking database configuration...")
stdout, stderr = run_command("grep -n 'DB_PORT' /var/www/summit/.env")
if "6432" in stdout:
    print("   ✅ Database port 6432 (PgBouncer): CORRECT")
else:
    print("   ⚠️  Database port may be incorrect")
    print(f"   Found: {stdout}")

# Check 5: JWT Secret exists
print("\n5. Checking JWT secret...")
stdout, stderr = run_command("grep -c 'JWT_SECRET=' /var/www/summit/.env")
if int(stdout.strip()) > 0:
    print("   ✅ JWT secret configured: CORRECT")
else:
    print("   ❌ JWT secret missing")
    all_passed = False

# Check 6: PM2 ecosystem config
print("\n6. Checking PM2 is running...")
stdout, stderr = run_command("pm2 status | grep summit")
if "online" in stdout:
    print("   ✅ PM2 process online: CORRECT")
else:
    print("   ⚠️  PM2 process not online")
    print(f"   Status: {stdout}")

# Check 7: Server is actually listening
print("\n7. Checking if server is listening on port 4000...")
stdout, stderr = run_command("netstat -tlnp | grep :4000")
if ":4000" in stdout:
    print("   ✅ Server listening on port 4000: CORRECT")
else:
    print("   ⚠️  Server not listening on port 4000")

# Check 8: Nginx is running
print("\n8. Checking nginx status...")
stdout, stderr = run_command("systemctl is-active nginx")
if "active" in stdout:
    print("   ✅ Nginx running: CORRECT")
else:
    print("   ❌ Nginx not running")
    all_passed = False

print("\n" + "=" * 60)
if all_passed:
    print("✅ ALL CRITICAL VALIDATIONS PASSED")
    print("\nConfiguration is safe for production.")
    sys.exit(0)
else:
    print("❌ VALIDATION FAILED")
    print("\nDO NOT DEPLOY - Fix errors first!")
    sys.exit(1)
