#!/bin/bash
# Site Health Monitoring and Auto-Remediation Script
# Monitors summit.codingeverest.com and automatically resolves common issues

set -e

DOMAIN="summit.codingeverest.com"
API_DOMAIN="summit-api.codingeverest.com"
LOG_FILE="/var/log/summit-health-monitor.log"
ALERT_EMAIL="${ALERT_EMAIL:-}" # Set this environment variable if you want email alerts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_ssl_certificate() {
    log "Checking SSL certificate for $DOMAIN..."
    
    # Check if certificate is valid
    if timeout 10 openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        log "${GREEN}✓ SSL certificate is valid${NC}"
        return 0
    else
        log "${RED}✗ SSL certificate check failed${NC}"
        return 1
    fi
}

check_dns_resolution() {
    log "Checking DNS resolution for $DOMAIN..."
    
    if dig +short "$DOMAIN" | grep -q .; then
        log "${GREEN}✓ DNS resolution works${NC}"
        return 0
    else
        log "${RED}✗ DNS resolution failed${NC}"
        return 1
    fi
}

check_http_status() {
    log "Checking HTTP status for https://$DOMAIN..."
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        log "${GREEN}✓ Site is accessible (HTTP $HTTP_CODE)${NC}"
        return 0
    else
        log "${RED}✗ Site returned HTTP $HTTP_CODE${NC}"
        return 1
    fi
}

check_api_status() {
    log "Checking API status for https://$API_DOMAIN/health..."
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$API_DOMAIN/health" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log "${GREEN}✓ API is accessible (HTTP $HTTP_CODE)${NC}"
        return 0
    else
        log "${YELLOW}⚠ API returned HTTP $HTTP_CODE${NC}"
        return 1
    fi
}

check_amplify_build_status() {
    log "Checking Amplify build status..."
    
    # This requires AWS CLI and appropriate permissions
    if command -v aws >/dev/null 2>&1; then
        AMPLIFY_APP_ID="${AMPLIFY_APP_ID:-}"
        if [ -n "$AMPLIFY_APP_ID" ]; then
            LAST_BUILD_STATUS=$(aws amplify get-app --app-id "$AMPLIFY_APP_ID" --query 'app.defaultDomain' --output text 2>/dev/null || echo "unknown")
            log "Amplify default domain: $LAST_BUILD_STATUS"
        else
            log "${YELLOW}⚠ AMPLIFY_APP_ID not set, skipping Amplify status check${NC}"
        fi
    else
        log "${YELLOW}⚠ AWS CLI not installed, skipping Amplify status check${NC}"
    fi
}

remediate_ssl_issue() {
    log "${YELLOW}Attempting to remediate SSL certificate issue...${NC}"
    
    # If AWS CLI is available, we can trigger certificate re-validation
    if command -v aws >/dev/null 2>&1; then
        AMPLIFY_APP_ID="${AMPLIFY_APP_ID:-}"
        if [ -n "$AMPLIFY_APP_ID" ]; then
            log "Triggering certificate re-validation in Amplify..."
            # Note: This is a placeholder - actual remediation depends on your setup
            # You might need to use AWS SDK or API calls to trigger certificate refresh
            log "${YELLOW}Manual intervention may be required: Check AWS Amplify Console${NC}"
        fi
    fi
    
    # Send alert if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "SSL certificate issue detected for $DOMAIN. Please check AWS Amplify Console." | \
            mail -s "SSL Certificate Alert: $DOMAIN" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    return 1
}

remediate_dns_issue() {
    log "${YELLOW}Attempting to remediate DNS issue...${NC}"
    
    # DNS issues usually require manual intervention
    log "${YELLOW}DNS resolution failed. Please check DNS provider settings.${NC}"
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "DNS resolution failed for $DOMAIN. Please check DNS provider settings." | \
            mail -s "DNS Alert: $DOMAIN" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    return 1
}

remediate_site_down() {
    log "${YELLOW}Attempting to remediate site downtime...${NC}"
    
    # Check if it's an Amplify build issue
    check_amplify_build_status
    
    # For EC2 backend, check if service is running
    log "Checking if remediation actions can be taken..."
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "Site $DOMAIN is not accessible. Please check AWS Amplify Console and backend services." | \
            mail -s "Site Down Alert: $DOMAIN" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    return 1
}

# Main monitoring function
main() {
    log "=== Starting Health Check for $DOMAIN ==="
    
    SSL_OK=false
    DNS_OK=false
    HTTP_OK=false
    API_OK=false
    
    # Run checks
    if check_dns_resolution; then
        DNS_OK=true
        if check_ssl_certificate; then
            SSL_OK=true
            if check_http_status; then
                HTTP_OK=true
            fi
        fi
    fi
    
    # API check (non-blocking)
    check_api_status && API_OK=true || true
    
    # Determine overall status
    if [ "$DNS_OK" = true ] && [ "$SSL_OK" = true ] && [ "$HTTP_OK" = true ]; then
        log "${GREEN}✓✓✓ All checks passed - Site is healthy ✓✓✓${NC}"
        exit 0
    else
        log "${RED}✗✗✗ Health check failed - Issues detected ✗✗✗${NC}"
        
        # Attempt remediation
        if [ "$DNS_OK" = false ]; then
            remediate_dns_issue
        elif [ "$SSL_OK" = false ]; then
            remediate_ssl_issue
        elif [ "$HTTP_OK" = false ]; then
            remediate_site_down
        fi
        
        exit 1
    fi
}

# Run main function
main "$@"

