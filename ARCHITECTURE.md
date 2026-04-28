# Z-Check Architecture Overview

## Text-Based Architecture Diagram

```
+----------------+      +------------------+      +-------------------+
|  React Frontend| <--> |  Go Backend API   | <--> |  Neo4j Graph DB   |
| Mission Control|      |  Gin + WorkerPool |      |  Service Dependency|
+----------------+      +------------------+      +-------------------+
         ^                      ^    ^                     ^
         |                      |    |                     |
Live WebSockets       HTTP checks |                     |
         |                      |    |                     |
         v                      |    |                     |
+----------------+      +------------------+      +-------------------+
| Alert Panel    |      |  Checker Engine  |      |  Graph Model      |
| Real-time feed |      | 1000+ endpoints  |      | (User, Org, svc,  |
+----------------+      +------------------+      |  Endpoint, status) |
                                         |          +-------------------+
                                         v
                                   +----------------+
                                   | WhatsApp Alert  |
                                   | via Twilio/Meta |
                                   +----------------+
```

## Core Components

- Backend: Go + Gin with a concurrent worker pool for polling endpoints every 60 seconds.
- Database: Neo4j graph model for user, organization, service, endpoint relationships and impact traversal.
- Frontend: React + Tailwind with a mission control graph visualization and alert panel.
- Infra: Docker Compose for local development, Kubernetes-ready container images for GKE.

## Key Patterns

- `Checker` interface for generic HTTP GET/POST, Zapier, Stripe status checks.
- Worker pool buffer sized for 1000+ endpoints.
- Neo4j status persistence and impact traversal query.
- Real-time alert feed via WebSocket event stream.
