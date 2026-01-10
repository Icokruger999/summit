# AWS SSM Access for Summit

Quick guides and scripts for managing your Summit infrastructure via AWS Systems Manager.

## 📁 Files in this Directory

| File | Description |
|------|-------------|
| `AWS_SSM_SETUP.md` | Complete setup guide for SSM access |
| `connect-ssm.ps1` | PowerShell script to connect to EC2 instances |
| `deploy-to-ec2.sh` | Deploy backend to EC2 via SSM |
| `ssm-commands.md` | Quick reference for common SSM commands |

## 🚀 Quick Start

### 1. Connect to Your EC2 Instance

**Windows (PowerShell):**
```powershell
.\aws\connect-ssm.ps1
```

**Mac/Linux:**
```bash
aws ssm start-session --target YOUR_INSTANCE_ID
```

### 2. Find Your Instance ID

```bash
aws ec2 describe-instances \
  --query "Reservations[].Instances[].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name]" \
  --output table
```

### 3. Check SSM Connectivity

```bash
aws ssm describe-instance-information --output table
```

## 📋 Prerequisites Checklist

Before using SSM, ensure you have:

- [ ] **AWS CLI installed** - [Download](https://aws.amazon.com/cli/)
- [ ] **Session Manager plugin** - [Install Guide](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- [ ] **AWS credentials configured** - Run `aws configure`
- [ ] **EC2 instance with IAM role** - See `AWS_SSM_SETUP.md`
- [ ] **SSM Agent running** - Pre-installed on modern AMIs

## 🔑 Quick Setup for New Instance

If your EC2 instance isn't showing in SSM:

1. **Create IAM role** (one-time setup):
   ```bash
   aws iam create-role \
     --role-name EC2-SSM-Role \
     --assume-role-policy-document file://ec2-trust-policy.json
   
   aws iam attach-role-policy \
     --role-name EC2-SSM-Role \
     --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
   ```

2. **Attach role to instance**:
   ```bash
   aws ec2 associate-iam-instance-profile \
     --instance-id YOUR_INSTANCE_ID \
     --iam-instance-profile Name=EC2-SSM-InstanceProfile
   ```

3. **Wait 2-3 minutes** for SSM Agent to register

4. **Connect**:
   ```bash
   aws ssm start-session --target YOUR_INSTANCE_ID
   ```

## 📖 Documentation

### For Complete Setup
→ See `AWS_SSM_SETUP.md`

### For Command Reference
→ See `ssm-commands.md`

### For Deployment
→ See `deploy-to-ec2.sh`

## 🎯 Common Tasks

### Connect to Instance
```powershell
# Windows
.\aws\connect-ssm.ps1

# Mac/Linux
aws ssm start-session --target INSTANCE_ID
```

### Check Backend Status
```bash
aws ssm send-command \
  --instance-ids "INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["pm2 status"]'
```

### View Logs
```bash
# Once connected via SSM
pm2 logs summit-server
```

### Restart Server
```bash
# Once connected via SSM
pm2 restart summit-server
```

## 🔧 Your Current Infrastructure

### Database (RDS) ✅
- **Host:** codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
- **Region:** eu-west-1
- **Status:** Connected and working

### Backend Server (EC2)
To deploy your backend:
1. Create an EC2 instance (Ubuntu 22.04 recommended)
2. Set up SSM access (see `AWS_SSM_SETUP.md`)
3. Connect via SSM
4. Run setup script:
   ```bash
   curl -O https://raw.githubusercontent.com/your-repo/summit/main/aws/setup-ec2.sh
   bash setup-ec2.sh
   ```

## 🆘 Troubleshooting

### "Instance not available via SSM"
1. Check IAM role is attached
2. Verify SSM Agent is running
3. Ensure instance has internet access
4. Wait a few minutes after setup

### "AWS CLI not found"
Install AWS CLI:
- Windows: [Download installer](https://aws.amazon.com/cli/)
- Mac: `brew install awscli`
- Linux: `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install`

### "Session Manager plugin not found"
Download from: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

### "Permission denied"
Your AWS user needs these IAM permissions:
- `ssm:StartSession`
- `ssm:TerminateSession`
- `ec2:DescribeInstances`

## 💡 Pro Tips

1. **Save your instance ID:**
   ```powershell
   # PowerShell
   $env:SUMMIT_INSTANCE = "i-0123456789abcdef0"
   aws ssm start-session --target $env:SUMMIT_INSTANCE
   ```

2. **Use port forwarding for local development:**
   ```bash
   aws ssm start-session \
     --target INSTANCE_ID \
     --document-name AWS-StartPortForwardingSession \
     --parameters "portNumber=3000,localPortNumber=3000"
   ```

3. **Create an alias:**
   ```powershell
   # PowerShell profile
   function Connect-Summit { .\aws\connect-ssm.ps1 }
   ```

## 🔗 Useful Links

- [AWS Systems Manager Docs](https://docs.aws.amazon.com/systems-manager/)
- [Session Manager Setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started.html)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/)
- [IAM Policies for SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)

---

**Ready to connect?**

```powershell
# Windows
.\aws\connect-ssm.ps1

# Mac/Linux
aws ssm start-session --target YOUR_INSTANCE_ID
```

For detailed setup instructions, see `AWS_SSM_SETUP.md`

