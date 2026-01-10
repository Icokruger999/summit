# Route 53 DNS Setup for Summit

Since you're using Route 53 (same as Milo), here's how to configure DNS for Summit.

## 🎯 Records Needed

You need two DNS records:

1. **api.codingeverest.com** → Points to EC2 (for backend)
2. **summit.codingeverest.com** → Points to Amplify (for frontend)

---

## Step 1: Get Your EC2 Public IP

### Option A: AWS Console

1. Go to EC2 Dashboard
2. Find instance: `codingeverest` (i-06bc5b2218c041802)
3. Copy the **Public IPv4 address**

### Option B: AWS CLI

```bash
aws ec2 describe-instances \
  --instance-ids i-06bc5b2218c041802 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text
```

### Option C: On EC2

```bash
curl http://checkip.amazonaws.com
```

---

## Step 2: Create Record for API Backend

### In AWS Console:

1. Go to **Route 53** console
2. Click **Hosted zones**
3. Select **codingeverest.com**
4. Click **Create record**

**Fill in:**
```
Record name: api
Record type: A - Routes traffic to an IPv4 address
Value: [YOUR-EC2-PUBLIC-IP]
TTL: 300
Routing policy: Simple routing
```

Click **Create records**

### Using AWS CLI:

```bash
# Get your hosted zone ID first
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='codingeverest.com.'].Id" --output text)

# Get your EC2 IP
EC2_IP=$(aws ec2 describe-instances --instance-ids i-06bc5b2218c041802 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

# Create the record
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.codingeverest.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$EC2_IP'"}]
      }
    }]
  }'
```

---

## Step 3: Verify API DNS

Wait 2-5 minutes, then test:

```bash
# Check DNS
nslookup api.codingeverest.com

# Should return your EC2 IP

# Test API (after Nginx is configured)
curl http://api.codingeverest.com/api/auth/health
```

---

## Step 4: Create Record for Amplify Frontend

This step comes **AFTER** you deploy to Amplify.

### After Amplify Deployment:

1. In Amplify Console, go to your Summit app
2. Click **Domain management**
3. Click **Add domain**
4. Enter: `summit.codingeverest.com`
5. Amplify will show you DNS configuration

### Two Options:

**Option A: Amplify Managed (Recommended)**
- Amplify provides a CloudFront distribution
- They'll tell you to create a CNAME or A record
- Example: CNAME to `d1234567890abc.cloudfront.net`

**Option B: Route 53 Alias**
- If Amplify offers an alias target
- Use an ALIAS record instead of CNAME (better for apex domains)

### Create the Record in Route 53:

**If using CNAME:**

1. Go to Route 53 → codingeverest.com hosted zone
2. Create record:

```
Record name: summit
Record type: CNAME
Value: [Amplify-provided-value].cloudfront.net
TTL: 300
Routing policy: Simple routing
```

**If using Alias:**

```
Record name: summit
Record type: A
Alias: Yes
Alias target: [Select the Amplify CloudFront distribution]
TTL: Not needed (managed by AWS)
Routing policy: Simple routing
```

### Using CLI (CNAME example):

```bash
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='codingeverest.com.'].Id" --output text)

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "summit.codingeverest.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "d1234567890abc.cloudfront.net"}]
      }
    }]
  }'
```

---

## Step 5: Verify Summit DNS

Wait 5-10 minutes, then test:

```bash
# Check DNS
nslookup summit.codingeverest.com

# Visit in browser
https://summit.codingeverest.com
```

---

## 🔍 Troubleshooting

### DNS Not Resolving

```bash
# Check if record exists
aws route53 list-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --query "ResourceRecordSets[?Name=='api.codingeverest.com.']"

# Wait 5-10 minutes for propagation
```

### Wrong IP or CNAME

```bash
# Update existing record (change CREATE to UPSERT)
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.codingeverest.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "NEW-IP-HERE"}]
      }
    }]
  }'
```

### Check Propagation

```bash
# Use online tools
https://dnschecker.org/

# Or multiple DNS servers
dig @8.8.8.8 api.codingeverest.com
dig @1.1.1.1 api.codingeverest.com
```

---

## ✅ Final DNS Configuration

After both records are created:

| Subdomain | Type | Value | Purpose |
|-----------|------|-------|---------|
| api | A | EC2-IP | Backend API |
| summit | CNAME or A | Amplify/CloudFront | Frontend login page |
| www | (existing) | (existing) | Landing page |

---

## 🔒 SSL Certificates

### For API (EC2):

Use Let's Encrypt (after DNS is configured):

```bash
sudo certbot --nginx -d api.codingeverest.com
```

### For Summit (Amplify):

Amplify handles SSL automatically when you add a custom domain. No action needed!

---

## 🎯 Summary

1. Create A record: `api` → EC2 IP
2. Deploy to Amplify
3. Create CNAME: `summit` → Amplify URL
4. Wait for DNS propagation (5-10 min)
5. Test both URLs
6. Set up SSL

That's it! Your Route 53 setup will be complete.

