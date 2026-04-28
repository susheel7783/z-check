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

## Notes

- `backend/main.go` initializes the Neo4j driver, the checker engine, and the Gin HTTP server.
- `neo4j/init.cypher` seeds the graph and includes the impact analysis query.
- Frontend is built with Vite, Tailwind, and `react-force-graph` for live dependency visualization.
