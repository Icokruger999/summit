#!/bin/bash
# Quick test commands for Summit backend

echo "=== Summit Backend Test Suite ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check PgBouncer
echo -e "${YELLOW}Test 1: Checking PgBouncer status...${NC}"
if sudo systemctl is-active --quiet pgbouncer; then
    echo -e "${GREEN}✅ PgBouncer is running${NC}"
else
    echo -e "${RED}❌ PgBouncer is not running${NC}"
    echo "   Run: sudo systemctl start pgbouncer"
fi
echo ""

# Test 2: Check PostgreSQL
echo -e "${YELLOW}Test 2: Checking PostgreSQL status...${NC}"
if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    echo "   Run: sudo systemctl start postgresql"
fi
echo ""

# Test 3: Test database connection
echo -e "${YELLOW}Test 3: Testing database connection...${NC}"
if psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "   Check DB credentials in .env"
fi
echo ""

# Test 4: Check if users table exists
echo -e "${YELLOW}Test 4: Checking if users table exists...${NC}"
if psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "\dt users" 2>/dev/null | grep -q "users"; then
    echo -e "${GREEN}✅ Users table exists${NC}"
else
    echo -e "${RED}❌ Users table not found${NC}"
    echo "   Run: psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -f database/complete_schema.sql"
fi
echo ""

# Test 5: Check server health endpoint
echo -e "${YELLOW}Test 5: Testing server health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = '{"status":"ok"}' ]; then
    echo -e "${GREEN}✅ Server is running and healthy${NC}"
else
    echo -e "${RED}❌ Server health check failed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    echo "   Check: pm2 status"
fi
echo ""

# Test 6: Test registration endpoint
echo -e "${YELLOW}Test 6: Testing registration endpoint...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "name": "Test User",
    "password": "testpass123"
  }' 2>/dev/null)

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Registration endpoint works${NC}"
    echo "   User created successfully"
else
    echo -e "${RED}❌ Registration endpoint failed${NC}"
    echo "   Response: $REGISTER_RESPONSE"
fi
echo ""

# Test 7: Check PM2 status
echo -e "${YELLOW}Test 7: Checking PM2 process status...${NC}"
if pm2 list | grep -q "summit-backend"; then
    if pm2 list | grep "summit-backend" | grep -q "online"; then
        echo -e "${GREEN}✅ PM2 process is online${NC}"
    else
        echo -e "${RED}❌ PM2 process is not online${NC}"
        echo "   Run: pm2 restart summit-backend"
    fi
else
    echo -e "${RED}❌ PM2 process not found${NC}"
    echo "   Run: pm2 start ecosystem.config.cjs --env production"
fi
echo ""

# Test 8: Check environment variables
echo -e "${YELLOW}Test 8: Checking environment variables...${NC}"
if [ -f "server/.env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check critical variables
    if grep -q "^DB_HOST=127.0.0.1" server/.env; then
        echo -e "${GREEN}   ✅ DB_HOST is set to localhost${NC}"
    else
        echo -e "${RED}   ❌ DB_HOST not set correctly${NC}"
    fi
    
    if grep -q "^DB_PORT=6432" server/.env; then
        echo -e "${GREEN}   ✅ DB_PORT is set to 6432 (PgBouncer)${NC}"
    else
        echo -e "${RED}   ❌ DB_PORT not set to 6432${NC}"
    fi
    
    if grep -q "^CORS_ORIGIN=" server/.env; then
        echo -e "${GREEN}   ✅ CORS_ORIGIN is set${NC}"
    else
        echo -e "${RED}   ❌ CORS_ORIGIN not set${NC}"
    fi
    
    if grep -q "^JWT_SECRET=" server/.env && ! grep -q "^JWT_SECRET=your" server/.env; then
        echo -e "${GREEN}   ✅ JWT_SECRET is set${NC}"
    else
        echo -e "${RED}   ❌ JWT_SECRET not set or using default${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Copy server/.env.example to server/.env and configure"
fi
echo ""

echo "=== Test Summary ==="
echo "If all tests pass, your backend is ready!"
echo "If any tests fail, follow the suggestions above."
echo ""
echo "Next steps:"
echo "1. Test frontend registration at https://summit.codingeverest.com"
echo "2. Check browser console for CORS errors"
echo "3. Monitor logs: pm2 logs summit-backend"
