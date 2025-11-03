#!/bin/bash

echo "🔍 Testing different Node.js Alpine versions..."

# Array of versions to test
VERSIONS=(
    "node:20-alpine3.21"
    "node:20.18-alpine3.21"
    "node:20-alpine3.20"
    "node:20.11.1-alpine3.19"
    "node:current-alpine3.21"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

for version in "${VERSIONS[@]}"; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Testing: $version${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Pull image
    echo "Pulling image..."
    docker pull "$version" > /dev/null 2>&1
    
    # Scan for vulnerabilities
    echo "Scanning for vulnerabilities..."
    
    # Run scout and capture output
    SCAN_OUTPUT=$(docker scout cves "$version" 2>&1)
    
    # Count vulnerabilities
    CRITICAL=$(echo "$SCAN_OUTPUT" | grep -oi "critical" | wc -l)
    HIGH=$(echo "$SCAN_OUTPUT" | grep -oi "high" | wc -l)
    MEDIUM=$(echo "$SCAN_OUTPUT" | grep -oi "medium" | wc -l)
    LOW=$(echo "$SCAN_OUTPUT" | grep -oi "low" | wc -l)
    
    # Display results
    echo ""
    echo "Results for $version:"
    
    if [ "$CRITICAL" -gt 0 ]; then
        echo -e "  ${RED}❌ Critical: $CRITICAL${NC}"
    else
        echo -e "  ${GREEN}✅ Critical: 0${NC}"
    fi
    
    if [ "$HIGH" -gt 0 ]; then
        echo -e "  ${RED}⚠️  High: $HIGH${NC}"
    else
        echo -e "  ${GREEN}✅ High: 0${NC}"
    fi
    
    echo -e "  ${YELLOW}ℹ️  Medium: $MEDIUM${NC}"
    echo -e "  ℹ️  Low: $LOW"
    
    # Recommendation
    if [ "$CRITICAL" -eq 0 ] && [ "$HIGH" -eq 0 ]; then
        echo -e "  ${GREEN}✅ RECOMMENDED${NC}"
    else
        echo -e "  ${RED}❌ NOT RECOMMENDED${NC}"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Scan completed!"
echo ""
echo "Recommendation: Use the version with 0 critical and 0 high vulnerabilities"