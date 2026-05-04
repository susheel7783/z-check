# Z-Check: Frequently Asked Questions

## Business Questions

### Pricing & Licensing

**Q: How is Z-Check priced?**
A: Z-Check is offered as a tiered subscription service:
- **Startup**: $500/month for up to 50 monitored APIs
- **Scale**: $2,000/month for up to 500 monitored APIs
- **Enterprise**: custom pricing for unlimited APIs, advanced support, and dedicated onboarding
- **Free trial**: 14 days with full feature access

**Q: Is there a one-time setup fee?**
A: There is no standard setup fee. Annual commitments may qualify for additional discounts.

**Q: Can pricing be negotiated?**
A: Yes. We provide pricing flexibility for:
- annual contracts
- multi-year commitments
- enterprise volume deployments
- non-profit and educational organizations

**Q: Can Z-Check be deployed on-premise?**
A: Yes. We support self-hosted deployments with these options:
- Docker Compose for evaluation and small teams
- Kubernetes for production-grade enterprise deployments
- on-premise installations with custom deployment guidance
- flexible licensing based on API count or instance footprint

**Q: Are there any hidden costs?**
A: No. Included in each subscription tier:
- all tier features
- unlimited users
- unlimited alerts
- unlimited retained health data
- standard email, Slack, and SMS support

Excluded costs may include:
- custom integration development ($500–$5,000 per integration)
- dedicated on-premise deployment support ($10,000 setup + $2,000/month)

---

### ROI & Business Value

**Q: What is the typical ROI for Z-Check?**
A: Customers commonly realize payback within 1–3 months. Savings are typically driven by:
- avoided outage costs
- reduced tool overlap
- faster incident response
- improved vendor and service performance

**Q: Do you provide customer references?**
A: Yes. We work with organizations in:
- e-commerce
- SaaS
- fintech
- healthcare

For reference requests, contact sales@z-check.io.

**Q: Will Z-Check reduce engineering headcount?**
A: Z-Check is designed to reduce operational burden rather than replace engineers. It frees teams from manual monitoring and incident investigation so they can focus on product delivery, reliability, and performance.

**Q: How soon can we expect ROI?**
A: ROI can begin immediately for critical incident prevention. Typical customers see measurable impact within the first 1–2 months.

---

### Compliance & Security

**Q: Is Z-Check compliant with standard security frameworks?**
A: Z-Check supports compliance readiness for:
- SOC 2 Type II
- GDPR with region-specific data controls
- HIPAA for on-premise deployments
- FedRAMP readiness in progress
- PCI DSS compatibility for systems that do not store payment data
- ISO 27001 readiness roadmap

**Q: Where is customer data stored?**
A: Data storage options include:
- US regions (default)
- EU regions for GDPR-sensitive deployments
- on-premise installations under your control
- custom regions on request

**Q: How are backups handled?**
A: We provide automated daily backups with:
- 30-day retention
- point-in-time recovery
- monthly restoration testing

**Q: Can Z-Check be used in regulated industries?**
A: Yes. We support deployments for financial services, healthcare providers, insurance companies, and government organizations.

---

## Technical Questions

### API Access & Automation

**Q: What platform API endpoints are available?**
A: Z-Check exposes REST endpoints for automation and integration. Common endpoints include:
   - `GET /api/status` — current health status for monitored endpoints
   - `GET /api/endpoints` — list configured endpoints
   - `POST /api/endpoints` — add a monitored endpoint
   - `PUT /api/endpoints/{id}` — update endpoint settings
   - `GET /api/endpoints/{id}/history` — retrieve historical health data
   - `POST /api/test-alert` — validate alert delivery

**Q: Can we add or update monitored APIs programmatically?**
A: Yes. Z-Check supports programmatic endpoint management through its REST API. This enables automated onboarding, endpoint updates, and integration with deployment pipelines.

### Authentication & Secrets

**Q: How does Z-Check authenticate API access?**
A: Z-Check uses JWT tokens for user sessions and API keys for machine-to-machine access. All API interactions require valid credentials and role-based access control.

**Q: How are monitored API credentials stored?**
A: Credentials and secrets are encrypted at rest in a secure secrets store. They are never included in logs, and access is restricted using RBAC.

**Q: Can secrets be rotated without downtime?**
A: Yes. We support credential rotation workflows for monitored endpoints. New values can be applied and validated before the previous ones are retired.

### Integration & Compatibility

**Q: What types of APIs can Z-Check monitor?**
A: Z-Check can monitor any API accessible over HTTP, including:
- REST APIs
- GraphQL
- gRPC (with a custom checker)
- SOAP
- cloud service APIs (AWS, Azure, GCP, Stripe, Twilio, etc.)
- internal and private APIs
- webhooks and database health endpoints

