#!/bin/bash
# Fix SSL Certificate for summit.codingeverest.com
# This script helps diagnose and fix SSL certificate issues

set -e

APP_ID="d1mhd5fnnjyucj"
DOMAIN="summit.codingeverest.com"
REGION="eu-west-1"
ZONE_ID="Z024513220PNY1F3PO6K5"

echo "============================================"
echo "Fix SSL Certificate for $DOMAIN"
echo "============================================"
echo ""

# Check domain status in Amplify
echo "[1/4] Checking Amplify domain configuration..."
DOMAIN_INFO=$(aws amplify list-domain-associations \
  --app-id $APP_ID \
  --region $REGION \
  --output json)

DOMAIN_STATUS=$(echo "$DOMAIN_INFO" | jq -r '.domainAssociations[0].domainStatus // "NOT_FOUND"')
CERT_VERIFICATION=$(echo "$DOMAIN_INFO" | jq -r '.domainAssociations[0].certificateVerificationDNSRecord // "N/A"')

echo "Domain Status: $DOMAIN_STATUS"
echo ""

if [ "$DOMAIN_STATUS" = "AVAILABLE" ]; then
  echo "✅ Domain is properly configured with SSL"
  exit 0
elif [ "$DOMAIN_STATUS" = "FAILED" ]; then
  echo "❌ Domain configuration failed"
  echo ""
  echo "Certificate validation record:"
  echo "$CERT_VERIFICATION"
  echo ""
  echo "Solution: Re-add the domain in Amplify Console"
  echo "1. Go to: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"
  echo "2. Click 'Domain management'"
  echo "3. Remove the domain"
  echo "4. Add it again"
  exit 1
fi

# Check DNS records
echo "[2/4] Checking DNS records..."
DNS_RECORDS=$(aws route53 list-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --query "ResourceRecordSets[?contains(Name, 'summit.codingeverest.com')]" \
  --output json)

echo "DNS Records:"
echo "$DNS_RECORDS" | jq '.[] | {Name, Type, ResourceRecords}'

# Check ACM certificates
echo ""
echo "[3/4] Checking SSL certificates in ACM..."
CERTS=$(aws acm list-certificates --region $REGION --output json)
SUMMIT_CERT=$(echo "$CERTS" | jq ".CertificateSummaryList[] | select(.DomainName == \"$DOMAIN\" or .DomainName == \"*.$DOMAIN\")")

if [ -n "$SUMMIT_CERT" ]; then
  CERT_STATUS=$(echo "$SUMMIT_CERT" | jq -r '.Status')
  CERT_DOMAIN=$(echo "$SUMMIT_CERT" | jq -r '.DomainName')
  echo "Found certificate for $CERT_DOMAIN: Status = $CERT_STATUS"
else
  echo "⚠️  No certificate found for $DOMAIN"
fi

# Test HTTPS
echo ""
echo "[4/4] Testing HTTPS connection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://$DOMAIN || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  echo "✅ HTTPS connection successful (HTTP $HTTP_CODE)"
else
  echo "❌ HTTPS connection failed (HTTP $HTTP_CODE)"
  echo ""
  echo "Next steps:"
  echo "1. Re-add domain in Amplify Console"
  echo "2. Wait 10-30 minutes for certificate provisioning"
  echo "3. Verify DNS records are correct"
fi

echo ""
echo "============================================"

