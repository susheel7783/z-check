# Z-Check: Sales Quick Reference

## Elevator Pitch (30 seconds)

**"Z-Check is a real-time monitoring platform that tells you not just WHEN an API fails, but WHICH of your business processes are affected. It's like having a master dashboard that automatically maps all your service dependencies and alerts your team with business context, not just technical status."**

---

## For Sales Calls

### Discovery Questions (Ask These First)

1. **"How many third-party APIs does your company depend on?"**
   - Answer: 20-500+ → Perfect fit for Z-Check

2. **"What's your current approach to monitoring them?"**
   - Answers: Manual, Datadog, New Relic, custom scripts → Opportunity!

3. **"Have you ever had an API go down and it took you a long time to realize which of your services were affected?"**
   - Answer: Yes → Z-Check solves this directly

4. **"What's your estimated cost of a 1-hour outage?"**
   - Answer: > $50K → ROI is obvious

5. **"Are you comfortable with SaaS or do you need on-premise?"**
   - Answer: SaaS → Easier sale. On-premise → Longer deal, higher price.

### Positioning Against Competitors

**vs Datadog:**
- ❌ Datadog: Great for app monitoring, overkill for API monitoring
- ✅ Z-Check: Specialized for API dependencies, 20-30% cheaper

**vs New Relic:**
- ❌ New Relic: APM-focused, not API-focused
- ✅ Z-Check: Automatic dependency mapping, easier to use

**vs Pingdom/UptimeRobot:**
- ❌ Pingdom: Just tells you if API is up/down
- ✅ Z-Check: Shows business impact when it's down

**vs Homegrown Solution:**
- ❌ Custom scripts: Fragile, needs maintenance, no dependency mapping
- ✅ Z-Check: Proven platform, ongoing updates, community support

### Pain Points to Probe

- "How long does it typically take to detect an API failure?" (Goal: <2min with Z-Check)
- "How long to determine business impact?" (Goal: Instant with Z-Check)
- "How often do you get false alerts?" (Goal: <5% with Z-Check)
- "Can you quickly tell a customer which features are broken?" (Goal: Yes with Z-Check)
- "How much do you spend on multiple monitoring tools?" (Goal: Consolidate to Z-Check)

---

## Objection Handling

### Objection: "We already use Datadog"

**Response:**
"Datadog is great for application monitoring, but it doesn't specialize in API dependency mapping like Z-Check does. Most customers use both:
- Datadog for app/infrastructure monitoring
- Z-Check for API business impact

Or, if you want to consolidate, Z-Check is significantly cheaper for API-only monitoring. We can run a 30-day trial alongside Datadog to show you the difference."

**Close:** "Should we set up a trial so you can compare?"

---

### Objection: "It's expensive"

**Response:**
"Let me ask - if your payment processor goes down for 2 hours, what's that cost you?"
[They estimate: $50K-500K]

"Z-Check typically costs $500-2K/month, so even if it prevents ONE major incident per year, you're saving 10-50x your annual spend. Most customers prevent 2-3 incidents/year."

**Close:** "Let's calculate your specific ROI. What was your last major API-related incident?"

---

### Objection: "We can build this ourselves"

**Response:**
"You could, but consider:
1. Engineering time to build (2-3 months = $50K-100K)
2. Ongoing maintenance (10-20 hrs/month = $10K-20K/year)
3. Keeping it updated with new APIs/services

Z-Check is proven, tested, and we handle all the maintenance. Most customers find it's cheaper and better to use Z-Check than build it themselves.

Plus, we include features like impact radius analysis that take weeks to build right."

**Close:** "Let's compare: 30-min POC vs 3-month build project?"

---

### Objection: "We need to monitor internal APIs, not just external"

**Response:**
"Perfect, Z-Check handles both! You can:
- Monitor external APIs (Stripe, Auth0, Salesforce, etc.)
- Monitor internal services (your microservices, databases, etc.)
- Map relationships between both

Deploy Z-Check inside your network and it'll monitor everything."

**Close:** "Let's map out which internal/external APIs you'd monitor first."

---

### Objection: "How long will implementation take?"

**Response:**
"The implementation is surprisingly fast:
- Day 1: Deploy (30 min)
- Days 2-3: Add your critical APIs (2-4 hours)
- Days 4-6: Map dependencies (4-6 hours)
- Days 7-8: Configure alerts (1-2 hours)
- Day 9: Go live

Total: About 2 weeks of your team's time. We can support the whole process."

**Close:** "Can you allocate 2 weeks to implement this month?"

---

## Conversation Starters

**"I just read that [major company] had a [service] outage that affected [business process]. With Z-Check, they'd have known instantly which customers were affected..."**

**"Most companies spend $50K-100K/year on monitoring tools. Z-Check could replace 3-4 of them for a fraction of the cost..."**

**"I spoke to [similar company] and they said Z-Check reduced their incident response time from 30 minutes to 2 minutes..."**

---

## Common Talking Points

