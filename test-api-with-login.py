#!/usr/bin/env python3
"""Test API endpoints after fix"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Test the API locally on the server
test_cmd = '''
cd /var/www/summit/server

# Create a test script
cat > /tmp/test-api.cjs << 'SCRIPT'
const http = require('http');

// Test login
const loginData = JSON.stringify({
  email: 'ico@astutetech.co.za',
  password: 'Test123!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('Testing login...');
const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Login status:', res.statusCode);
    console.log('Login response:', data.substring(0, 200));
    
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      const token = json.token;
      console.log('Got token!');
      
      // Test chats endpoint
      const chatsOptions = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/chats',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      };
      
      console.log('\\nTesting /api/chats...');
      const chatsReq = http.request(chatsOptions, (chatsRes) => {
        let chatsData = '';
        chatsRes.on('data', chunk => chatsData += chunk);
        chatsRes.on('end', () => {
          console.log('Chats status:', chatsRes.statusCode);
          console.log('Chats response:', chatsData.substring(0, 500));
        });
      });
      chatsReq.on('error', e => console.error('Chats error:', e.message));
      chatsReq.end();
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e.message);
});

loginReq.write(loginData);
loginReq.end();
SCRIPT

node /tmp/test-api.cjs
'''

print("Testing API...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [test_cmd]},
    TimeoutSeconds=30
)
command_id = response['Command']['CommandId']
time.sleep(8)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")
