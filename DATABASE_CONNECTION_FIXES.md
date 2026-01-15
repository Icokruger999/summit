# Database Connection & Timeout Fixes

## Issues Addressed

1. **PgBouncer Timeout** - Connections dropping after idle period
2. **EC2 Security Group** - Port access verification
3. **CORS Heartbeat** - Preflight request caching
4. **Database Connection Pooling** - Proper PgBouncer configuration

## 1. PgBouncer Configuration

### Current Settings (Updated)
- **server_idle_timeout**: 600 seconds (10 minutes) - Prevents connections from being killed too quickly
- **tcp_keepalive**: 1 (enabled) - Keeps connections alive at network level

### To Apply Fixes

Run the fix script:
```powershell
.\fix-pgbouncer-timeout-ssm.ps1
```

Or manually on the server:
```bash
# Find PgBouncer config
sudo find /etc /var/lib -name "pgbouncer.ini"

# Edit config (usually /etc/pgbouncer/pgbouncer.ini)
sudo nano /etc/pgbouncer/pgbouncer.ini

# Add/update these settings:
server_idle_timeout = 600  # 10 minutes (was likely 60s or default)
tcp_keepalive = 1          # Enable TCP keep-alive

# Restart PgBouncer
sudo systemctl restart pgbouncer
```

### Verify Settings
```bash
grep -E '^(server_idle_timeout|tcp_keepalive)' /etc/pgbouncer/pgbouncer.ini
```

## 2. Database Connection Pool (Backend)

### Updated Configuration
- **Port**: 6432 (PgBouncer) ✅ - Already correct
- **Keep-Alive**: Enabled ✅ - Added to connection config
- **Max Connections**: 20 (should be <= PgBouncer pool size)
- **Idle Timeout**: 30 seconds (closes idle connections in pool)

### Connection Settings
```typescript
{
  port: 6432,  // PgBouncer port (NOT 5432)
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,  // Send keep-alive after 10s
  idleTimeoutMillis: 30000,  // Close idle pool connections after 30s
}
```

## 3. CORS Configuration

### Current Settings ✅
- **credentials**: `true` - Allows cookies/auth headers
- **maxAge**: `86400` - Caches preflight for 24 hours
- **methods**: All required methods included
- **allowedHeaders**: Proper headers configured

### Already Configured
The CORS config in `server/src/index.ts` already has:
```typescript
credentials: true,
maxAge: 86400,  // 24 hours
```

## 4. EC2 Security Group

### Required Ports
- **Port 6432** (PgBouncer) - Inbound from EC2 private IP
- **Port 5432** (PostgreSQL) - Inbound from EC2 private IP (if PgBouncer is on same instance)

### Check Security Group
```bash
# Get EC2 instance private IP
aws ec2 describe-instances --instance-ids i-0fba58db502cc8d39 --query "Reservations[0].Instances[0].PrivateIpAddress" --region eu-west-1

# Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id> --region eu-west-1
```

### Add Rules (if needed)
1. Go to EC2 Console → Security Groups
2. Find your RDS security group
3. Add inbound rule:
   - Type: PostgreSQL (5432) or Custom TCP (6432)
   - Source: Your EC2 instance's security group ID
   - Or: EC2 private IP/32

## 5. Verification

### Test Database Connection
```bash
# On EC2 instance
psql -h <db-host> -p 6432 -U summit_user -d summit -c "SELECT 1;"
```

### Check PgBouncer Status
```bash
# Connect to PgBouncer admin console
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```

### Monitor Connections
```bash
# Check active connections
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW CLIENTS;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW SERVERS;"
```

## Summary of Changes

1. ✅ **Database Connection**: Added keep-alive settings
2. ✅ **CORS**: Already configured with maxAge and credentials
3. ⚠️ **PgBouncer Config**: Run fix script to update timeout settings
4. ⚠️ **Security Group**: Verify ports 6432 and 5432 are open

## Next Steps

1. Run `.\fix-pgbouncer-timeout-ssm.ps1` to update PgBouncer config
2. Verify security group allows ports 6432 and 5432
3. Restart server to apply database connection changes
4. Monitor logs for connection timeout errors
