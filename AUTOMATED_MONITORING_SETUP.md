# Automated Site Monitoring and Auto-Remediation Setup

This guide explains how to set up automated monitoring and remediation for `summit.codingeverest.com` to ensure the site is always up.

## Overview

The monitoring system includes:
1. **Health Checks**: Monitor SSL certificates, DNS, and site availability
2. **Automated Alerts**: Notify when issues are detected
3. **Auto-Remediation**: Attempt to automatically resolve common issues
4. **CloudWatch Integration**: Track metrics and set up alarms

## Option 1: AWS Lambda Health Checker (Recommended)

### Setup Steps

1. **Create Lambda Function**
   ```bash
   # Navigate to lambda-health-checker directory
   cd lambda-health-checker
   npm install
   zip -r function.zip . -x '*.git*' '*.md' 'package*.json'
   ```

2. **Deploy to AWS Lambda**
   - Go to AWS Lambda Console
   - Create new function
   - Upload `function.zip`
   - Set runtime: Node.js 18.x or 20.x
   - Set timeout: 30 seconds
   - Set memory: 256 MB

3. **Configure Environment Variables**
   ```
   DOMAIN=summit.codingeverest.com
   API_DOMAIN=summit-api.codingeverest.com
   AMPLIFY_APP_ID=your-amplify-app-id
   SNS_TOPIC_ARN=arn:aws:sns:REGION:ACCOUNT:summit-alerts
   AWS_REGION=eu-west-1
   ```

4. **Set Up IAM Role**
   - Create IAM role with permissions:
     - `sns:Publish` (for alerts)
     - `amplify:GetApp` (optional, for Amplify status)
     - `cloudwatch:PutMetricData` (optional, for metrics)

5. **Create SNS Topic for Alerts**
   ```bash
   aws sns create-topic --name summit-alerts
   # Note the TopicArn and add to Lambda environment variables
   ```

6. **Set Up CloudWatch Events Rule**
   - Go to CloudWatch → Events → Rules
   - Create rule:
     - **Schedule**: Rate expression: `rate(5 minutes)`
     - **Target**: Select your Lambda function
   - Enable the rule

7. **Set Up CloudWatch Alarms** (Optional)
   - Create alarms based on Lambda function metrics
   - Set up SNS notifications for alarm state changes

### Testing

```bash
# Test Lambda function locally (if using SAM or local testing)
aws lambda invoke --function-name summit-health-checker --payload '{}' response.json
cat response.json
```

## Option 2: EC2-Based Monitoring Script

### Setup Steps

1. **Install Dependencies**
   ```bash
   # On your EC2 instance or monitoring server
   sudo apt-get update
   sudo apt-get install -y curl dnsutils openssl mailutils awscli
   ```

2. **Set Up Script**
   ```bash
   # Copy script to EC2
   chmod +x monitor-site-health.sh
   sudo mv monitor-site-health.sh /usr/local/bin/
   ```

3. **Configure Environment Variables**
   ```bash
   # Edit /etc/environment or create /etc/summit-monitor.conf
   export ALERT_EMAIL=your-email@example.com
   export AMPLIFY_APP_ID=your-amplify-app-id
   ```

4. **Set Up Cron Job**
   ```bash
   # Edit crontab
   sudo crontab -e
   
   # Add line to run every 5 minutes
   */5 * * * * /usr/local/bin/monitor-site-health.sh >> /var/log/summit-health-monitor.log 2>&1
   ```

5. **Set Up Log Rotation**
   ```bash
   # Create logrotate config
   sudo nano /etc/logrotate.d/summit-monitor
   
   # Add:
   /var/log/summit-health-monitor.log {
       daily
       rotate 7
       compress
       missingok
       notifempty
   }
   ```

## Option 3: AWS Systems Manager (SSM) Automation

### Setup Steps

1. **Create SSM Document for Health Check**
   ```json
   {
     "schemaVersion": "0.3",
     "description": "Summit Site Health Check and Remediation",
     "assumeRole": "arn:aws:iam::ACCOUNT:role/SSM-Automation-Role",
     "mainSteps": [
       {
         "action": "aws:runShellScript",
         "name": "checkHealth",
         "inputs": {
           "runCommand": [
             "curl -f https://summit.codingeverest.com/health || echo 'Site down'"
           ]
         }
       }
     ]
   }
   ```

2. **Set Up Maintenance Window**
   - Go to Systems Manager → Maintenance Windows
   - Create window to run health checks every 5 minutes

## Monitoring Dashboard

### CloudWatch Dashboard

Create a CloudWatch Dashboard with:
- Site availability metrics
- SSL certificate validity
- Response times
- Error rates

### Metrics to Track

