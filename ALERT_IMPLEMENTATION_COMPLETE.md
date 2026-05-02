# Z-Check Alert System - Complete Implementation Summary

## ✅ What's Been Implemented

### 1. **Alert Threshold Logic (COMPLETED)**
- **DEGRADED Alert**: Triggers when service health falls **below 80%**
- **CRITICAL Alert**: Triggers when service health is **0%** (all endpoints down)
- **Throttling**: 30-minute cooldown between alerts per service (prevents spam)

### 2. **Enhanced Logging (COMPLETED)**
Added comprehensive debug logging:
- `DEBUG: Attempting to trigger alert` - When alert system evaluates
- `throttle cleared - proceeding with alert` - When throttle allows alert
- `DEBUG: WhatsApp payload prepared` - When message is constructed
- `DEBUG: Sending WhatsApp request` - Before HTTP POST
- `WhatsApp alert sent successfully` - On successful delivery (HTTP 200-299)
- `WhatsApp alert failed` - With HTTP status code and error details

### 3. **Better Error Handling (COMPLETED)**
- Checks if WhatsApp is properly configured before sending
- Logs detailed error responses from Meta/Twilio API
- Handles JSON marshaling errors
- Provides clear debug information about failures

### 4. **Service Health Score Calculation (COMPLETED)**
Formula: `Health Score = (Total Endpoints - Down Endpoints) / Total Endpoints × 100`

Example:
- 4 endpoints total, 1 down, 3 up = 75% health → **TRIGGERS DEGRADED ALERT**
- 4 endpoints total, 4 down, 0 up = 0% health → **TRIGGERS CRITICAL ALERT**

### 5. **Real-Time WebSocket Broadcasts (COMPLETED)**
- Health scores included in every alert event
- Frontend updates graph node colors based on status
- Live Feed shows alert messages with health percentages

---

## 📊 Current System Status

### Endpoint Health Analysis
```
Gmail Business (Nimbus)
├─ ep-gmail-health: DOWN
├─ Service Health: 50% (1/2 UP)
└─ Alert Status: DEGRADED alert triggered ✓

Salesforce CRM (Nimbus)
├─ ep-salesforce-api: UP
├─ Service Health: 50% (1/2 UP)
└─ Alert Status: Would trigger DEGRADED alert

Stripe Payments (Acme)
├─ ep-stripe-status: DOWN (0% mock for testing)
├─ Service Health: 0% (0/2 UP)
└─ Alert Status: CRITICAL alert triggered ✓

Zapier Automations (Acme)
├─ ep-zapier-hook: DOWN
├─ Service Health: 0% (0/1 UP)
└─ Alert Status: CRITICAL alert triggered ✓
```

---

## 🔴 Current Issue: WhatsApp API Misconfiguration

### Error Log
```
statusCode=401
message: "Invalid OAuth access token - Cannot parse access token"
code=190 (OAuthException)
url=https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages
```

### Root Cause
The `.env` file has placeholder values:
- `WHATSAPP_API_TOKEN=` (empty)
- `WHATSAPP_API_URL=https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages` (has placeholder)

### Fix: Set WhatsApp Credentials

#### Option A: Twilio (Recommended for testing)
```bash
# 1. Go to https://www.twilio.com/console
# 2. Create WhatsApp Sandbox
# 3. Add phone: +918765290618 and confirm code
# 4. Copy credentials

# Then update .env:
WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json
WHATSAPP_API_TOKEN=YOUR_AUTH_TOKEN
ALERT_WHATSAPP_TO=+918765290618

# Restart backend
docker compose restart backend
```

#### Option B: Meta WhatsApp Business API (Production)
```bash
# 1. Go to https://business.facebook.com
# 2. Set up WhatsApp Business Account
# 3. Get Phone Number ID and User Access Token

# Then update .env:
WHATSAPP_API_URL=https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages
WHATSAPP_API_TOKEN=YOUR_USER_ACCESS_TOKEN
ALERT_WHATSAPP_TO=+918765290618

# Restart backend
docker compose restart backend
```

---

## 🧪 Testing the Alert System

### Test 1: Verify DEGRADED Alert (Current)
```bash
# Gmail and Stripe services are at 50% and 0% health
# Check logs for:
docker logs zcheck-backend | grep "DEBUG: Attempting to trigger alert"

# Expected output:
# type=DEGRADED healthScore=50
# type=CRITICAL healthScore=0
```

