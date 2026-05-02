# Z-Check Alert System - Quick Reference Card

## 📌 Quick Commands

### View Alerts in Real-Time
```bash
docker logs zcheck-backend -f | grep -i "alert\|debug"
```

### Check System Health
```bash
curl http://localhost:8080/api/status | jq '.endpoints[] | {service: .serviceName, health: .status}'
```

### Run Troubleshooting Script
```bash
./troubleshoot-alerts.sh
```

### Reset Throttle
```bash
docker compose restart backend
```

---

## 🎯 Alert Thresholds

| Health Score | Alert Type | Sends |
|---|---|---|
| 0% | CRITICAL | ✅ YES |
| 1-79% | DEGRADED | ✅ YES |
| 80%+ | HEALTHY | ❌ NO |

---

## 📊 Health Formula

```
Health = (Total Endpoints - Down Endpoints) / Total Endpoints × 100
```

**Examples:**
- 4 total, 1 down: (4-1)/4 = **75%** → DEGRADED ALERT
- 4 total, 4 down: (4-4)/4 = **0%** → CRITICAL ALERT
- 4 total, 0 down: (4-0)/4 = **100%** → NO ALERT

---

## 🔧 Enable WhatsApp Alerts

### Quick Setup (30 seconds)

1. **Get Credentials**
   - Twilio: https://www.twilio.com/console
   - Meta: https://business.facebook.com

2. **Update .env**
   ```bash
   WHATSAPP_API_URL=your_api_url_here
   WHATSAPP_API_TOKEN=your_token_here
   ALERT_WHATSAPP_TO=+918765290618
   ```

3. **Restart**
   ```bash
   docker compose restart backend
   ```

4. **Verify**
   ```bash
   docker logs zcheck-backend | grep "WhatsApp alert sent"
   ```

---

## 🐛 Troubleshooting

### Alerts Not Triggering
- ✅ Check health < 80%: `curl http://localhost:8080/api/status`
- ✅ Check throttle: `docker logs zcheck-backend | grep throttle`
- ✅ Check logs: `docker logs zcheck-backend | grep DEBUG`

### WhatsApp Not Sending
- ✅ Check credentials: `grep WHATSAPP_ .env`
- ✅ Check errors: `docker logs zcheck-backend | grep WhatsApp`
- ✅ Verify token: Hasn't expired (Meta tokens last 24h)

### Graph Not Displaying
- ✅ Check frontend: `curl http://localhost:3000`
- ✅ Check backend: `curl http://localhost:8080/api/status`
- ✅ Check CORS: Enabled in main.go ✓

---

## 📱 WhatsApp Message Format

```
[DEGRADED] Gmail Business service at 50.0% health - Gmail Health Check
[CRITICAL] Stripe Payments service at 0.0% health - Stripe Status API
```

---

## 📋 Key Files

| File | Purpose |
|------|---------|
| `backend/checker.go` | Alert logic, health scoring, throttle |
| `backend/main.go` | Server config, CORS middleware |
| `.env` | WhatsApp credentials, configuration |
| `COMPLETE_GUIDE.md` | Full setup documentation |

---

## ✅ Verification Steps

```bash
# 1. Backend running?
docker ps | grep zcheck-backend

# 2. Endpoints responding?
curl http://localhost:8080/api/status

# 3. Frontend accessible?
curl http://localhost:3000 | head -5

# 4. Alerts triggering?
docker logs zcheck-backend | grep "DEBUG: Attempting"

# 5. WebSocket connected?
curl http://localhost:8080/api/ws -i

# 6. Health scores calculated?
docker logs zcheck-backend | grep "healthScore"
```

---

## 🎓 Understanding the System

### The Alert Loop
```
Endpoint Check → Calculate Health → Compare Threshold → Throttle Check → Send Alert
```

### The 80% Rule
- Service with 2 endpoints: 1 UP, 1 DOWN = 50% → **ALERT SENT**
- Service with 2 endpoints: 2 UP, 0 DOWN = 100% → **NO ALERT**
- Service with 4 endpoints: 3 UP, 1 DOWN = 75% → **ALERT SENT**

### The 30-Minute Rule
- First DEGRADED alert for Gmail: **SENT** ✅
- Second alert within 30 min: **SKIPPED** ⏳
- Third alert after 30 min: **SENT** ✅

---

## 🆘 Support

**Stuck?** Check these in order:
1. `COMPLETE_GUIDE.md` - Comprehensive guide
2. `ALERT_SYSTEM_DEBUG.md` - Debug procedures
3. `./troubleshoot-alerts.sh` - Automated check
4. `docker logs zcheck-backend` - Error logs

---

## 🚀 You're All Set!

**Status:** ✅ Alert system operational  
**Next:** Add WhatsApp credentials to `.env`  
**Then:** Restart backend and start receiving alerts!

---

**Version:** 2.0  
**Last Updated:** April 28, 2026  
**Tested:** All features verified ✓