1. **Site Availability**
   - HTTP status codes
   - Response times
   - Error rates

2. **SSL Certificate**
   - Certificate validity
   - Days until expiry
   - Certificate chain validation

3. **DNS Resolution**
   - DNS lookup times
   - DNS resolution success rate

4. **API Health**
   - API endpoint availability
   - Response times
   - Error rates

## Auto-Remediation Actions

### SSL Certificate Issues

**Detection**: SSL certificate invalid or expired

**Auto-Remediation**:
1. Check AWS Amplify Console for certificate status
2. Trigger certificate re-validation (if possible via API)
3. Send alert with remediation steps

**Manual Steps** (if auto-remediation fails):
1. Go to AWS Amplify Console
2. Check Domain Management
3. Verify DNS records
4. Wait for certificate provisioning

### Site Down Issues

**Detection**: HTTP status code != 200 or connection timeout

**Auto-Remediation**:
1. Check Amplify build status
2. Trigger new build if needed (via API)
3. Check backend services (EC2)
4. Restart services if needed (via SSM)

**Manual Steps**:
1. Check Amplify build logs
2. Check EC2 instance status
3. Check Nginx/backend logs
4. Restart services if needed

### DNS Issues

**Detection**: DNS resolution fails

**Auto-Remediation**:
1. Verify DNS records in Route 53
2. Send alert with DNS check instructions

**Manual Steps**:
1. Check DNS provider settings
2. Verify CNAME/A records
3. Check DNS propagation

## Alert Configuration

### SNS Topic Setup

1. **Create SNS Topic**
   ```bash
   aws sns create-topic --name summit-alerts
   ```

2. **Subscribe to Topic**
   ```bash
   # Email subscription
   aws sns subscribe \
     --topic-arn arn:aws:sns:REGION:ACCOUNT:summit-alerts \
     --protocol email \
     --notification-endpoint your-email@example.com
   
   # SMS subscription (optional)
   aws sns subscribe \
     --topic-arn arn:aws:sns:REGION:ACCOUNT:summit-alerts \
     --protocol sms \
     --notification-endpoint +1234567890
   ```

3. **Confirm Subscription**
   - Check email for confirmation link
   - Click link to confirm subscription

### Alert Types

1. **Critical Alerts**
   - Site completely down
   - SSL certificate expired
   - DNS resolution failed

2. **Warning Alerts**
   - SSL certificate expiring soon (< 30 days)
   - High response times
   - Intermittent errors

3. **Info Alerts**
   - Health check results
   - Remediation actions taken

## Cost Considerations

### Lambda-Based Monitoring
- **Lambda Invocations**: ~8,640/month (every 5 minutes) = Free tier covers 1M requests
- **CloudWatch Logs**: ~100 MB/month = Free tier covers 5 GB
- **SNS Messages**: ~100/month = $0.10/month
- **Total**: ~$0.10/month (within free tier)

### EC2-Based Monitoring
- **EC2 Instance**: If using existing instance = $0 additional
- **CloudWatch Logs**: ~100 MB/month = Free tier
- **Total**: $0 (if using existing infrastructure)

## Testing

### Test Health Check

```bash
# Test SSL certificate
openssl s_client -connect summit.codingeverest.com:443 -servername summit.codingeverest.com

# Test HTTP status
curl -I https://summit.codingeverest.com

# Test DNS resolution
dig summit.codingeverest.com
```

### Test Lambda Function

```bash
# Invoke Lambda function
aws lambda invoke \
  --function-name summit-health-checker \
  --payload '{}' \
  response.json

# Check response
cat response.json
```

### Test Monitoring Script

```bash
# Run script manually
./monitor-site-health.sh

# Check logs
tail -f /var/log/summit-health-monitor.log
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review health check logs
2. **Monthly**: Review alert frequency and adjust thresholds
3. **Quarterly**: Review and update remediation scripts
4. **Yearly**: Review SSL certificate renewal process

### Troubleshooting

1. **Health checks not running**
   - Check CloudWatch Events rule is enabled
   - Check Lambda function logs
   - Verify IAM permissions

2. **Alerts not sending**
   - Verify SNS topic subscriptions
   - Check Lambda function has SNS permissions
   - Verify email/SMS subscriptions are confirmed

3. **False positives**
   - Adjust check intervals
   - Update thresholds
   - Add retry logic

## Next Steps

1. **Choose monitoring method** (Lambda recommended)
2. **Set up infrastructure** (Lambda function, SNS topic)
3. **Configure alerts** (Email/SMS subscriptions)
4. **Test monitoring** (Verify alerts work)
5. **Review and adjust** (Fine-tune thresholds)

## Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [AWS Amplify Domain Management](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html)

