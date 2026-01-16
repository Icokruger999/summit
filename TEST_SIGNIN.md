# Sign-In Testing Guide

## Pre-Deployment Checklist

### 1. Database Configuration ✅

The database is correctly configured to use **PgBouncer on EC2** (not AWS RDS):

```typescript
// server/src/lib/db.ts
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '6432'), // PgBouncer port
  database: process.env.DB_NAME || 'summit',
  user: process.env.DB_USER || 'summit_user',
  password: process.env.DB_PASSWORD,
  // ... connection pooling settings
};
```

**Environment Variables Required:**
```bash
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=summit
DB_USER=summit_user
DB_PASSWORD=<your_password>
```

### 2. CORS Configuration ✅

CORS is properly configured for production domains:

```typescript
// server/src/index.ts
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(origin => 
      !origin.includes('localhost') && !origin.includes('127.0.0.1'))
  : ['https://www.codingeverest.com', 'https://codingeverest.com', 'https://summit.codingeverest.com'];
```

**Environment Variable Required:**
```bash
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com
```

### 3. Registration Flow ✅

Updated to use direct password (no temporary passwords):

**Backend (`/api/auth/register`):**
- Accepts: `email`, `name`, `password` (required)
- Optional: `job_title`, `phone`, `company`
- Returns: JWT token + user data (auto-login)
- Starts trial immediately

**Frontend:**
- Password field in signup form (min 6 characters)
- Auto-login after successful registration
- No email sending required

## Testing Steps

### Step 1: Verify Database Connection

On your EC2 instance:

```bash
# Check PgBouncer is running
sudo systemctl status pgbouncer

# Test connection through PgBouncer
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT version();"

# Check if users table exists
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "\dt"
```

### Step 2: Verify Environment Variables

On your EC2 instance:

```bash
cd /path/to/summit/server

# Check if .env file exists
ls -la .env

# Verify critical variables (don't print passwords!)
grep -E "^(DB_HOST|DB_PORT|DB_NAME|CORS_ORIGIN|PORT)" .env
```

**Expected Output:**
```
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=summit
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com
PORT=3000
```

### Step 3: Build and Start Server

```bash
cd /path/to/summit/server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs --env production

# Check status
pm2 status

# View logs
pm2 logs summit-backend --lines 50
```

**Look for these log messages:**
```
✅ CORS configured for origins: https://summit.codingeverest.com, https://www.codingeverest.com
✅ Server running on 0.0.0.0:3000
✅ WebSocket server ready on port 3000
✅ Environment: production
```

### Step 4: Test Health Endpoint

```bash
# From EC2 instance
curl http://localhost:3000/health

# Expected response:
# {"status":"ok"}
```

### Step 5: Test Registration (Backend)

```bash
# Test registration endpoint
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "testpass123",
    "job_title": "Developer",
    "phone": "555-1234",
    "company": "Test Co"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "avatar_url": null,
    "company": "Test Co",
    "job_title": "Developer",
    "phone": "555-1234"
  },
  "token": "jwt-token-here",
  "message": "Account created successfully. Your 3-day trial has started!"
}
```

### Step 6: Test Login (Backend)

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    ...
  },
  "token": "jwt-token-here"
}
```

### Step 7: Test Frontend Registration

1. Open browser to: `https://summit.codingeverest.com`
2. Click "Don't have an account? Sign up"
3. Fill in form:
   - Email: `yourtest@example.com`
   - Name: `Your Name`
   - Password: `password123` (min 6 chars)
   - Optional fields (can leave blank)
4. Click "Create Account"
5. Should auto-login and redirect to dashboard

**Check Browser Console:**
- No CORS errors
- No network errors
- Token stored in localStorage

### Step 8: Test Frontend Login

1. Logout (if logged in)
2. Go to login page
3. Enter credentials:
   - Email: `yourtest@example.com`
   - Password: `password123`
4. Click "Sign In"
5. Should redirect to dashboard

## Common Issues and Solutions

### Issue 1: CORS Error

**Symptom:**
```
Access to fetch at 'https://api.codingeverest.com/api/auth/register' 
from origin 'https://summit.codingeverest.com' has been blocked by CORS policy
```

**Solution:**
```bash
# Check CORS_ORIGIN in .env
grep CORS_ORIGIN /path/to/summit/server/.env

# Should include your frontend domain
# Update if needed:
CORS_ORIGIN=https://summit.codingeverest.com,https://www.codingeverest.com

# Restart server
pm2 restart summit-backend
```

### Issue 2: Database Connection Error

**Symptom:**
```
Database query error: connect ECONNREFUSED 127.0.0.1:6432
```

**Solution:**
```bash
# Check PgBouncer status
sudo systemctl status pgbouncer

# If not running, start it
sudo systemctl start pgbouncer

# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection manually
psql -h 127.0.0.1 -p 6432 -U summit_user -d summit
```

### Issue 3: JWT Secret Error

**Symptom:**
```
❌ ERROR: JWT_SECRET must be set to a secure value in production
```

**Solution:**
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env
echo "JWT_SECRET=<generated_secret>" >> /path/to/summit/server/.env

# Restart server
pm2 restart summit-backend
```

### Issue 4: Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change port in .env
PORT=3001

# Restart server
pm2 restart summit-backend
```

### Issue 5: Password Too Short Error

**Symptom:**
```
{"error":"Password must be at least 6 characters"}
```

**Solution:**
- Ensure password is at least 6 characters
- Frontend shows hint: "Password must be at least 6 characters long"

## Verification Checklist

- [ ] PgBouncer running on EC2 (port 6432)
- [ ] PostgreSQL running on EC2 (port 5432)
- [ ] Database schema initialized (users table exists)
- [ ] Server .env configured with correct DB credentials
- [ ] CORS_ORIGIN includes frontend domain
- [ ] JWT_SECRET is set to secure value
- [ ] Server running on port 3000 (or configured port)
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Registration endpoint works (returns token)
- [ ] Login endpoint works (returns token)
- [ ] Frontend can register new users
- [ ] Frontend can login existing users
- [ ] No CORS errors in browser console
- [ ] Trial starts automatically on registration

## Database Queries for Debugging

```sql
-- Check if user was created
SELECT id, email, name, created_at, trial_started_at, subscription_status 
FROM users 
WHERE email = 'test@example.com';

-- Check password hash exists
SELECT id, email, 
       password_hash IS NOT NULL as has_password,
       temp_password_hash IS NOT NULL as has_temp_password,
       requires_password_change
FROM users 
WHERE email = 'test@example.com';

-- Check trial status
SELECT id, email, 
       trial_started_at,
       subscription_status,
       EXTRACT(EPOCH FROM (NOW() - trial_started_at)) / 3600 as hours_elapsed
FROM users 
WHERE email = 'test@example.com';

-- List all users
SELECT id, email, name, created_at, subscription_status 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

## Success Criteria

✅ **Registration works:**
- User can create account with email, name, password
- Returns JWT token immediately
- Trial starts automatically
- User is logged in

✅ **Login works:**
- User can login with email and password
- Returns JWT token
- No CORS errors
- Redirects to dashboard

✅ **Database works:**
- Connected via PgBouncer (port 6432)
- User data persisted correctly
- Password hashed securely
- Trial status tracked

✅ **No errors:**
- No CORS errors
- No database connection errors
- No JWT errors
- No network errors
