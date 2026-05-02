#!/bin/bash

# Alert System Troubleshooting Guide for Z-Check

echo "🔍 Z-Check Alert System Troubleshooting"
echo "======================================="
echo ""

# Check 1: Backend is running
echo "1️⃣  Checking backend container..."
if docker ps | grep -q "zcheck-backend"; then
    echo "✅ Backend container is running"
else
    echo "❌ Backend container is NOT running"
    echo "   Fix: docker compose up -d backend"
    exit 1
fi

# Check 2: Get current endpoint statuses
echo ""
echo "2️⃣  Current Endpoint Health Scores:"
curl -s http://localhost:8080/api/status | jq -r '.endpoints[] | "\(.serviceName): \(.status)"' | sort | uniq -c

# Check 3: Check environment variables
echo ""
echo "3️⃣  WhatsApp Configuration Status:"
source /Users/susheelkumar/Library/Mobile\ Documents/com~apple~CloudDocs/z-check/.env

if [ -z "$WHATSAPP_API_TOKEN" ]; then
    echo "⚠️  WHATSAPP_API_TOKEN is NOT set"
    echo "   → Alerts will be logged but NOT sent via WhatsApp"
else
    echo "✅ WHATSAPP_API_TOKEN is set"
fi

if [ -z "$WHATSAPP_API_URL" ]; then
    echo "⚠️  WHATSAPP_API_URL is NOT set"
else
    echo "✅ WHATSAPP_API_URL is set"
fi

if [ -z "$ALERT_WHATSAPP_TO" ]; then
    echo "⚠️  ALERT_WHATSAPP_TO is NOT set"
else
    echo "✅ ALERT_WHATSAPP_TO is set to: $ALERT_WHATSAPP_TO"
fi

# Check 4: Recent logs
echo ""
echo "4️⃣  Recent Alert Logs (last 10 lines):"
docker logs zcheck-backend --tail 10 2>/dev/null | grep -i "alert\|debug\|trigger" || echo "   No recent alert logs found"

# Check 5: Alert threshold explanation
echo ""
echo "5️⃣  Alert Threshold Information:"
echo "   • DEGRADED Alert: Health < 80%"
echo "   • CRITICAL Alert: Health = 0%"
echo "   • Throttle: 30 minutes between alerts per service"
echo ""

# Check 6: Test manual check
echo "6️⃣  Testing Manual Endpoint Check:"
echo "   Running: curl -X POST -H 'Content-Type: application/json' -d '{\"id\": \"ep-salesforce-api\"}' http://localhost:8080/api/test-check"
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{"id": "ep-salesforce-api"}' http://localhost:8080/api/test-check)
if echo "$RESPONSE" | grep -q "queued"; then
    echo "✅ Manual check queued successfully"
    echo "   Response: $RESPONSE"
else
    echo "❌ Manual check failed"
    echo "   Response: $RESPONSE"
fi

echo ""
echo "======================================="
echo "Troubleshooting Complete"
echo ""
echo "📝 Next Steps:"
echo "1. Check 'docker logs zcheck-backend' for DEBUG messages"
echo "2. If WhatsApp not configured, alerts appear in logs only"
echo "3. To reset throttle: docker compose restart backend"
echo "4. To force CRITICAL alert: Break all endpoints in a service"
