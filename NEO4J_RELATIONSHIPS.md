# Z-Check Neo4j Relationship Setup Guide

## Overview
Your Z-Check instance uses Neo4j to model the dependency graph between Organizations, Services, and Endpoints. This guide explains how to create and verify the relationship links between these entities.

## Relationship Model

The graph uses two types of relationships:

### 1. Organization → Service (`:USES`)
```
Organization -[:USES]-> Service
```
**Meaning**: An organization uses/depends on a service.

**Example**: "Acme Corporation uses Stripe Payments"

### 2. Service → Endpoint (`:DEPENDS_ON`)
```
Service -[:DEPENDS_ON]-> Endpoint
```
**Meaning**: A service depends on an endpoint for functionality.

**Example**: "Stripe Payments depends on Stripe Status API"

## Setting Up Relationships

### Option 1: Automatic (Initial Setup)
When you first run `docker compose up`, the `neo4j/init.cypher` script runs automatically during database initialization. This creates all nodes AND their relationships.

**To reinitialize from scratch:**
```bash
docker compose down -v  # Remove volume to reset database
docker compose up --build
```

### Option 2: Manual Setup (Already Running Database)
If your database already has nodes but is missing relationships, use the provided shell script:

```bash
chmod +x setup-relationships.sh
./setup-relationships.sh
```

This script will:
1. Check if the Neo4j container is running
2. Execute `neo4j/relationships.cypher` to create links
3. Verify all relationships were created successfully

**Custom parameters:**
```bash
./setup-relationships.sh zcheck-neo4j neo4j your_password neo4j/relationships.cypher
```

### Option 3: Direct Cypher Shell
To manually run the Cypher commands:

```bash
docker exec -i zcheck-neo4j cypher-shell -u neo4j -p password < neo4j/relationships.cypher
```

Or run individual commands:
```bash
docker exec zcheck-neo4j cypher-shell -u neo4j -p password \
  'MATCH (org:Organization {name: "Acme Corporation"})
   MATCH (svc:Service {id: "svc-stripe"})
   MERGE (org)-[:USES]->(svc);'
```

## Verification

### View All Relationships
```bash
docker exec zcheck-neo4j cypher-shell -u neo4j -p password \
  'MATCH (org:Organization)-[:USES]->(svc:Service)-[:DEPENDS_ON]->(ep:Endpoint)
   RETURN org.name AS Organization, svc.name AS Service, ep.name AS Endpoint, ep.status AS Status;'
```

**Expected output:**
```
╒═══════════════════════╤═══════════════════════╤══════════════════════╤════════╕
│ Organization          │ Service               │ Endpoint             │ Status │
├───────────────────────┼───────────────────────┼──────────────────────┼────────┤
│ "Acme Corporation"    │ "Stripe Payments"     │ "Stripe Status API"  │ "UP"   │
│ "Acme Corporation"    │ "Zapier Automations"  │ "Zapier Webhook..."  │ "DOWN" │
│ "Nimbus Financial"    │ "Gmail Business"      │ "Gmail Health Check" │ "UP"   │
│ "Nimbus Financial"    │ "Salesforce CRM"      │ "Salesforce REST..." │ "UP"   │
└───────────────────────┴───────────────────────┴──────────────────────┴────────┘
```

### Check Backend Connectivity
```bash
curl http://localhost:8080/api/status
```

Should return all endpoints with their relationships populated:
```json
{
  "endpoints": [
    {
      "id": "ep-stripe-status",
      "name": "Stripe Status API",
      "status": "UP",
      "serviceName": "Stripe Payments",
      "organizationName": "Acme Corporation"
    },
    ...
  ]
}
```

## Programmatic Access (Go Backend)

Use the helper functions in `backend/relationships.go`:

```go
// Link a new organization to a service
err := checkerEngine.LinkOrganizationToService(ctx, "org-acme", "svc-stripe")

// Link a new service to an endpoint
err := checkerEngine.LinkServiceToEndpoint(ctx, "svc-stripe", "ep-stripe-status")

// Verify all nodes are properly connected
isConnected, err := checkerEngine.VerifyGraphConnectivity(ctx)
```

## Troubleshooting

### "Endpoint" nodes exist but relationships missing
Run the manual setup script:
```bash
./setup-relationships.sh
```

### "Organization or service not found"
The node IDs may not match. Verify using:
```bash
docker exec zcheck-neo4j cypher-shell -u neo4j -p password \
  'MATCH (n) RETURN labels(n) AS nodeType, n.id AS id, n.name AS name;'
```

### Backend returns `null` for serviceName/organizationName
The relationships haven't been created yet. Run Option 2 or 3 above.

### Neo4j container not running
```bash
docker compose ps
docker compose up -d
```

## Files Reference

| File | Purpose |
|------|---------|
| `neo4j/init.cypher` | Initial schema constraints + node creation + relationships (auto-runs on DB startup) |
| `neo4j/relationships.cypher` | Standalone script to rebuild relationships on existing nodes |
| `setup-relationships.sh` | Bash wrapper that executes relationships.cypher against the container |
| `backend/relationships.go` | Go functions for dynamic relationship management |

## RCA & Impact Analysis Dependencies

Your backend's Root Cause Analysis (AnalyzeFailure) and Status Handler depend on these relationships:

1. **AnalyzeFailure** queries:
   ```cypher
   MATCH (ep:Endpoint {id: $id})<-[:DEPENDS_ON]-(svc:Service)
   ```
   Requires: `Service -[:DEPENDS_ON]-> Endpoint` links

2. **StatusHandler** queries:
   ```cypher
   MATCH (ep)<-[:DEPENDS_ON]-(s:Service)
   OPTIONAL MATCH (s)<-[:USES]-(o:Organization)
   ```
   Requires: Both `Service -[:DEPENDS_ON]-> Endpoint` and `Organization -[:USES]-> Service` links

Without these relationships, impact analysis and dependency tracking will not work correctly.
