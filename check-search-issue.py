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
        
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("Checking user passwords...")
result = run_command("cd /var/www/summit && PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c \"SELECT email, password_hash IS NOT NULL as has_password FROM users;\"")
print("User passwords:", result)

print("\nTesting search API directly with Node.js...")
result = run_command('cd /var/www/summit && node -e "const { Pool } = require(\'pg\'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query(\'SELECT id, email, name FROM users WHERE LOWER(email) = LOWER($1)\', [\'thechihuahua01@gmail.com\']).then(r => console.log(\'Direct DB search:\', r.rows)).catch(e => console.log(\'Error:\', e.message));"')
print("Direct search:", result)