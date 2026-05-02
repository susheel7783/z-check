#!/bin/bash
# Z-Check Neo4j Relationship Setup Script
# This script seeds relationships between existing nodes

set -e

CONTAINER_NAME="${1:-zcheck-neo4j}"
NEO4J_USER="${2:-neo4j}"
NEO4J_PASSWORD="${3:-password}"
CYPHER_FILE="${4:-neo4j/relationships.cypher}"

echo "================================================"
echo "Z-Check Neo4j Relationship Setup"
echo "================================================"
echo "Container: $CONTAINER_NAME"
echo "User: $NEO4J_USER"
echo "Cypher File: $CYPHER_FILE"
echo "================================================"

# Check if container is running
if ! docker inspect "$CONTAINER_NAME" > /dev/null 2>&1; then
    echo "❌ Container '$CONTAINER_NAME' not found. Please start Docker Compose first."
    exit 1
fi

echo "📍 Running Cypher script against Neo4j..."
cat "$CYPHER_FILE" | docker exec -i "$CONTAINER_NAME" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Relationships created successfully!"
    echo ""
    echo "📊 Verifying relationship structure..."
    docker exec "$CONTAINER_NAME" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        "MATCH (org:Organization)-[:USES]->(svc:Service)-[:DEPENDS_ON]->(ep:Endpoint) 
         RETURN org.name AS Organization, svc.name AS Service, ep.name AS Endpoint, ep.status AS Status
         ORDER BY org.name, svc.name"
else
    echo ""
    echo "❌ Failed to create relationships. Check Neo4j connectivity and credentials."
    exit 1
fi
