# Memory Optimization Guide

## Current Configuration

The server is configured with PM2 `max_memory_restart: '1.5G'` for t3.small instance (2GB RAM total).

## Memory Usage Analysis

### PM2 Memory Limit
- **Current**: 512MB per process
- **Previous**: 1GB (too high for t2.micro/t2.small)
- **Auto-restart**: PM2 will restart the process if memory exceeds this limit

### EC2 Instance Types & Memory

| Instance Type | RAM | Recommended For |
|--------------|-----|----------------|
| t2.micro | 1 GB | Development/Testing only |
| t2.small | 2 GB | Light production (1-10 users) |
| t2.medium | 4 GB | Small production (10-50 users) |
| t3.small | 2 GB | Better performance than t2.small |
| t3.medium | 4 GB | Better performance than t2.medium |

## If Server Keeps Restarting

### 1. Check Current Memory Usage
```bash
# On the server
free -h
pm2 status
pm2 monit  # Real-time monitoring
```

### 2. Check PM2 Logs for Memory Issues
```bash
pm2 logs summit-server --lines 100 | grep -i "memory\|oom\|killed"
```

### 3. Reduce Memory Limit (if needed)
Edit `server/ecosystem.config.cjs`:
```javascript
max_memory_restart: '400M', // Even lower if needed
```

### 4. Upgrade EC2 Instance (Recommended)
If you're on t2.micro (1GB RAM), upgrade to:
- **t2.small** (2GB) - $0.02/hour (~$15/month)
- **t3.small** (2GB) - Better performance, same price
- **t2.medium** (4GB) - $0.04/hour (~$30/month) for more headroom

### 5. Optimize Node.js Memory
Add to `server/.env`:
```bash
NODE_OPTIONS="--max-old-space-size=400"
```

## Monitoring Memory

### Check System Memory
```bash
free -h
cat /proc/meminfo | grep -i "memavailable\|memfree"
```

### Check Process Memory
```bash
ps aux | grep node
pm2 list
```

### Monitor in Real-Time
```bash
pm2 monit
```

## Common Causes of High Memory Usage

1. **Memory Leaks**: Unclosed database connections, event listeners
2. **Large File Uploads**: File processing in memory
3. **WebSocket Connections**: Each connection uses memory
4. **Database Connection Pool**: Too many connections
5. **Large Response Data**: Loading too much data at once

## Quick Fixes

### Reduce Database Connection Pool
In `server/src/lib/db.ts`:
```typescript
max: 10, // Reduce from 20 if needed
```

### Enable Garbage Collection
Add to `server/.env`:
```bash
NODE_OPTIONS="--expose-gc --max-old-space-size=400"
```

### Restart PM2 with Lower Memory
```bash
pm2 restart summit-server --update-env
```

## Recommended Actions

1. **Immediate**: Reduce PM2 memory limit to 512M (already done)
2. **Short-term**: Monitor memory usage with `pm2 monit`
3. **Long-term**: Upgrade to t2.small or t3.small if on t2.micro