**Q: Can Z-Check monitor internal or private APIs?**
A: Yes. We support private deployments using:
- internal network hosting
- VPN connectivity
- IP allowlisting
- private DNS resolution

**Q: Can Z-Check monitor multiple cloud providers?**
A: Yes. Z-Check can monitor APIs across AWS, Azure, GCP, and other cloud environments simultaneously.

**Q: Can Z-Check integrate with existing systems?**
A: Yes. We support integrations with:
- PagerDuty, Opsgenie, incident.io
- Slack, Microsoft Teams, Discord
- Jira, Linear, GitHub Issues
- Datadog, New Relic, CloudWatch
- ServiceNow
- custom webhooks for bespoke workflows

**Q: Are multiple alert channels supported for a single incident?**
A: Yes. Z-Check can send the same alert across multiple channels, including email, Slack, PagerDuty, and webhooks simultaneously.

---

### Deployment & Infrastructure

**Q: What deployment options are available?**
A: Z-Check supports three primary deployment models:

1. **SaaS (recommended)**
   - no infrastructure required
   - managed hosting, auto-scaling, and backups
   - managed SSL/TLS
   - immediate access

2. **Kubernetes (enterprise)**
   - deploy on GKE, EKS, AKS, or self-hosted clusters
   - full infrastructure control
   - manifests available in `k8s/`

3. **Docker Compose (evaluation / small teams)**
   - `docker compose up --build`
   - suitable for testing and proof of concept
   - not recommended for high-scale production

**Q: What are the recommended infrastructure requirements?**
A: Typical deployment sizing is:
- **Minimum**: 2 vCPU, 4 GB RAM, 50 GB storage
- **Recommended**: 4 vCPU, 8 GB RAM, 200 GB storage
- **Enterprise**: 8+ vCPU, 16+ GB RAM, 1 TB storage, optional Neo4j cluster

**Q: How does Z-Check handle high availability?**
A: For production self-hosted deployments, we recommend Kubernetes with replica sets for the API server, persistent Neo4j storage, and a managed load balancer. This ensures monitoring remains available even if individual pods are restarted.

**Q: How much does self-hosting cost?**
A: Self-hosting costs vary with infrastructure and scale. It is most appropriate when regulatory requirements or network restrictions require on-premise deployment.

---

### Performance & Scalability

**Q: How many APIs can Z-Check monitor?**
A: Z-Check scales from dozens to thousands of APIs. Common tiers include:
- 1–50 APIs for lightweight deployments
- 50–500 APIs for standard enterprise use
- 500–5,000 APIs for large deployments
- 5,000+ APIs for cluster-based architecture

**Q: How quickly does Z-Check detect failures?**
A: Failure detection is typically completed within 30–60 seconds, depending on the configured polling interval.

**Q: Can checks run more frequently than every 30 seconds?**
A: Yes. Polling intervals can be reduced to 10–15 seconds for critical endpoints. More frequent checks may increase system load and operational cost.

---

### Monitoring & Alerts

**Q: What data does Z-Check collect?**
A: For each check, Z-Check captures:
- response time
- HTTP status code
- optional response body
- success or failure status
- timestamp

We do not collect authentication credentials or sensitive personal data by default.

**Q: Can alert conditions be customized?**
A: Yes. Alerts can be configured for:
- endpoint downtime
- slow response times
- latency degradation trends
- unexpected status codes
- anomaly detection patterns

**Q: How does Z-Check reduce false positives?**
A: Z-Check uses retry logic and configurable thresholds to confirm failures before alerting. You can tune retry count, debounce windows, and alert suppression rules to reduce noise.

**Q: Can alerts be tested?**
A: Yes. Test alerts are available through the dashboard and API (`POST /api/test-alert`).

**Q: How are maintenance windows handled?**
A: Maintenance windows can be scheduled to suppress alerts during planned outages. Checks continue to run, but incidents are logged as maintenance and excluded from SLA calculations.

---

### Data & Reporting

**Q: How long is historical data retained?**
A: Retention options include:
- 30 days for entry-level plans
- 1 year for standard plans
- up to 7 years for enterprise deployments
- custom retention for specialized requirements

**Q: Can data be exported?**
A: Yes. Available export formats include:
- CSV
- JSON
- PDF
- Grafana-compatible metric exports

**Q: What reports are available?**
A: Built-in reporting includes:
- uptime summaries
- SLA compliance
- incident frequency
- mean time to recovery (MTTR)
- vendor performance comparisons
- cost of downtime
- custom report generation

---

