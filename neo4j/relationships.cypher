// Z-Check Relationship Builder
// This script creates [:USES] and [:DEPENDS_ON] relationships between existing nodes
// Run this after the initial node creation to link your graph

// 1. Create [:USES] relationships between Organizations and Services
MATCH (org:Organization {name: 'Acme Corporation'})
MATCH (svc:Service {id: 'svc-stripe'})
MERGE (org)-[:USES]->(svc);

MATCH (org:Organization {name: 'Acme Corporation'})
MATCH (svc:Service {id: 'svc-zapier'})
MERGE (org)-[:USES]->(svc);

MATCH (org:Organization {name: 'Nimbus Financial'})
MATCH (svc:Service {id: 'svc-gmail'})
MERGE (org)-[:USES]->(svc);

MATCH (org:Organization {name: 'Nimbus Financial'})
MATCH (svc:Service {id: 'svc-salesforce'})
MERGE (org)-[:USES]->(svc);

// 2. Create [:DEPENDS_ON] relationships from Services to Endpoints
// Direction: Service -[:DEPENDS_ON]-> Endpoint
MATCH (svc:Service {id: 'svc-stripe'})
MATCH (ep:Endpoint {id: 'ep-stripe-status'})
MERGE (svc)-[:DEPENDS_ON]->(ep);

MATCH (svc:Service {id: 'svc-zapier'})
MATCH (ep:Endpoint {id: 'ep-zapier-hook'})
MERGE (svc)-[:DEPENDS_ON]->(ep);

MATCH (svc:Service {id: 'svc-gmail'})
MATCH (ep:Endpoint {id: 'ep-gmail-health'})
MERGE (svc)-[:DEPENDS_ON]->(ep);

MATCH (svc:Service {id: 'svc-salesforce'})
MATCH (ep:Endpoint {id: 'ep-salesforce-api'})
MERGE (svc)-[:DEPENDS_ON]->(ep);

// 3. Verify the relationships were created
MATCH (org:Organization)-[:USES]->(svc:Service)-[:DEPENDS_ON]->(ep:Endpoint)
RETURN org.name AS organization, svc.name AS service, ep.name AS endpoint, ep.status AS endpointStatus
ORDER BY org.name, svc.name;