### Speed
- "Real-time detection: under 1 minute from failure to alert"
- "Setup: under 5 minutes to add a new API"
- "Alert: team notified in <2 seconds via Slack/email"

### Simplicity
- "No coding required - just paste your API URL"
- "Automatic dependency mapping - no manual configuration"
- "Clear business impact in each alert: who cares, what breaks"

### ROI
- "Typical payback: 1-3 months"
- "Median annual value: $500K-2M"
- "Prevents outages and tool consolidation"

### Enterprise-Grade
- "99.95% uptime SLA"
- "SOC 2 ready, GDPR compliant"
- "Kubernetes-ready for enterprise deployment"
- "Multi-channel alerts: email, Slack, PagerDuty, webhooks"

---

## Sales Collateral Checklist

- ✅ **README.md** - Quick overview (5 min read)
- ✅ **SALES_ONE_PAGER.md** - One-page summary (send to decision makers)
- ✅ **PRODUCT_OVERVIEW.md** - Detailed product guide (send after interest)
- ✅ **IMPLEMENTATION_GUIDE.md** - How we implement (send pre-POC)
- ✅ **FAQ.md** - Answer all questions (leave with customer)

---

## Deal Structure

### Standard Enterprise Deal

**Month 1: POC (Evaluation)**
- Free 30-day trial
- Customer adds 5-10 critical APIs
- Z-Check maps dependencies
- Goal: Demonstrate 50-70% faster incident response

**Month 2: Negotiation**
- If successful POC, discuss pricing
- Options: Annual commitment (15-20% discount), multi-year, enterprise
- Include: training, onboarding support

**Month 3: Implementation**
- Deploy Z-Check
- Add all remaining APIs
- Configure alerting
- Go live

**Ongoing: Support & Growth**
- Monthly business review
- Expansion (add new APIs)
- Annual contract renewal

### Typical Deal Values

| Deal Size | Company | APIs | Monthly | Annual |
|-----------|---------|------|---------|--------|
| SMB | 100-500 employees | 20-50 | $500-1K | $6K-12K |
| Mid-Market | 500-5K employees | 50-200 | $1K-3K | $12K-36K |
| Enterprise | 5K+ employees | 200+ | $5K+ | Custom |

---

## Demos to Show

### 15-Minute Live Demo
1. Open Z-Check dashboard (http://localhost:3000)
2. Show 5 demo APIs with status
3. Show interactive dependency graph
4. Show Slack alert configuration
5. Show SLA tracking report
6. Q&A

### 5-Minute Quick Demo (No Time)
1. Show dashboard screenshot
2. Show ROI calculation spreadsheet
3. Send SALES_ONE_PAGER.md
4. Offer: "Schedule a 15-min live demo?"

---

## Email Templates

### Initial Outreach

Subject: "Quick question about your API monitoring"

Body:
```
Hi [Name],

I work with [similar company] who had an API failure last month that took 30 minutes 
to detect - and even then, they weren't sure which customers were affected.

They're now using Z-Check, which tells them in real-time not just WHEN an API fails, 
but WHICH business processes are impacted.

Wondering if this is relevant for your team? Happy to show you a 15-minute demo 
(no sales pitch, just a quick look at how it works).

Available this week?

[Your Name]
```

### Follow-Up (After POC Interest)

Subject: "Here's the Z-Check POC timeline"

Body:
```
Thanks for agreeing to a POC! Here's the typical timeline:

Week 1: Deploy (30 min setup)
Week 2: Add your critical APIs (2-4 hours of your time)
Week 3: Map dependencies and configure alerts (4-6 hours)
Week 4: Go live and review results

Total time commitment: ~10-12 hours of your team's time.

We provide all support - you just need to give us:
- List of APIs you want to monitor
- Team member to attend implementation calls

Ready to start?

[Your Name]
```

---

## Closing Techniques

### The Assumptive Close
"Let's get you set up for the free trial. Which email should I send the access link to?"

### The Alternative Close
"Do you prefer SaaS deployment (zero setup) or Kubernetes (more control)?"

### The Urgency Close
"We're offering free POCs through end of month. After that, it's $500. Should we start now?"

---

## Resources

- Product Overview: `/PRODUCT_OVERVIEW.md` (detailed, send to technical buyers)
- Sales One-Pager: `/SALES_ONE_PAGER.md` (concise, send to executives)
- FAQ: `/FAQ.md` (answer any question)
- Implementation Guide: `/IMPLEMENTATION_GUIDE.md` (show realistic timeline)
- README.md: Updated with sales messaging

---

## Success Metrics to Track

- **Qualification**: Does prospect have 10+ APIs?
- **Discovery**: Have they had API incidents? Budget available?
- **Consideration**: Did they request POC? Read materials?
- **Decision**: Did they choose us or competitor?
- **Implementation**: How smooth was deployment?
- **Expansion**: Did they add more APIs after first month?

---

*Questions? Contact: sales@z-check.io or Slack: #sales*

**Z-Check: Know Your Dependencies. Master Your Alerts. Protect Your Revenue.**
