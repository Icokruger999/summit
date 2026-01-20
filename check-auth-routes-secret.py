#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=5):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=60
        )
        command_id = response['Command']['CommandId']
        time.sleep(wait)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("Checking auth routes JWT_SECRET...")

# Check the auth routes file
print("\n1. Auth routes JWT_SECRET line:")
stdout = run_command("grep -n 'JWT_SECRET' /var/www/summit/server/dist/routes/auth.js")
print(stdout)

# Add debug logging to auth routes
print("\n2. Adding debug to auth routes login...")
stdout = run_command('''
cd /var/www/summit/server/dist/routes

# Check current login code
grep -A5 "jwt.sign" auth.js
''')
print(stdout)

# Patch auth routes to log the secret being used
print("\n3. Patching auth routes to log secret...")
stdout = run_command('''
cd /var/www/summit/server/dist/routes

# Add debug logging before jwt.sign
sed -i 's/const token = jwt.sign/console.log("🔑 Creating token with JWT_SECRET:", JWT_SECRET ? JWT_SECRET.substring(0, 10) + "..." : "UNDEFINED"); const token = jwt.sign/' auth.js

# Verify the change
grep -B1 "jwt.sign" auth.js | head -5
''')
print(stdout)

# Restart and test
print("\n4. Restarting PM2...")
stdout = run_command("PM2_HOME=/etc/.pm2 pm2 restart summit-backend; sleep 3")
print("Restarted")

print("\n5. Testing login and checking logs...")
stdout = run_command('''
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' > /dev/null

PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 10 --nostream 2>&1 | grep -E "🔑|🔐|Creating token"
''')
print(stdout)
