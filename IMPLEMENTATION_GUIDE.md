# Z-Check: Customer Implementation Guide

## Pre-Sales (Week 1)

### Step 1: Evaluate Z-Check
1. Deploy locally: `docker compose up --build`
2. Access dashboard: http://localhost:3000
3. Review demo with 5 sample APIs
4. Explore PRODUCT_OVERVIEW.md and SALES_ONE_PAGER.md

**Questions to discuss with vendor:**
- Pricing for your API volume?
- SLA uptime guarantees?
- Data residency options?
- Custom integration support?

### Step 2: ROI Calculation
Use our calculator (or manual):
```
Annual ROI = (Outage Incidents/Year × Cost Per Incident) 
           + (Tool Consolidation Savings) 
           + (Vendor Renegotiation Savings)
           - (Z-Check Annual Cost)
```

**Example (E-commerce):**
```
5 outages × $100K cost = $500K
Replace 3 tools = $150K savings
Renegotiate with vendors = $50K savings
Z-Check cost = ($2K × 12) = $24K
─────────────────────────────
Annual ROI = $676K - $24K = $652K
```

### Step 3: Proof of Concept Agreement
- 30-day trial (free or discounted)
- Z-Check will map 5-10 critical workflows
- You'll run with your actual APIs
- Success metrics: MTTR reduction, alert accuracy

---

## Implementation (Weeks 2-4)

### Phase 1: Deployment (Day 1)
**Effort: 2-4 hours**

**Option A: SaaS Deployment**
1. Sign up at z-check.io
2. Configure DNS/SSL
3. Add team members
4. Done!

**Option B: Self-Hosted (Kubernetes)**
1. Prepare Kubernetes cluster (GKE, EKS, AKS)
2. Update `k8s/` manifests with your domain
3. `kubectl apply -f k8s/`
4. Configure ingress, TLS certificates
5. Test health endpoints

**Option C: Docker Compose**
1. Deploy to your server
2. Configure `.env` with secrets
3. Set up reverse proxy (nginx)
4. Configure SSL

### Phase 2: API Inventory (Days 2-3)
**Effort: 4-8 hours**

Build your API list with critical details:

| API Name | URL | Check Interval | Owner | Criticality |
|----------|-----|---|-------|-------------|
| Stripe Payments | https://api.stripe.com/v1/status | 30s | Finance | Critical |
| Salesforce CRM | https://yourorg.salesforce.com/api/v57 | 60s | Sales | High |
| Auth0 | https://auth.yourcompany.auth0.com/test | 30s | Eng | Critical |
| Mixpanel | https://api.mixpanel.com/health | 5m | Product | Low |
| AWS STS | https://sts.amazonaws.com/health | 60s | Ops | Critical |

**Pro tip**: Start with 10-15 high-criticality APIs. Add more once you see value.

### Phase 3: Add APIs to Z-Check (Days 4-6)
**Effort: 2-4 hours**

**Via Dashboard UI:**
1. Login to Z-Check dashboard
2. Click "Add Endpoint"
3. Enter URL, check interval, API type
4. Test connection
5. Save

**Via API:**
```bash
curl -X POST http://localhost:8080/api/endpoints \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stripe Payments",
    "url": "https://api.stripe.com/v1/status",
    "method": "GET",
    "type": "http",
    "check_interval": 30
  }'
```

**Bulk Import (if you have 50+ APIs):**
We can provide a CSV template and script.

### Phase 4: Define Dependencies (Days 7-8)
**Effort: 4-6 hours**

Map relationships between services:

**Example Structure:**
```
Organization: Acme Corp
├─ Service: Payment Processing
│  └─ Endpoints: Stripe, PayPal, Square
├─ Service: User Authentication
│  └─ Endpoints: Auth0, Google OAuth
└─ Service: Data Analytics
   └─ Endpoints: Mixpanel, Segment
```

**How to define:**
1. In dashboard, click "Service" > "Define Dependencies"
2. Select which APIs this service depends on
3. Set criticality level (Critical/High/Medium/Low)
4. Save

Z-Check uses this to calculate impact radius.

### Phase 5: Configure Alerting (Days 9-10)
**Effort: 1-2 hours**

**Email Alerts:**
```
ALERT_MODE=EMAIL_ONLY
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=apikey
EMAIL_PASSWORD=your-sendgrid-key
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=team@yourcompany.com,oncall@yourcompany.com
```

**Slack Integration:**
1. Create Slack incoming webhook: https://api.slack.com/messaging/webhooks
2. Add webhook URL to Z-Check configuration
3. Test: trigger a test alert
4. Receive notification in #alerts channel

**PagerDuty (for critical incidents):**
1. Create PagerDuty service
2. Get integration key
3. Add to Z-Check
4. High-severity alerts auto-page on-call engineer

**Webhook (custom integration):**
```json
{
  "url": "https://your-system.com/incident-webhook",
  "method": "POST",
  "headers": {"Authorization": "Bearer token"},
  "body": {
    "alert": "{{alert_message}}",
    "severity": "{{severity}}",
    "impact": "{{business_impact}}"
  }
}
```

