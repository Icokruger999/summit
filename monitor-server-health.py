#!/usr/bin/env python3
"""
Continuous server health monitoring
Checks server status and auto-restarts if needed
Run this in background or as a scheduled task
"""
import boto3
import time
import requests
from datetime import datetime

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'
HEALTH_URL = 'https://summit.api.codingeverest.com/health'
CHECK_INTERVAL = 300  # 5 minutes

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

def check_health():
    """Check if server is responding"""
    try:
        response = requests.get(HEALTH_URL, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'ok':
                return True, "Server healthy"
        return False, f"Unhealthy response: {response.status_code}"
    except Exception as e:
        return False, f"Connection failed: {str(e)}"

def restart_server():
    """Restart the PM2 process"""
    print(f"[{datetime.now()}] 🔄 Attempting to restart server...")
    stdout = run_command("cd /var/www/summit && pm2 restart summit")
    print(stdout)
    time.sleep(10)  # Wait for server to start

def validate_config():
    """Validate critical configuration"""
    stdout = run_command("/var/www/summit/validate.sh 2>&1")
    return "All validations passed" in stdout, stdout

def main():
    print("🔍 SERVER HEALTH MONITOR STARTED")
    print(f"Checking every {CHECK_INTERVAL} seconds")
    print("=" * 60)
    
    consecutive_failures = 0
    
    while True:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Check health
        is_healthy, message = check_health()
        
        if is_healthy:
            print(f"[{timestamp}] ✅ {message}")
            consecutive_failures = 0
        else:
            consecutive_failures += 1
            print(f"[{timestamp}] ❌ {message} (Failure #{consecutive_failures})")
            
            # Auto-restart after 2 consecutive failures
            if consecutive_failures >= 2:
                print(f"[{timestamp}] 🚨 CRITICAL: Server down, attempting restart...")
                
                # Validate config first
                config_valid, validation_output = validate_config()
                if not config_valid:
                    print(f"[{timestamp}] ⚠️ Configuration validation failed:")
                    print(validation_output)
                    print(f"[{timestamp}] 🔧 Attempting to fix configuration...")
                    run_command("cd /var/www/summit && sed -i \"s/region: us-east-1/region: 'us-east-1'/g\" index.js")
                
                # Restart server
                restart_server()
                
                # Check if restart worked
                time.sleep(5)
                is_healthy, message = check_health()
                if is_healthy:
                    print(f"[{timestamp}] ✅ Server successfully restarted")
                    consecutive_failures = 0
                else:
                    print(f"[{timestamp}] ❌ Restart failed, will retry in {CHECK_INTERVAL}s")
        
        # Wait before next check
        time.sleep(CHECK_INTERVAL)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 Monitor stopped by user")
    except Exception as e:
        print(f"\n\n❌ Monitor crashed: {e}")
