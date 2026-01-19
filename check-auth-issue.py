#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    try:
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
        
        stdout = output.get('StandardOutputContent', '').strip()
        stderr = output.get('StandardErrorContent', '').strip()
        return {'stdout': stdout, 'stderr': stderr}
    except Exception as e:
        return {'error': str(e)}

print("=== CHECKING DATABASE CONNECTION ===")
result = run_command("cd /var/www/summit && node -e \"const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT COUNT(*) FROM users').then(r => console.log('Users:', r.rows[0].count)).catch(e => console.log('DB Error:', e.message));\"")
if result.get('stdout'):
    print("Database:", result['stdout'])
if result.get('stderr'):
    print("DB Error:", result['stderr'])

print("\n=== CHECKING JWT SECRET ===")
result = run_command("cd /var/www/summit && echo $JWT_SECRET | wc -c")
if result.get('stdout'):
    jwt_len = result['stdout'].strip()
    print(f"JWT Secret length: {jwt_len} chars")
    if int(jwt_len) < 10:
        print("WARNING: JWT Secret too short or missing!")

print("\n=== CHECKING PM2 PROCESS ===")
result = run_command("pm2 describe summit")
if result.get('stdout'):
    if 'online' in result['stdout'].lower():
        print("PM2: Process is online")
    else:
        print("PM2: Process may be down")
        print(result['stdout'][:200])