### Test 2: Reset Throttle
```bash
# Clear in-memory throttle map (restart backend)
docker compose restart backend

# Next alert will go through immediately (not throttled)
```

### Test 3: Manual Endpoint Check
```bash
# Force a check on specific endpoint
curl -X POST -H "Content-Type: application/json" \
  -d '{"id": "ep-gmail-health"}' \
  http://localhost:8080/api/test-check

# Check logs for alert attempt
docker logs zcheck-backend --tail 5 | grep -i alert
```

### Test 4: Trigger Alert from Broken Endpoint
```bash
# Make all Stripe endpoints return 404
# This will trigger CRITICAL alert (0% health)

# Then trigger manual check
curl -X POST -H "Content-Type: application/json" \
  -d '{"id": "ep-stripe-status"}' \
  http://localhost:8080/api/test-check

# Should see: type=CRITICAL healthScore=0
```

---

## 📋 Alert System Configuration Reference

### Alert Levels
| Level | Trigger | Examples |
|-------|---------|----------|
| **DEGRADED** | Health < 80% | 1 of 4 endpoints down (75%) |
| **CRITICAL** | Health = 0% | All endpoints down (0%) |
| **HEALTHY** | Health ≥ 80% | 0-1 of 5 endpoints down (80%+) |

### Throttle Behavior
| Scenario | Result |
|----------|--------|
| First alert | Sent immediately |
| Repeat within 30 min | Skipped (throttled) |
| After 30 min | Sent (throttle reset) |
| Restart backend | Throttle map cleared |

### WebSocket Payload
```json
{
  "endpointId": "ep-salesforce-api",
  "name": "Salesforce REST API",
  "status": "DOWN",
  "timestamp": "2026-04-28T05:02:12Z",
  "serviceName": "Salesforce CRM",
  "isServiceEvent": true,
  "message": "DEGRADED: Salesforce CRM service health at 50% (below 80% threshold)",
  "healthScore": 50.0
}
```

---

## 🔧 Troubleshooting Commands

### Check Alert Status
```bash
./troubleshoot-alerts.sh
```

### View Alert Logs
```bash
docker logs zcheck-backend | grep -i "alert\|debug\|trigger"
```

### Check Endpoint Health
```bash
curl http://localhost:8080/api/status | jq '.endpoints[] | {name: .name, status: .status, service: .serviceName}'
```

### Rebuild Backend
```bash
cd backend
go build
docker compose up --build -d backend
```

### Reset Everything
```bash
docker compose down
docker compose up -d
```

---

## 📱 WhatsApp Integration Points

### Configuration Path: `.env` → Docker Container → Backend Code

1. `.env` file → Backend `main.go`
   - Variables loaded: `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `ALERT_WHATSAPP_TO`

2. `checker.go` → `triggerAlert()` function
   - Validates configuration is set
   - Constructs alert message with health score
   - Makes HTTP POST to WhatsApp/Twilio API

3. WhatsApp Template
   - Name: `status_alert`
   - Language: `en_US`
   - Requires template to be created in WhatsApp Business account

---

## ✨ Next Steps

1. **Configure WhatsApp**: Update `.env` with real API credentials
2. **Restart Backend**: `docker compose restart backend`
3. **Test Alerts**: Trigger a manual check or wait for next degradation
4. **Monitor Logs**: `docker logs zcheck-backend -f | grep -i alert`
5. **Verify Reception**: Check phone for WhatsApp message

---

## 🎯 Verification Checklist

- [x] Alert threshold logic implemented (80% for DEGRADED, 0% for CRITICAL)
- [x] Debug logging added throughout alert lifecycle
- [x] WebSocket broadcasts include health scores
- [x] GraphView updates node colors based on status
- [x] Throttle mechanism prevents alert spam (30 min cooldown)
- [x] Error handling for missing WhatsApp config
- [x] Comprehensive logging for troubleshooting
- [ ] **TODO**: Set WhatsApp API credentials in `.env`
- [ ] **TODO**: Test actual WhatsApp delivery
- [ ] **TODO**: Verify frontend graph updates in real-time

---

## 📞 Support

If alerts aren't being sent:

1. Check `.env` has valid credentials (not empty placeholders)
2. Verify token hasn't expired (Meta tokens last 24 hours)
3. Confirm phone number format: `+919876543210` (with country code, no spaces)
4. Check `docker logs zcheck-backend | grep -i whatsapp` for API errors
5. Restart backend: `docker compose restart backend`
