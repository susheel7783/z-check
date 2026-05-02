-- Update Stripe and Salesforce endpoints to use httpbin.org for testing
MATCH (ep:Endpoint {id: 'ep-stripe-status'})
SET ep.url = 'https://httpbin.org/status/200'

MATCH (ep:Endpoint {id: 'ep-salesforce-api'})
SET ep.url = 'https://httpbin.org/status/200'