### Operational Resilience

**Q: What happens if the monitoring infrastructure is unavailable?**
A: In self-hosted deployments, customers are responsible for platform availability. For Kubernetes, we recommend readiness and liveness probes plus persistent volumes for Neo4j. For SaaS, Z-Check maintains its own operational availability.

**Q: How are maintenance periods handled for the monitoring system itself?**
A: Planned upgrades and maintenance for SaaS are communicated in advance. For self-hosted deployments, maintenance windows can be scheduled and monitored through your infrastructure tooling.

---

### Security & Compliance Specifics

**Q: Are backups encrypted?**
A: Yes. Backups are encrypted and stored securely. On-premise backups can also be encrypted according to your organization’s policies.

**Q: Is audit logging available?**
A: Yes. Z-Check records administrative actions, configuration changes, and alert delivery events for compliance and investigation.

**Q: Which hosting regions are supported?**
A: We support US and EU regions by default. Custom region deployments are available for enterprise customers with specific data residency requirements.

---

### Product Roadmap

**Q: What future features are planned for Z-Check?**
A: Future capabilities include synthetic transaction monitoring, richer anomaly detection, vendor performance scoring, and deeper analytics for business impact.

**Q: How can we influence the product roadmap?**
A: Customer feedback is welcome. Enterprise customers can participate in roadmap planning through dedicated account management and advisory sessions.

---

### Support & Maintenance

**Q: What support is included?**
A: Support is aligned with subscription tiers:

| Tier | Email | Slack | Phone | Typical Response |
|------|-------|-------|-------|------------------|
| Startup | yes | no | no | 24 hours |
| Scale | yes | yes | no | 4 hours |
| Enterprise | yes | yes | yes | 1 hour |

Additional resources include documentation, community channels, and video tutorials.

**Q: What SLA does Z-Check provide?**
A: SaaS deployments carry a 99.95% uptime SLA. Self-hosted deployments are maintained by the customer.

**Q: How frequently is Z-Check updated?**
A: Z-Check is updated regularly:
- minor releases: weekly
- major releases: monthly
- SaaS updates: rollout with zero downtime
- self-hosted updates: customer-controlled scheduling

**Q: Will updates break integrations?**
A: No. We maintain backward compatibility and provide:
- at least six months of deprecation notice
- migration guides
- dedicated update support

## Technical Deep Dives

### Architecture

**Q: How is Z-Check architected?**
A: Z-Check consists of:
- a React-based dashboard
- a Go API server
- a distributed checker engine
- a multi-channel alerting subsystem
- a Neo4j graph database for dependency modeling

**Q: How does dependency mapping work?**
A: Z-Check stores service dependencies in Neo4j and evaluates impact by traversing relationships when an API fails. This enables service-level impact analysis and escalation.

**Q: How is business impact calculated?**
A: Example Neo4j query:

```cypher
MATCH (api:Endpoint {status: 'DOWN'})
MATCH (service:Service)-[:DEPENDS_ON]->(api)
MATCH (org:Organization)-[:USES]->(service)
RETURN org.name, COUNT(service) AS affected_services
```

---

### Database

**Q: Why does Z-Check use Neo4j?**
A: Neo4j is optimized for relationship queries, making it ideal for impact analysis and dependency traversal. Graph queries are typically faster than equivalent relational joins for this use case.

**Q: Can existing data be migrated into Z-Check?**
A: Yes. We support data migration using scripts, mapping assistance, and import guidance.

**Q: Is Neo4j difficult to operate?**
A: No. SaaS customers receive managed operation. For self-hosted deployments, we provide Helm charts, Docker Compose assets, and operational guidance.

---

### Security Deep Dive

**Q: How does authentication work?**
A: Z-Check uses JWT tokens for user sessions, with refresh tokens for long-lived sessions and API key authentication for integrations.

**Q: Are API credentials stored securely?**
A: Yes. Credentials are encrypted at rest, managed in a secrets store, and never written to logs.

**Q: Is SSO available?**
A: Yes. Enterprise deployments support SAML 2.0 and OpenID Connect, including Okta, Azure AD, and Google Workspace.

## Getting Started

**How do we begin with Z-Check?**

1. Review `PRODUCT_OVERVIEW.md` and `SALES_ONE_PAGER.md`.
2. Deploy the evaluation environment with `docker compose up --build`.
3. Run a proof of concept using your APIs.
4. Follow `IMPLEMENTATION_GUIDE.md` for production rollout.

**Next step**: schedule a demo or contact sales.
- Email: sales@z-check.io
- Phone: +1 (555) 123-4567

*If your question is not covered here, contact support@z-check.io.*
