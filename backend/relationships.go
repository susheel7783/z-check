package main

import (
	"context"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// LinkOrganizationToService creates a [:USES] relationship between an Organization and Service
func (e *CheckerEngine) LinkOrganizationToService(ctx context.Context, orgID, serviceID string) error {
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `MATCH (org:Organization {id: $orgId})
			MATCH (svc:Service {id: $serviceId})
			MERGE (org)-[:USES]->(svc)
			RETURN org.name AS orgName, svc.name AS serviceName`

	result, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		res, err := tx.Run(ctx, query, map[string]any{
			"orgId":     orgID,
			"serviceId": serviceID,
		})
		if err != nil {
			return nil, err
		}

		if !res.Next(ctx) {
			return nil, fmt.Errorf("organization or service not found")
		}

		record := res.Record()
		return map[string]string{
			"organization": fmt.Sprintf("%v", record.Values[0]),
			"service":      fmt.Sprintf("%v", record.Values[1]),
		}, res.Err()
	})

	if err != nil {
		logger.Error("failed to link organization to service", "orgId", orgID, "serviceId", serviceID, "error", err)
		return err
	}

	data := result.(map[string]string)
	logger.Info("organization linked to service", "organization", data["organization"], "service", data["service"])
	return nil
}

// LinkServiceToEndpoint creates a [:DEPENDS_ON] relationship from a Service to an Endpoint
func (e *CheckerEngine) LinkServiceToEndpoint(ctx context.Context, serviceID, endpointID string) error {
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `MATCH (svc:Service {id: $serviceId})
			MATCH (ep:Endpoint {id: $endpointId})
			MERGE (svc)-[:DEPENDS_ON]->(ep)
			RETURN svc.name AS serviceName, ep.name AS endpointName`

	result, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		res, err := tx.Run(ctx, query, map[string]any{
			"serviceId":  serviceID,
			"endpointId": endpointID,
		})
		if err != nil {
			return nil, err
		}

		if !res.Next(ctx) {
			return nil, fmt.Errorf("service or endpoint not found")
		}

		record := res.Record()
		return map[string]string{
			"service":  fmt.Sprintf("%v", record.Values[0]),
			"endpoint": fmt.Sprintf("%v", record.Values[1]),
		}, res.Err()
	})

	if err != nil {
		logger.Error("failed to link service to endpoint", "serviceId", serviceID, "endpointId", endpointID, "error", err)
		return err
	}

	data := result.(map[string]string)
	logger.Info("service linked to endpoint", "service", data["service"], "endpoint", data["endpoint"])
	return nil
}

// VerifyGraphConnectivity checks if all nodes have the required relationships
func (e *CheckerEngine) VerifyGraphConnectivity(ctx context.Context) (bool, error) {
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `MATCH (org:Organization)-[:USES]->(svc:Service)-[:DEPENDS_ON]->(ep:Endpoint)
			WITH COUNT(DISTINCT ep) AS connectedEndpoints
			MATCH (ep2:Endpoint)
			WITH connectedEndpoints, COUNT(DISTINCT ep2) AS totalEndpoints
			RETURN connectedEndpoints, totalEndpoints, 
				   CASE WHEN connectedEndpoints = totalEndpoints THEN true ELSE false END AS allConnected`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		res, err := tx.Run(ctx, query, nil)
		if err != nil {
			return nil, err
		}

		if !res.Next(ctx) {
			return false, nil
		}

		record := res.Record()
		connected := record.Values[0].(int64)
		total := record.Values[1].(int64)
		allConnected := record.Values[2].(bool)

		logger.Info("graph connectivity status", "connected", connected, "total", total, "allConnected", allConnected)
		return allConnected, nil
	})

	if err != nil {
		logger.Error("failed to verify graph connectivity", "error", err)
		return false, err
	}

	return result.(bool), nil
}
