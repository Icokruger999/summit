#!/bin/bash
# Health Check and Auto-Fix Script for Summit Backend
# This script checks if backend is running and fixes it if not

DEPLOY_PATH="/var/www/summit/server"
BACKEND_URL="https://summit.api.codingeverest.com/health"
LOCAL_URL="http://localhost:3000/health"
LOG_FILE="/var/log/summit-health-check.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if backend is responding
check_backend() {
    # Check local first
    if curl -s -f "$LOCAL_URL" > /dev/null 2>&1; then
        return 0
    fi
    
    # Check external
    if curl -s -f "$BACKEND_URL" > /dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

# Check PM2 process
check_pm2() {
    cd "$DEPLOY_PATH" || return 1
    pm2 list | grep -q "summit-backend.*online" && return 0
    return 1
}

# Start backend with PM2
start_backend() {
    log "Starting backend..."
    cd "$DEPLOY_PATH" || return 1
    
    # Stop any existing process
    pm2 stop summit-backend 2>/dev/null
    pm2 delete summit-backend 2>/dev/null
    
    # Start with ecosystem.config.js if available, otherwise use dist/index.js
    if [ -f ecosystem.config.js ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start dist/index.js --name summit-backend --update-env
    fi
    
    pm2 save
    
    # Wait for startup
    sleep 10
    
    # Verify it started
    if pm2 list | grep -q "summit-backend.*online"; then
        log "Backend started successfully"
        return 0
    else
        log "ERROR: Backend failed to start"
        return 1
    fi
}

# Check frontend-backend connection (tests actual API, not just health)
check_connection() {
    # Test health endpoint with CORS (simplest test)
    if curl -s -f -H "Origin: https://summit.codingeverest.com" \
        "http://localhost:3000/health" > /dev/null 2>&1; then
        # Test actual API endpoint (like frontend would use)
        if curl -s -f -H "Origin: https://summit.codingeverest.com" \
            -H "Content-Type: application/json" \
            -X POST \
            -d '{"email":"healthcheck@test.com","password":"test"}' \
            "http://localhost:3000/api/auth/login" > /dev/null 2>&1; then
            return 0
        fi
        # Even if login fails, if we get 400/401 (not 500), connection works
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://summit.codingeverest.com" \
            -H "Content-Type: application/json" \
            -X POST \
            -d '{"email":"test@test.com","password":"test"}' \
            "http://localhost:3000/api/auth/login" 2>/dev/null)
        if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
            return 0  # Connection works, auth just failed
        fi
        if [ "$HTTP_CODE" = "500" ]; then
            return 1  # Backend error - connection issue
        fi
    fi
    return 1
}

# Fix CORS if needed
fix_cors() {
    log "Checking CORS configuration..."
    cd "$DEPLOY_PATH" || return 1
    
    # Check if CORS_ORIGIN includes summit.codingeverest.com
    if ! grep -q "summit.codingeverest.com" .env 2>/dev/null; then
        log "⚠️  CORS missing summit.codingeverest.com, fixing..."
        
        # Remove localhost from CORS if present
        sed -i 's|CORS_ORIGIN=.*localhost.*|CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com|' .env 2>/dev/null || \
        sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com|' .env 2>/dev/null || \
        echo "CORS_ORIGIN=https://www.codingeverest.com,https://codingeverest.com,https://summit.codingeverest.com" >> .env
        
        log "✅ CORS updated, restarting backend..."
        pm2 restart summit-backend --update-env
        sleep 10
        return 0
    fi
    
    return 0
}

# Main health check
main() {
    log "=== Health Check Started ==="
    
    # Check if backend is responding
    if check_backend; then
        log "✅ Backend is responding"
        
        # Check frontend-backend connection
        if ! check_connection; then
            log "❌ Frontend-backend connection FAILED"
            log "   Testing CORS configuration..."
            fix_cors
            
            # Test again after CORS fix
            sleep 5
            if check_connection; then
                log "✅ Connection fixed after CORS update"
            else
                log "❌ Connection still failing after CORS fix"
                log "   Check backend logs and CORS configuration"
            fi
        else
            log "✅ Frontend-backend connection working"
        fi
        
        # Still check PM2 to ensure it's managed
        if ! check_pm2; then
            log "⚠️  Backend responding but not managed by PM2, ensuring PM2 management..."
            start_backend
        fi
        
        log "✅ Health check passed"
        exit 0
    else
        log "❌ Backend is NOT responding"
        
        # Check PM2 status
        if ! check_pm2; then
            log "PM2 process not running, starting..."
            start_backend
        else
            log "PM2 process exists but backend not responding, restarting..."
            cd "$DEPLOY_PATH" || exit 1
            pm2 restart summit-backend --update-env
            sleep 10
        fi
        
        # Verify fix
        if check_backend; then
            log "✅ Backend fixed and responding"
            # Also check connection
            if check_connection; then
                log "✅ Connection working"
            else
                log "⚠️  Backend up but connection test failed, fixing CORS..."
                fix_cors
            fi
            exit 0
        else
            log "❌ Backend still not responding after fix attempt"
            exit 1
        fi
    fi
}

main "$@"

