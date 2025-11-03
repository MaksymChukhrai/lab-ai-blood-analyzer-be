#!/bin/bash

echo "🔍 Scanning Docker images for vulnerabilities..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to scan image
scan_image() {
    local image=$1
    echo ""
    echo "Scanning: $image"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if docker scout cves "$image" > /tmp/scout-scan.txt 2>&1; then
        # Check for high/critical vulnerabilities
        HIGH=$(grep -c "high" /tmp/scout-scan.txt || true)
        CRITICAL=$(grep -c "critical" /tmp/scout-scan.txt || true)
        
        if [ "$CRITICAL" -gt 0 ]; then
            echo -e "${RED}❌ CRITICAL vulnerabilities found: $CRITICAL${NC}"
            cat /tmp/scout-scan.txt
            return 1
        elif [ "$HIGH" -gt 0 ]; then
            echo -e "${YELLOW}⚠️  HIGH vulnerabilities found: $HIGH${NC}"
            cat /tmp/scout-scan.txt
        else
            echo -e "${GREEN}✅ No critical/high vulnerabilities found${NC}"
        fi
    else
        echo -e "${RED}❌ Scan failed for $image${NC}"
        cat /tmp/scout-scan.txt
        return 1
    fi
}

# Build images
echo "🔨 Building images..."
docker build -t blood-test-backend:latest -f Dockerfile .
docker build -t blood-test-backend:dev -f Dockerfile.dev .

# Scan base image
echo ""
echo "📦 Scanning base image..."
scan_image "node:20.11.1-alpine3.19"

# Scan production image
echo ""
echo "🚀 Scanning production image..."
scan_image "blood-test-backend:latest"

# Scan development image
echo ""
echo "🛠️  Scanning development image..."
scan_image "blood-test-backend:dev"

# Cleanup
rm -f /tmp/scout-scan.txt

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Security scan completed!"