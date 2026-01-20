#!/usr/bin/env python3
"""Test bcrypt comparison on server"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Test bcrypt comparison directly on the server
cmd = '''
cd /var/www/summit/server && node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 6432,
  database: 'summit',
  user: 'summit_user',
  password: 'KUQoTLZJcHN0YYXS6qiGJS9B7'
});

async function test() {
  const result = await pool.query('SELECT email, password_hash FROM users WHERE email = $1', ['ico@astutetech.co.za']);
  if (result.rows.length === 0) {
    console.log('User not found');
    return;
  }
  const user = result.rows[0];
  console.log('User:', user.email);
  console.log('Hash:', user.password_hash);
  
  const testPasswords = ['Test123!', 'test123!', 'Test123', 'password'];
  for (const pwd of testPasswords) {
    const match = await bcrypt.compare(pwd, user.password_hash);
    console.log('Password:', pwd, '-> Match:', match);
  }
  
  await pool.end();
}

test().catch(console.error);
"
'''

print("Testing bcrypt comparison...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [cmd]},
    TimeoutSeconds=30
)
command_id = response['Command']['CommandId']
time.sleep(5)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")
