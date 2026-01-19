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

print("1. Checking current users...")
result = run_command("cd /var/www/summit && node -e \"const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT COUNT(*) FROM users').then(r => console.log('Total users:', r.rows[0].count)).catch(e => console.log('Error:', e.message));\"")
print("Current users:", result)

print("\n2. Deleting all users...")
result = run_command("cd /var/www/summit && node -e \"const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('DELETE FROM users').then(r => console.log('Deleted', r.rowCount, 'users')).catch(e => console.log('Error:', e.message));\"")
print("Delete result:", result)

print("\n3. Verifying deletion...")
result = run_command("cd /var/www/summit && node -e \"const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT COUNT(*) FROM users').then(r => console.log('Remaining users:', r.rows[0].count)).catch(e => console.log('Error:', e.message));\"")
print("Verification:", result)