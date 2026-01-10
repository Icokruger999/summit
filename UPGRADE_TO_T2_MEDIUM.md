# Upgrade EC2 to t2.medium for Better Performance

## 📊 Current vs t2.medium

| Instance Type | vCPU | RAM | Current |
|---------------|------|-----|---------|
| Current | ? | ? | Check above |
| **t2.medium** | **2** | **4 GB** | ✅ Recommended |

## 🚀 Upgrade Steps

### Option 1: AWS Console (Easiest)

1. **Go to EC2 Console**
   - https://console.aws.amazon.com/ec2/
   - Region: **eu-west-1**

2. **Stop the Instance**
   - Select instance: **codingeverest (i-06bc5b2218c041802)**
   - Click **"Instance state"** → **"Stop instance"**
   - Wait for it to stop (2-3 minutes)

3. **Change Instance Type**
   - Right-click instance → **"Instance settings"** → **"Change instance type"**
   - Select: **t2.medium**
   - Click **"Apply"**

4. **Start Instance**
   - Click **"Instance state"** → **"Start instance"**
   - Wait for it to start (1-2 minutes)

### Option 2: AWS CLI

```bash
# Stop instance
aws ec2 stop-instances --instance-ids i-06bc5b2218c041802 --region eu-west-1

# Wait for stopped state
aws ec2 wait instance-stopped --instance-ids i-06bc5b2218c041802 --region eu-west-1

# Change instance type
aws ec2 modify-instance-attribute \
  --instance-id i-06bc5b2218c041802 \
  --instance-type Value=t2.medium \
  --region eu-west-1

# Start instance
aws ec2 start-instances --instance-ids i-06bc5b2218c041802 --region eu-west-1

# Wait for running
aws ec2 wait instance-running --instance-ids i-06bc5b2218c041802 --region eu-west-1
```

## ⚠️ Important Notes

1. **Downtime**: ~5 minutes (while stopping/starting)
2. **IP Address**: May change (but Route 53 should update automatically)
3. **Services**: Milo and Summit will restart automatically
4. **PM2**: Should auto-start with PM2 startup script

## ✅ After Upgrade

Verify everything is running:

```bash
# Check instance
aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --region eu-west-1

# Check PM2 (via SSM)
pm2 list

# Test Summit
curl http://localhost:4000/health
```

---

**t2.medium gives you 2 vCPU and 4 GB RAM - perfect for Summit + Milo!** 🚀

