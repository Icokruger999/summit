# AWS SSM Quick Commands Reference

Common commands for managing your Summit infrastructure via AWS Systems Manager.

## Connect to Instance

```bash
# Interactive connection
aws ssm start-session --target INSTANCE_ID

# Using PowerShell script (Windows)
.\aws\connect-ssm.ps1
```

## Find Your Instances

```bash
# List all running instances
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].[InstanceId,Tags[?Key=='Name'].Value|[0],PrivateIpAddress,State.Name]" \
  --output table

# List instances with SSM access
aws ssm describe-instance-information \
  --output table
```

## Remote Commands

### Check Backend Status

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["pm2 status"]' \
  --output text
```

### View Backend Logs

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["pm2 logs summit-server --lines 50"]' \
  --output text
```

### Restart Backend Server

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["pm2 restart summit-server"]' \
  --output text
```

### Check System Resources

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["df -h", "free -m", "uptime"]' \
  --output text
```

### Test Database Connection

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/summit && node database/test-connection.cjs"]' \
  --output text
```

## Deployment Commands

### Deploy Backend

```bash
# Using deployment script
./aws/deploy-to-ec2.sh INSTANCE_ID

# Manual deployment
aws ssm start-session --target INSTANCE_ID
# Then on the instance:
cd /opt/summit
git pull
cd server
npm install
npm run build
pm2 restart summit-server
```

### Update Environment Variables

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/summit/server && nano .env"]' \
  --output text
```

## Monitoring

### Check CPU and Memory

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["top -bn1 | head -20"]' \
  --output text
```

### Check Disk Usage

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["df -h", "du -sh /opt/summit/*"]' \
  --output text
```

### View System Logs

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo journalctl -n 100 --no-pager"]' \
  --output text
```

## Database Operations

### Run Database Setup

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/summit && node database/setup-complete.cjs"]' \
  --output text
```

### Test Database Connection from EC2

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/summit && node database/test-backend-db.cjs"]' \
  --output text
```

## LiveKit Server

### Check LiveKit Status

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo systemctl status livekit"]' \
  --output text
```

### Restart LiveKit

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo systemctl restart livekit"]' \
  --output text
```

### View LiveKit Logs

```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo journalctl -u livekit -n 100"]' \
  --output text
```

## Port Forwarding (Local Development)

Forward EC2 ports to your local machine:

```bash
# Forward backend API port
aws ssm start-session \
  --target INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters "portNumber=3000,localPortNumber=3000"

# Forward LiveKit port
aws ssm start-session \
  --target INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters "portNumber=7880,localPortNumber=7880"
```

## Security Group Management

### Allow your IP for testing

```bash
# Get your current IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Allow your IP to access the backend (temporary)
aws ec2 authorize-security-group-ingress \
  --group-id SECURITY_GROUP_ID \
  --protocol tcp \
  --port 3000 \
  --cidr $MY_IP/32
```

## File Transfer

### Copy files from local to EC2

```bash
# Create a zip file locally
cd server
zip -r deploy.zip dist/ package.json package-lock.json

# Upload to S3
aws s3 cp deploy.zip s3://your-bucket/

# Download on EC2 via SSM
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["aws s3 cp s3://your-bucket/deploy.zip /opt/summit/"]' \
  --output text
```

## Troubleshooting

### SSM Agent Not Working

```bash
# Check SSM Agent status
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo systemctl status amazon-ssm-agent"]' \
  --output text

# Restart SSM Agent
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo systemctl restart amazon-ssm-agent"]' \
  --output text
```

### Check IAM Role

```bash
# Verify instance has IAM role attached
aws ec2 describe-instances \
  --instance-ids INSTANCE_ID \
  --query "Reservations[0].Instances[0].IamInstanceProfile.Arn" \
  --output text
```

### View SSM Command Output

```bash
# Get command ID from send-command output, then:
aws ssm get-command-invocation \
  --command-id "COMMAND_ID" \
  --instance-id "INSTANCE_ID" \
  --output text
```

## Quick Reference

| Task | Command |
|------|---------|
| Connect to instance | `aws ssm start-session --target INSTANCE_ID` |
| List instances | `aws ec2 describe-instances --output table` |
| Check backend status | `pm2 status` (once connected) |
| View logs | `pm2 logs summit-server` |
| Restart backend | `pm2 restart summit-server` |
| Test database | `node database/test-connection.cjs` |
| Deploy backend | `./aws/deploy-to-ec2.sh INSTANCE_ID` |

---

**Pro Tip:** Save your instance ID as an environment variable:

```bash
# PowerShell
$env:SUMMIT_INSTANCE_ID = "i-0123456789abcdef0"
aws ssm start-session --target $env:SUMMIT_INSTANCE_ID

# Bash
export SUMMIT_INSTANCE_ID="i-0123456789abcdef0"
aws ssm start-session --target $SUMMIT_INSTANCE_ID
```

