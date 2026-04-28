#!/usr/bin/env python3
"""
Seed the Neo4j database for Z-Check
"""
from neo4j import GraphDatabase
import time
import sys

uri = "neo4j://localhost:7687"
user = "neo4j"
password = "password"

def init_database():
    driver = GraphDatabase.driver(uri, auth=(user, password))
    
    try:
        with driver.session() as session:
            # Create constraints
            print("Creating constraints...")
            session.run("CREATE CONSTRAINT endpoint_id IF NOT EXISTS FOR (e:Endpoint) REQUIRE e.id IS UNIQUE")
            session.run("CREATE CONSTRAINT service_id IF NOT EXISTS FOR (s:Service) REQUIRE s.id IS UNIQUE")
            session.run("CREATE CONSTRAINT org_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE")
            session.run("CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")
            print("✓ Constraints created")
            
            # Create users
            print("Creating users...")
            session.run("CREATE (u1:User {id: 'user-ops-001', name: 'Samantha Lee', email: 'samantha.lee@acmecorp.com', role: 'Operations'})")
            session.run("CREATE (u2:User {id: 'user-it-001', name: 'Marcus Chen', email: 'marcus.chen@acmecorp.com', role: 'Site Reliability'})")
            print("✓ Users created")
            
            # Create organizations
            print("Creating organizations...")
            session.run("CREATE (org1:Organization {id: 'org-acme', name: 'Acme Corporation', sector: 'Retail'})")
            session.run("CREATE (org2:Organization {id: 'org-nimbus', name: 'Nimbus Financial', sector: 'Fintech'})")
            print("✓ Organizations created")
            
            # Create services
            print("Creating services...")
            session.run("CREATE (svc1:Service {id: 'svc-stripe', name: 'Stripe Payments', category: 'Payments', criticality: 'High'})")
            session.run("CREATE (svc2:Service {id: 'svc-gmail', name: 'Gmail Business', category: 'Email', criticality: 'Medium'})")
            session.run("CREATE (svc3:Service {id: 'svc-zapier', name: 'Zapier Automations', category: 'Workflow', criticality: 'Medium'})")
            session.run("CREATE (svc4:Service {id: 'svc-salesforce', name: 'Salesforce CRM', category: 'CRM', criticality: 'High'})")
            print("✓ Services created")
            
            # Create endpoints
            print("Creating endpoints...")
            session.run("""CREATE (ep1:Endpoint {
                id: 'ep-stripe-status', 
                name: 'Stripe Status API', 
                url: 'https://status.stripe.com/api/v2/status.json', 
                type: 'stripe', 
                method: 'GET', 
                status: 'UP', 
                lastChecked: datetime()
            })""")
            session.run("""CREATE (ep2:Endpoint {
                id: 'ep-gmail-health', 
                name: 'Gmail Health Check', 
                url: 'https://gmail.googleapis.com/v1/users/me/messages', 
                type: 'http', 
                method: 'GET', 
                status: 'UP', 
                lastChecked: datetime()
            })""")
            session.run("""CREATE (ep3:Endpoint {
                id: 'ep-zapier-hook', 
                name: 'Zapier Webhook Runner', 
                url: 'https://hooks.zapier.com/hooks/catch/123456/abcde/', 
                type: 'zapier', 
                method: 'POST', 
                status: 'DOWN', 
                lastChecked: datetime()
            })""")
            session.run("""CREATE (ep4:Endpoint {
                id: 'ep-salesforce-api', 
                name: 'Salesforce REST API', 
                url: 'https://login.salesforce.com/services/data/v56.0/', 
                type: 'http', 
                method: 'GET', 
                status: 'UP', 
                lastChecked: datetime()
            })""")
            print("✓ Endpoints created")
            
            # Create relationships
            print("Creating relationships...")
            session.run("MATCH (u1:User {id: 'user-ops-001'}), (org1:Organization {id: 'org-acme'}) CREATE (u1)-[:OWNS]->(org1)")
            session.run("MATCH (u2:User {id: 'user-it-001'}), (org2:Organization {id: 'org-nimbus'}) CREATE (u2)-[:OWNS]->(org2)")
            session.run("MATCH (org1:Organization {id: 'org-acme'}), (svc1:Service {id: 'svc-stripe'}) CREATE (org1)-[:USES]->(svc1)")
            session.run("MATCH (org1:Organization {id: 'org-acme'}), (svc3:Service {id: 'svc-zapier'}) CREATE (org1)-[:USES]->(svc3)")
            session.run("MATCH (org2:Organization {id: 'org-nimbus'}), (svc2:Service {id: 'svc-gmail'}) CREATE (org2)-[:USES]->(svc2)")
            session.run("MATCH (org2:Organization {id: 'org-nimbus'}), (svc4:Service {id: 'svc-salesforce'}) CREATE (org2)-[:USES]->(svc4)")
            session.run("MATCH (svc1:Service {id: 'svc-stripe'}), (ep1:Endpoint {id: 'ep-stripe-status'}) CREATE (svc1)-[:DEPENDS_ON]->(ep1)")
            session.run("MATCH (svc3:Service {id: 'svc-zapier'}), (ep3:Endpoint {id: 'ep-zapier-hook'}) CREATE (svc3)-[:DEPENDS_ON]->(ep3)")
            session.run("MATCH (svc2:Service {id: 'svc-gmail'}), (ep2:Endpoint {id: 'ep-gmail-health'}) CREATE (svc2)-[:DEPENDS_ON]->(ep2)")
            session.run("MATCH (svc4:Service {id: 'svc-salesforce'}), (ep4:Endpoint {id: 'ep-salesforce-api'}) CREATE (svc4)-[:DEPENDS_ON]->(ep4)")
            print("✓ Relationships created")
            
            print("\n✅ Database initialization complete!")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        driver.close()

if __name__ == "__main__":
    print("Z-Check Database Initialization")
    print("=" * 50)
    for attempt in range(5):
        try:
            init_database()
            break
        except Exception as e:
            if attempt < 4:
                print(f"Attempt {attempt+1} failed, retrying in 3 seconds...")
                time.sleep(3)
            else:
                raise
