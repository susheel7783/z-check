#!/bin/bash

# Z-Check Debug & Setup Script
# This script will:
# 1. Verify all services are running
# 2. Check Neo4j graph data
# 3. Test API endpoints
# 4. Verify WhatsApp configuration
# 5. Restart services if needed

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Z-Check Debug & WhatsApp Alert Setup Guide         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check if Docker services are running
echo -e "${BLUE}[1/6] Checking Docker services...${NC}"
if ! docker ps | grep -q zcheck-backend; then
    echo -e "${RED}✗ Backend not running. Starting services...${NC}"
    docker compose up --build -d
    sleep 10
else
    echo -e "${GREEN}✓ Backend running${NC}"
fi

if ! docker ps | grep -q zcheck-frontend; then
    echo -e "${RED}✗ Frontend not running${NC}"
else
    echo -e "${GREEN}✓ Frontend running${NC}"
fi

if ! docker ps | grep -q zcheck-neo4j; then
    echo -e "${RED}✗ Neo4j not running${NC}"
else
    echo -e "${GREEN}✓ Neo4j running${NC}"
fi

echo ""

# 2. Test API endpoints
echo -e "${BLUE}[2/6] Testing API endpoints...${NC}"

# Health check
HEALTH=$(curl -s http://localhost:8080/health | jq -r '.status' 2>/dev/null || echo "FAIL")
if [ "$HEALTH" = "ok" ]; then
    echo -e "${GREEN}✓ Backend health check: OK${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

# Get endpoints with graph data
ENDPOINTS=$(curl -s http://localhost:8080/api/status 2>/dev/null | jq '.endpoints' 2>/dev/null || echo "[]")
ENDPOINT_COUNT=$(echo "$ENDPOINTS" | jq 'length' 2>/dev/null || echo "0")

if [ "$ENDPOINT_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✓ Found $ENDPOINT_COUNT endpoints${NC}"
    
    # Check if endpoints have organization/service data
    HAS_ORG=$(echo "$ENDPOINTS" | jq '.[0].organizationName' 2>/dev/null || echo "null")
    HAS_SERVICE=$(echo "$ENDPOINTS" | jq '.[0].serviceName' 2>/dev/null || echo "null")
    
    if [ "$HAS_ORG" != "null" ] && [ "$HAS_SERVICE" != "null" ]; then
        echo -e "${GREEN}✓ Graph data present (org + service relationships loaded)${NC}"
    else
        echo -e "${YELLOW}⚠ Graph data missing - relationships may not be established${NC}"
        echo "  Sample endpoint: $(echo "$ENDPOINTS" | jq '.[0]' 2>/dev/null)"
    fi
else
    echo -e "${RED}✗ No endpoints found${NC}"
fi

echo ""

# 3. Check Neo4j graph
echo -e "${BLUE}[3/6] Checking Neo4j graph structure...${NC}"

NEO4J_NODES=$(curl -s -u neo4j:password http://localhost:7474/db/neo4j/summary \
    -H "Content-Type: application/json" \
    -X POST -d '{"statements":[{"statement":"MATCH (n) RETURN count(n) as count"}]}' \
    2>/dev/null | jq '.results[0].data[0].row[0]' 2>/dev/null || echo "0")

NEO4J_RELS=$(curl -s -u neo4j:password http://localhost:7474/db/neo4j/summary \
    -H "Content-Type: application/json" \
    -X POST -d '{"statements":[{"statement":"MATCH ()-[r]->() RETURN count(r) as count"}]}' \
    2>/dev/null | jq '.results[0].data[0].row[0]' 2>/dev/null || echo "0")

echo -e "${GREEN}✓ Neo4j nodes: $NEO4J_NODES${NC}"
echo -e "${GREEN}✓ Neo4j relationships: $NEO4J_RELS${NC}"

if [ "$NEO4J_RELS" -lt "4" ]; then
    echo -e "${YELLOW}⚠ Low relationship count. Setting up relationships...${NC}"
    cd neo4j
    chmod +x ../setup-relationships.sh
    ../setup-relationships.sh
    cd ..
    sleep 5
fi

echo ""

# 4. Check frontend
echo -e "${BLUE}[4/6] Testing frontend...${NC}"

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Frontend accessible (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}✗ Frontend not responding (HTTP $FRONTEND_STATUS)${NC}"
fi

echo ""

# 5. WhatsApp Alert Configuration
echo -e "${BLUE}[5/6] WhatsApp Alert Configuration${NC}"
echo ""
echo "Your phone number: ${YELLOW}+918765290618${NC}"
echo ""
echo "To enable WhatsApp alerts, you have TWO options:"
echo ""
echo -e "${YELLOW}Option 1: Twilio WhatsApp Sandbox (FREE - Recommended for testing)${NC}"
echo "  1. Sign up at https://www.twilio.com/console (free trial)"
echo "  2. Go to Console → Messaging → Services → Create Service"
echo "  3. Enable WhatsApp Sandbox integration"
echo "  4. Add your number: +918765290618"
echo "  5. Copy Account SID and Auth Token"
echo "  6. Update .env file:"
echo "     WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json"
echo "     WHATSAPP_API_TOKEN={Auth Token}"
echo ""
echo -e "${YELLOW}Option 2: Meta WhatsApp Business API${NC}"
echo "  1. Get a phone number ID from Meta Business Platform"
echo "  2. Get a user access token"
echo "  3. Update .env file:"
echo "     WHATSAPP_API_URL=https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
echo "     WHATSAPP_API_TOKEN={Your Token}"
echo ""
echo -e "${BLUE}Current .env settings:${NC}"
grep -E "WHATSAPP_|ALERT_WHATSAPP" .env 2>/dev/null || echo "No WhatsApp config found"

echo ""

# 6. Trigger a test alert
echo -e "${BLUE}[6/6] Testing alert system...${NC}"
echo ""
echo "To test if alerts work:"
echo -e "${YELLOW}1. Trigger a manual check:${NC}"
echo "   curl -X POST http://localhost:8080/api/test-check \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"id\": \"ep-stripe-status\"}'"
echo ""
echo -e "${YELLOW}2. Watch for alerts on dashboard:${NC}"
echo "   - Toast notification (top-right)"
echo "   - Live Feed (bottom of dashboard)"
echo "   - WebSocket connection"
if [ -n "$(grep WHATSAPP_API_TOKEN .env 2>/dev/null | grep -v '^#' | cut -d'=' -f2)" ]; then
    echo "   - WhatsApp message to +918765290618"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:3000 in browser"
echo "  2. You should see the dependency graph on the right"
echo "  3. Click 'Check Now' on any endpoint to trigger an alert"
echo "  4. Configure WhatsApp token if you want SMS alerts"
echo "  5. Rebuild and restart: docker compose up --build -d"
echo ""
