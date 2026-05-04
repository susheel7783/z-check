# Z-Check: Enterprise API Monitoring & Business Impact Platform

**Z-Check** is a real-time monitoring platform that shows you when third-party APIs fail AND which of your business processes are affected. It automatically maps dependencies, quantifies impact, and alerts your team with context.

**Perfect for**: E-commerce, SaaS, fintech, healthcare, and any business relying on multiple third-party integrations.

📖 **[Full Product Overview](PRODUCT_OVERVIEW.md)** • 📄 **[Sales One-Pager](SALES_ONE_PAGER.md)**

## Quick Start (5 minutes)

```bash
git clone https://github.com/susheel7783/z-check.git
cd z-check
docker compose up --build
```

Then open:
- **Dashboard**: http://localhost:3000 (monitoring console)
- **API**: http://localhost:8080 (REST API)
- **Neo4j Browser**: http://localhost:7474 (username: `neo4j` / password: `password`)

## Structure

- `backend/`: Go API server with worker pool for parallel health checks, Neo4j integration, and multi-channel alerting
- `frontend/`: React + Vite dashboard with real-time dependency visualization
- `neo4j/`: Graph database storing service relationships and impact analysis
- `docker-compose.yml`: Local development stack
- `k8s/`: Production Kubernetes deployment manifests

## Core Features

### 🎯 Real-Time Monitoring
- Health checks every 30 seconds on all configured APIs
- Multi-protocol support (HTTP/REST, GraphQL, Stripe, Zapier, custom)
- Historical uptime tracking and SLA compliance monitoring

### 🔗 Automatic Dependency Mapping
- Visualizes which services depend on which APIs
- Shows business impact radius (if API X fails, services Y and Z are affected)
- Interactive dependency graph in dashboard

### 🚨 Smart Alerting
- Multi-channel notifications (email, Slack, SMS, WhatsApp, webhooks)
- Context-aware alerts ("Payment processing broken" vs "Stripe is down")
- Configurable escalation policies

### 📊 Business Intelligence
- Service outage reports for compliance
- SLA tracking against contracts
- Trend analysis to identify unreliable vendors

## Local Development

1. Start services:
   ```bash
   docker compose up --build
   ```

2. Demo dashboard includes 5 sample API endpoints to show how it works
3. Add your own APIs via the dashboard UI or API calls

## Notes

- `backend/main.go`: Initializes Neo4j driver, checker worker pool, JWT middleware, and Gin HTTP server
- `neo4j/init.cypher`: Seeds graph with demo data and includes Cypher queries for impact analysis
- `frontend/src/components/Dashboard.jsx`: Main dashboard component with real-time WebSocket updates
- `frontend/src/components/GraphView.jsx`: Interactive force-directed graph visualization of dependencies
- WebSocket connection at `/api/ws` provides real-time status updates to all connected clients

## Security

- ✅ JWT-based authentication
- ✅ HTTPS/TLS support
- ✅ Database encryption at rest
- ✅ Audit logging for all actions
- ✅ Role-based access control (RBAC) ready
- ✅ SOC 2 / GDPR compliance-ready architecture

## Technical Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Backend** | Go 1.22 | Fast, concurrent, low memory |
| **Database** | Neo4j 5.13 | Relationship mapping, graph queries |
| **Frontend** | React 18 + Vite | Fast builds, real-time updates |
| **Infrastructure** | Docker + Kubernetes | Scalable, portable, cloud-native |
| **Alerting** | Multi-channel | Email, Slack, SMS, webhooks |

## Scaling

Z-Check scales horizontally:
- Backend: Multiple replicas behind load balancer
- Frontend: Static assets served via CDN
- Neo4j: Upgrade to Enterprise Causal Cluster or managed Aura for 1000+ APIs

Kubernetes manifests in `k8s/` include auto-scaling configuration.

## Roadmap

- **v1.1**: ML-based anomaly detection
- **v1.2**: Synthetic transaction monitoring
- **v2.0**: Chaos engineering platform integration
- **Future**: Mobile app, AI-powered remediation suggestions

## Production Deployment

### Kubernetes (Recommended)
```bash
# Update k8s/ manifests with your project ID
sed -i 's/YOUR_PROJECT_ID/your-gcp-project-id/g' k8s/*.yaml

# Deploy to GKE
kubectl apply -f k8s/

# Configure auto-scaling, monitoring, and TLS
```

Features:
- 3 backend replicas with auto-scaling
- Kubernetes Ingress for load balancing
- Neo4j StatefulSet for data persistence
- Health checks and liveness probes

### Docker Swarm / Self-Hosted
Use `docker-compose.yml` with environment variables for production configuration.

## Configuration

### Environment Variables
```bash
# Neo4j
NEO4J_PASSWORD=your-secure-password

# Alerting
ALERT_MODE=EMAIL_ONLY  # or PRODUCTION (multi-channel)
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=apikey
EMAIL_PASSWORD=your-sendgrid-key
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=team@yourcompany.com

# WhatsApp (optional)
WHATSAPP_API_TOKEN=your-twilio-token
ALERT_WHATSAPP_TO=+1234567890

# Security
JWT_SECRET=your-super-secret-key-change-in-production

# Frontend
VITE_API_URL=https://api.yourcompany.com
```

Copy `.env.example` to `.env` and populate values.

## API Examples

### Get All Monitored Endpoints
```bash
curl http://localhost:8080/api/status
```

Response:
```json
{
  "endpoints": [
    {
      "id": "ep-stripe",
      "name": "Stripe Payment API",
      "url": "https://api.stripe.com/v1/status",
      "status": "UP",
      "serviceName": "Payment Service",
      "organizationName": "Acme Corp",
      "lastChecked": "2026-05-04T12:34:56Z"
    }
  ],
  "alertMode": "EMAIL_ONLY",
  "alertChannels": ["email"]
}
```

### Health Check
```bash
curl http://localhost:8080/health
# Returns: {"status":"ok"}
```

## Use Cases

**E-Commerce**: Monitor payment processors, inventory APIs, shipping integrations

**SaaS**: Monitor authentication services (Auth0, Okta), CRM APIs (Salesforce), analytics

**Fintech**: Monitor trading APIs, compliance services, market data feeds

**Healthcare**: Monitor patient records, insurance verification, pharmacy integrations
