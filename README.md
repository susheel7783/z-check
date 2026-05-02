# Z-Check

Z-Check is a monitoring platform for third-party API/workflow health and business impact analysis using Neo4j.

## Structure

- `backend/`: Go API server, worker pool, Neo4j integration, alerting.
- `frontend/`: React + Tailwind mission control dashboard.
- `neo4j/`: Cypher schema and sample data.
- `docker-compose.yml`: Local development stack for backend, frontend, and Neo4j.

## Local Run

1. Start services:
   ```bash
   docker compose up --build
   ```

2. Backend API: `http://localhost:8080`
3. Frontend app: `http://localhost:3000`
4. Neo4j Browser: `http://localhost:7474` (use `neo4j/password`)

- If no live endpoints are configured, the dashboard will automatically fall back to a demo dependency graph and provide a demo-graph toggle.

## Notes

- `backend/main.go` initializes the Neo4j driver, the checker engine, and the Gin HTTP server.
- `neo4j/init.cypher` seeds the graph and includes the impact analysis query.
- Frontend is built with Vite, Tailwind, and `react-force-graph` for live dependency visualization.

## Production Deployment Notes

- Use `.env` variables for secrets and credentials instead of hardcoded values.
- Copy `.env.example` to `.env` and populate values for `NEO4J_PASSWORD`, `WHATSAPP_API_TOKEN`, `ALERT_WHATSAPP_TO`, and `REACT_APP_API_URL`.
- For production alerts, you can also configure SMTP email delivery with `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `ALERT_EMAIL_FROM`, and `ALERT_EMAIL_TO`.
- Use `ALERT_MODE=EMAIL_ONLY` to send alerts only via email, without WhatsApp.
- The backend Dockerfile is a multi-stage build that compiles in `golang:1.22-alpine` and produces a small runtime image.
- For GKE, mount secrets into environment variables and configure Kubernetes readiness/liveness probes against `/health`.
