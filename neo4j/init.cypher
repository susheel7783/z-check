// Z-Check professional Neo4j seed script
CREATE CONSTRAINT endpoint_id IF NOT EXISTS FOR (e:Endpoint) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT service_id IF NOT EXISTS FOR (s:Service) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT org_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE (u1:User {id: 'user-ops-001', name: 'Samantha Lee', email: 'samantha.lee@acmecorp.com', role: 'Operations'});
CREATE (u2:User {id: 'user-it-001', name: 'Marcus Chen', email: 'marcus.chen@acmecorp.com', role: 'Site Reliability'});

CREATE (org1:Organization {id: 'org-acme', name: 'Acme Corporation', sector: 'Retail'});
CREATE (org2:Organization {id: 'org-nimbus', name: 'Nimbus Financial', sector: 'Fintech'});

CREATE (svc1:Service {id: 'svc-stripe', name: 'Stripe Payments', category: 'Payments', criticality: 'High'});
CREATE (svc2:Service {id: 'svc-gmail', name: 'Gmail Business', category: 'Email', criticality: 'Medium'});
CREATE (svc3:Service {id: 'svc-zapier', name: 'Zapier Automations', category: 'Workflow', criticality: 'Medium'});
CREATE (svc4:Service {id: 'svc-salesforce', name: 'Salesforce CRM', category: 'CRM', criticality: 'High'});

CREATE (ep1:Endpoint {id: 'ep-stripe-status', name: 'Stripe Status API', url: 'https://status.stripe.com/api/v2/status.json', type: 'stripe', method: 'GET', status: 'UP', lastChecked: datetime()});
CREATE (ep2:Endpoint {id: 'ep-gmail-health', name: 'Gmail Health Check', url: 'https://gmail.googleapis.com/v1/users/me/messages', type: 'http', method: 'GET', status: 'UP', lastChecked: datetime()});
CREATE (ep3:Endpoint {id: 'ep-zapier-hook', name: 'Zapier Webhook Runner', url: 'https://hooks.zapier.com/hooks/catch/123456/abcde/', type: 'zapier', method: 'POST', status: 'DOWN', lastChecked: datetime()});
CREATE (ep4:Endpoint {id: 'ep-salesforce-api', name: 'Salesforce REST API', url: 'https://login.salesforce.com/services/data/v56.0/', type: 'http', method: 'GET', status: 'UP', lastChecked: datetime()});

CREATE (u1)-[:OWNS]->(org1);
CREATE (u2)-[:OWNS]->(org2);

CREATE (org1)-[:USES]->(svc1);
CREATE (org1)-[:USES]->(svc3);
CREATE (org2)-[:USES]->(svc2);
CREATE (org2)-[:USES]->(svc4);

CREATE (svc1)-[:DEPENDS_ON]->(ep1);
CREATE (svc3)-[:DEPENDS_ON]->(ep3);
CREATE (svc2)-[:DEPENDS_ON]->(ep2);
CREATE (svc4)-[:DEPENDS_ON]->(ep4);

// Business impact query: find affected organizations when endpoints are DOWN and compute a risk level.
// Risk level is defined as HIGH if more than 2 services depend on the affected endpoint, MEDIUM if 2, LOW otherwise.
MATCH (o:Organization)-[:USES]->(s:Service)-[:DEPENDS_ON]->(ep:Endpoint)
WHERE ep.status = 'DOWN'
WITH o, collect(DISTINCT s.name) AS impactedServices, collect(DISTINCT ep.name) AS downEndpoints, count(DISTINCT s) AS serviceCount
RETURN o.name AS organizationName,
			 impactedServices,
			 downEndpoints,
			 CASE
				 WHEN serviceCount > 2 THEN 'HIGH'
				 WHEN serviceCount = 2 THEN 'MEDIUM'
				 ELSE 'LOW'
			 END AS riskLevel,
			 serviceCount AS impactedServiceCount;