### Phase 6: Configure SLA Tracking (Day 11)
**Effort: 1-2 hours**

Define service level agreements:

```json
{
  "stripe_payments": {
    "uptime_target": 99.9,
    "monthly_downtime_budget_minutes": 43.2,
    "critical_hours": "09:00-17:00 EST",
    "alert_threshold": 95.0
  }
}
```

### Phase 7: Team Training (Day 12)
**Effort: 1-2 hours**

1. **Engineering Team** (30 min):
   - How to view real-time status
   - How to acknowledge incidents
   - How to add new APIs
   - Integration with on-call processes

2. **Operations Team** (30 min):
   - Using dashboard for incident response
   - Understanding impact radius
   - Escalation procedures
   - SLA reporting

3. **Management** (15 min):
   - Reading business impact reports
   - Understanding SLA compliance
   - Vendor performance analysis

---

## Post-Implementation (Weeks 3-4)

### Day 13: UAT Testing
**Run through scenarios:**
- Simulate Stripe API downtime → confirm alert received
- Test escalation (if Stripe down 5 min, page oncall)
- Verify Slack notification formatting
- Check SLA report generation

### Day 14: Production Cutover
1. Confirm all APIs green on dashboard
2. Enable production alerting (if in test mode)
3. Decommission old monitoring tools (gradually)
4. Update runbooks to reference Z-Check

### Day 15: Handoff & Support
- Customer documentation provided
- Support channel established (email, Slack, etc.)
- Monthly business review scheduled
- Roadmap discussion

---

## Success Metrics

Track these to measure Z-Check value:

### Operational Metrics
- **MTTR (Mean Time To Resolve)**: Target 50-70% reduction
- **Alert Accuracy**: Target 95%+ (avoid false positives)
- **Incident Detection Time**: Typically 30-60 seconds

### Business Metrics
- **Revenue Protected**: Estimated downtime cost prevented
- **Tool Consolidation**: Number of tools replaced
- **Vendor Accountability**: Incidents tracked per vendor

### Sample Dashboard (after 90 days)
```
Total Incidents: 12
  - Average Detection Time: 45 seconds (was 30 min before)
  - Average MTTR: 15 minutes (was 45 min before)
  
Revenue Protected: $850K (5 incidents × avg $170K/hour)
Tool Savings: $120K (replaced 3 tools)
False Positives: 1 out of 50 alerts (98% accuracy)

Top Unreliable Vendors (for renegotiation):
  1. Vendor A: 4 incidents, 96.2% uptime (vs 99.9% SLA)
  2. Vendor B: 3 incidents, 98.1% uptime (vs 99.5% SLA)
```

---

## Ongoing Management

### Weekly
- Review alert trends
- Check for new false positives
- Add any new APIs discovered

### Monthly
- Run SLA compliance report
- Vendor performance review
- Incident post-mortems
- ROI update

### Quarterly
- Review roadmap/feature requests
- License renewal / upgrade planning
- Team training (new engineers)
- Budget justification

---

## Common Issues & Solutions

### Issue: "False Positive Alerts"
**Solution**: 
- Increase check interval for non-critical APIs (from 30s to 5m)
- Configure alert throttling (only alert if down 2+ consecutive checks)
- Exclude maintenance windows from alerts

### Issue: "Dashboard Slow"
**Solution**:
- Reduce number of endpoints monitored (start with top 20)
- Increase Neo4j database resources
- Enable query caching for common reports

### Issue: "Alert Noise"
**Solution**:
- Decrease alert channels (email only, not Slack)
- Increase alert threshold (alert only if critical impact detected)
- Configure DND (do-not-disturb) windows

### Issue: "Integrating with Existing Tools"
**Solution**:
- Use webhooks to send incidents to incident.io, PagerDuty, etc.
- REST API available for custom integrations
- Slack/Teams/Discord bots available

---

## Support & Resources

### Documentation
- **Setup Guide**: docs.z-check.io/setup
- **API Reference**: docs.z-check.io/api
- **Troubleshooting**: docs.z-check.io/troubleshoot

### Support Channels
- **Email**: support@z-check.io
- **Slack Community**: [join our slack]
- **Office Hours**: Fridays 2-3pm PT
- **Emergency**: +1 (555) 123-SUPPORT (24/7 for enterprise customers)

### Training
- **Self-paced Video Course**: 30 minutes
- **Live Onboarding Session**: Included with purchase
- **Advanced Training**: Available for enterprise customers

---

## Next Steps

1. **Week 1**: Evaluate and decide
2. **Week 2**: Sign contract, start deployment
3. **Week 3-4**: Implementation (follow phases above)
4. **Day 15**: Go live!
5. **Month 2+**: Optimization and expansion

**Questions?** Contact: sales@z-check.io

---

*Z-Check: Know Your Dependencies. Master Your Alerts. Protect Your Revenue.*
