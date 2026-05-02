# Alert System Debug Guide

## Current System Status

### Alert Threshold Logic
- **DEGRADED Alert**: Triggered when service health < 80%
- **CRITICAL Alert**: Triggered when service health = 0% (all endpoints down)
- **Throttle Duration**: 30 minutes (prevents spam)

### Current Endpoint Health

```
Gmail Business:     50% (1/2 UP)  → WOULD trigger DEGRADED alert
Salesforce CRM:     50% (1/2 UP)  → WOULD trigger DEGRADED alert  
Stripe Payments:   100% (2/2 UP)  → No alert
Zapier:              0% (0/2 UP)  → Would trigger CRITICAL alert
```

## How to Test Alerts

### Option 1: Test DEGRADED Alert (Health < 80%)
1. Current system has 2 services below 80%
2. Check logs for: `DEBUG: Attempting to trigger alert`
3. If WhatsApp not configured, you'll see: `WhatsApp not fully configured, skipping WhatsApp send`

### Option 2: Force CRITICAL Alert (Health = 0%)
1. Break all Stripe endpoints:
   ```bash
   docker exec zcheck-neo4j bin/cypher-shell -u neo4j -p password
   MATCH (ep:Endpoint {id: 'ep-stripe-status'}) SET ep.url = 'https://httpbin.org/status/500'
   ```
2. Wait 60 seconds for next check cycle
3. Look for: `CRITICAL: Stripe Payments service is completely unreachable`

### Option 3: Manual Endpoint Check
```bash
curl -X POST -H "Content-Type: application/json" -d '{"id": "ep-gmail-health"}' http://localhost:8080/api/test-check
```

## Debug Logs

Look for these log patterns in `docker logs zcheck-backend`:

```
✓ Alert triggered:
  "DEBUG: Attempting to trigger alert" 
  "throttle cleared - proceeding with alert"
  "WhatsApp alert sent successfully"

✗ Alert skipped:
  "WhatsApp not fully configured, skipping WhatsApp send"
  "skipping alert due to throttling"

✗ Alert failed:
  "WhatsApp alert failed"
  "alert dispatch failed"
```

## WhatsApp Configuration Checklist

- [ ] `WHATSAPP_API_TOKEN` is set (Bearer token from Twilio/Meta)
- [ ] `WHATSAPP_API_URL` points to correct endpoint
- [ ] `ALERT_WHATSAPP_TO` includes country code (e.g., +918765290618)
- [ ] Token is not expired (Meta tokens last 24 hours)
- [ ] Message template is created in WhatsApp Business account

## Reset Throttle (Force New Alert)

```bash
docker compose down backend
docker compose up --build -d backend
```

This restarts the backend and clears the in-memory throttle map, allowing the next alert through immediately.

## Health Score Calculation

For a service with endpoints:
- Total endpoints: 4
- UP endpoints: 3
- DOWN endpoints: 1
- **Health Score = (4 - 1) / 4 × 100 = 75%**

Alert triggers if: `75% < 80%` → **YES, DEGRADED alert sent**
