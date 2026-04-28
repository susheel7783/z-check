package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

type Status string

const (
	StatusUp   Status = "UP"
	StatusDown Status = "DOWN"
)

type Checker interface {
	Check(ctx context.Context, endpoint *Endpoint) (Status, error)
}

type Endpoint struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	URL         string            `json:"url"`
	Type        string            `json:"type"`
	Method      string            `json:"method"`
	Payload     string            `json:"payload"`
	Headers     map[string]string `json:"headers"`
	LastStatus  Status            `json:"lastStatus"`
	LastChecked time.Time         `json:"lastChecked"`
}

type CheckJob struct {
	Endpoint *Endpoint
}

type CheckerEngine struct {
	driver               neo4j.DriverWithContext
	config               AppConfig
	hub                  *Hub
	workerCount          int
	interval             time.Duration
	jobQueue             chan CheckJob
	alertMu              sync.Mutex
	alertThrottles       map[string]time.Time
	stopOnce             sync.Once
	stopCtx              context.Context
	stopCancel           context.CancelFunc
	wg                   sync.WaitGroup
	checksPerformedTotal prometheus.Counter
	endpointsDownTotal   prometheus.Gauge
}

func NewCheckerEngine(driver neo4j.DriverWithContext, config AppConfig, hub *Hub) *CheckerEngine {
	return &CheckerEngine{
		driver:         driver,
		config:         config,
		hub:            hub,
		workerCount:    16,
		interval:       60 * time.Second,
		jobQueue:       make(chan CheckJob, 2000),
		alertThrottles: map[string]time.Time{},
		checksPerformedTotal: promauto.NewCounter(prometheus.CounterOpts{
			Name: "zcheck_checks_performed_total",
			Help: "Total number of checks executed by Z-Check",
		}),
		endpointsDownTotal: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "zcheck_endpoints_down_total",
			Help: "Current number of endpoints detected as down",
		}),
	}
}

func (e *CheckerEngine) Start() {
	e.stopCtx, e.stopCancel = context.WithCancel(context.Background())

	for i := 0; i < e.workerCount; i++ {
		e.wg.Add(1)
		go e.worker()
	}

	e.wg.Add(1)
	go func() {
		defer e.wg.Done()
		ticker := time.NewTicker(e.interval)
		defer ticker.Stop()
		for {
			select {
			case <-e.stopCtx.Done():
				return
			case <-ticker.C:
				if err := e.VerifyDatabase(); err != nil {
					logger.Warn("database connectivity check failed", "error", err)
					e.reinitializeDriver()
					// After reinitialization, try again next cycle
					continue
				}
				e.enqueueCheckCycle()
			}
		}
	}()
}

func (e *CheckerEngine) worker() {
	defer e.wg.Done()
	for {
		select {
		case <-e.stopCtx.Done():
			return
		case job := <-e.jobQueue:
			checker := e.resolveChecker(job.Endpoint)
			status, err := checker.Check(e.stopCtx, job.Endpoint)
			if err != nil {
				status = StatusDown
			}
			e.persistStatus(e.stopCtx, job.Endpoint, status)
		}
	}
}

func (e *CheckerEngine) resolveChecker(endpoint *Endpoint) Checker {
	switch strings.ToLower(endpoint.Type) {
	case "zapier":
		return &ZapierChecker{}
	case "stripe":
		return &StripeStatusChecker{}
	default:
		return &HTTPChecker{}
	}
}

func (e *CheckerEngine) enqueueCheckCycle() {
	endpoints, err := e.fetchEndpoints(e.stopCtx)
	if err != nil {
		logger.Warn("failed to fetch endpoints", "error", err)
		return
	}

	for _, endpoint := range endpoints {
		select {
		case <-e.stopCtx.Done():
			return
		case e.jobQueue <- CheckJob{Endpoint: endpoint}:
		}
	}
}

func (e *CheckerEngine) fetchEndpoints(ctx context.Context) ([]*Endpoint, error) {
	query := `MATCH (ep:Endpoint) RETURN ep.id AS id, ep.name AS name, ep.url AS url, ep.type AS type, ep.method AS method, ep.payload AS payload, ep.headers AS headers, ep.status AS status, ep.lastChecked AS lastChecked`
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	value, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		result, err := tx.Run(ctx, query, nil)
		if err != nil {
			return nil, err
		}

		var endpoints []*Endpoint
		for result.Next(ctx) {
			record := result.Record()
			idRaw, _ := record.Get("id")
			nameRaw, _ := record.Get("name")
			urlRaw, _ := record.Get("url")
			typeRaw, _ := record.Get("type")
			methodRaw, _ := record.Get("method")
			payloadRaw, _ := record.Get("payload")
			headersRaw, _ := record.Get("headers")
			statusRaw, _ := record.Get("status")

			endpoint := &Endpoint{
				ID:     fmt.Sprintf("%v", idRaw),
				Name:   fmt.Sprintf("%v", nameRaw),
				URL:    fmt.Sprintf("%v", urlRaw),
				Type:   fmt.Sprintf("%v", typeRaw),
				Method: fmt.Sprintf("%v", methodRaw),
				Payload: func() string {
					if raw, ok := payloadRaw.(string); ok {
						return raw
					}
					return ""
				}(),
				Headers: map[string]string{},
			}

			if rawHeaders, ok := headersRaw.(map[string]any); ok {
				for k, v := range rawHeaders {
					endpoint.Headers[k] = fmt.Sprintf("%v", v)
				}
			}
			if rawStatus, ok := statusRaw.(string); ok {
				endpoint.LastStatus = Status(rawStatus)
			}
			endpoints = append(endpoints, endpoint)
		}

		return endpoints, result.Err()
	})
	if err != nil {
		return nil, err
	}

	return value.([]*Endpoint), nil
}

func (e *CheckerEngine) persistStatus(ctx context.Context, endpoint *Endpoint, status Status) {
	e.checksPerformedTotal.Inc()
	previous := endpoint.LastStatus
	endpoint.LastStatus = status
	endpoint.LastChecked = time.Now().UTC()

	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (any, error) {
		query := `MATCH (ep:Endpoint {id: $id})
			SET ep.status = $status, ep.lastChecked = datetime($checked)
			CREATE (record:StatusRecord {status: $status, timestamp: datetime($checked), message: $message})
			CREATE (ep)-[:HAS_STATUS_RECORD]->(record)
			RETURN ep`
		_, err := tx.Run(ctx, query, map[string]any{
			"id":      endpoint.ID,
			"status":  string(status),
			"checked": endpoint.LastChecked.Format(time.RFC3339),
			"message": fmt.Sprintf("%s transitioned from %s to %s", endpoint.Name, string(previous), string(status)),
		})
		return nil, err
	})
	if err != nil {
		logger.Error("failed to persist status", "endpoint", endpoint.ID, "error", err)
		return
	}

	if previous != status {
		e.hub.BroadcastJSON(AlertEvent{
			EndpointID: endpoint.ID,
			Name:       endpoint.Name,
			Status:     string(status),
			Timestamp:  time.Now().UTC().Format(time.RFC3339),
		})
	}

	if previous != status {
		if status == StatusDown {
			e.endpointsDownTotal.Inc()
		} else if previous == StatusDown && status == StatusUp {
			e.endpointsDownTotal.Dec()
		}
	}

	if previous != status && status == StatusDown {
		// Analyze if this is a service-wide failure
		isServiceWide, serviceName, _, _ := e.AnalyzeFailure(ctx, endpoint)
		if isServiceWide {
			// Broadcast service-level alert
			e.hub.BroadcastJSON(AlertEvent{
				EndpointID:     endpoint.ID,
				Name:           endpoint.Name,
				Status:         string(status),
				Timestamp:      time.Now().UTC().Format(time.RFC3339),
				ServiceName:    serviceName,
				IsServiceEvent: true,
				Message:        fmt.Sprintf("SERVICE OUTAGE DETECTED: %s is unreachable", serviceName),
			})
		}
		e.triggerAlert(ctx, endpoint, isServiceWide, serviceName)
	}

}

func (e *CheckerEngine) Stop() {
	e.stopOnce.Do(func() {
		if e.stopCancel != nil {
			e.stopCancel()
		}
	})
	e.wg.Wait()
}

func (e *CheckerEngine) VerifyDatabase() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return e.driver.VerifyConnectivity(ctx)
}

func (e *CheckerEngine) reinitializeDriver() {
	logger.Info("reinitializing Neo4j driver due to connectivity loss")
	const maxAttempts = 5
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		newDriver, err := neo4j.NewDriverWithContext(e.config.Neo4jURI, neo4j.BasicAuth(e.config.Neo4jUser, e.config.Neo4jPassword, ""))
		if err != nil {
			logger.Warn("neo4j driver reinitialization failed", "attempt", attempt, "error", err)
			if attempt == maxAttempts {
				logger.Error("failed to reinitialize neo4j driver after max attempts", "error", err)
				return
			}
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err = newDriver.VerifyConnectivity(ctx)
		cancel()
		if err != nil {
			_ = newDriver.Close(context.Background())
			logger.Warn("neo4j connectivity check failed during reinitialization", "attempt", attempt, "error", err)
			if attempt == maxAttempts {
				logger.Error("failed to verify connectivity after reinitialization", "error", err)
				return
			}
			time.Sleep(time.Duration(attempt) * time.Second)
			continue
		}

		// Close old driver
		_ = e.driver.Close(context.Background())
		e.driver = newDriver
		logger.Info("neo4j driver reinitialized successfully")
		return
	}
}

type AlertEvent struct {
	EndpointID     string `json:"endpointId"`
	Name           string `json:"name"`
	Status         string `json:"status"`
	Timestamp      string `json:"timestamp"`
	ServiceName    string `json:"serviceName,omitempty"`
	Organization   string `json:"organization,omitempty"`
	IsServiceEvent bool   `json:"isServiceEvent,omitempty"`
	Message        string `json:"message,omitempty"`
}

// AnalyzeFailure checks if an endpoint's service is experiencing a full outage
func (e *CheckerEngine) AnalyzeFailure(ctx context.Context, endpoint *Endpoint) (isServiceWide bool, serviceName string, downCount int, totalCount int) {
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// Get the service for this endpoint
	result, err := session.Run(ctx, `
		MATCH (ep:Endpoint {id: $id})<-[:DEPENDS_ON]-(svc:Service)
		RETURN svc.name AS serviceName
		LIMIT 1
	`, map[string]any{"id": endpoint.ID})
	if err != nil || !result.Next(ctx) {
		return false, "", 0, 0
	}

	record := result.Record()
	serviceName = fmt.Sprintf("%v", record.Values[0])

	// Count UP vs DOWN endpoints in the service
	result2, err := session.Run(ctx, `
		MATCH (svc:Service {name: $serviceName})<-[:DEPENDS_ON]-(ep:Endpoint)
		WITH COUNT(ep) AS total, SUM(CASE WHEN ep.status = 'DOWN' THEN 1 ELSE 0 END) AS down
		RETURN down, total
	`, map[string]any{"serviceName": serviceName})
	if err != nil || !result2.Next(ctx) {
		return false, serviceName, 0, 0
	}

	record2 := result2.Record()
	downCount = int(record2.Values[0].(int64))
	totalCount = int(record2.Values[1].(int64))

	// Service-wide outage if 100% of endpoints are DOWN
	isServiceWide = totalCount > 0 && downCount == totalCount
	return isServiceWide, serviceName, downCount, totalCount
}

func (e *CheckerEngine) triggerAlert(ctx context.Context, endpoint *Endpoint, isServiceEvent bool, serviceName string) {
	// Use service-level throttling if it's a service event
	throttleKey := endpoint.ID
	if isServiceEvent {
		throttleKey = "svc_" + serviceName
	}

	const alertCooldown = time.Hour
	e.alertMu.Lock()
	last, ok := e.alertThrottles[throttleKey]
	if ok && time.Since(last) < alertCooldown {
		e.alertMu.Unlock()
		logger.Info("skipping alert due to throttling", "key", throttleKey)
		return
	}
	e.alertThrottles[throttleKey] = time.Now().UTC()
	e.alertMu.Unlock()

	alertMsg := fmt.Sprintf("Endpoint %s is DOWN", endpoint.Name)
	if isServiceEvent {
		alertMsg = fmt.Sprintf("SERVICE OUTAGE DETECTED: %s is unreachable", serviceName)
	}

	payload := map[string]any{
		"messaging_product": "whatsapp",
		"to":                getEnv("ALERT_WHATSAPP_TO", ""),
		"type":              "template",
		"template": map[string]any{
			"name":     "status_down_alert",
			"language": map[string]any{"code": "en_US"},
			"components": []map[string]any{{
				"type":       "body",
				"parameters": []map[string]any{{"type": "text", "text": alertMsg}},
			}},
		},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", e.config.WhatsAppAPIURL, strings.NewReader(string(body)))
	if err != nil {
		logger.Error("alert request failed", "error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", e.config.WhatsAppToken))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Error("alert dispatch failed", "error", err)
		return
	}
	defer resp.Body.Close()
	_, _ = io.ReadAll(resp.Body)

	logger.Info("alert triggered", "endpoint", endpoint.Name, "status", endpoint.LastStatus, "isServiceEvent", isServiceEvent)
}

func (e *CheckerEngine) StatusHandler(c *gin.Context) {
	ctx := context.Background()
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (ep:Endpoint)
		OPTIONAL MATCH (ep)<-[:DEPENDS_ON]-(s:Service)
		OPTIONAL MATCH (s)<-[:USES]-(o:Organization)
		RETURN ep.id AS id, ep.name AS name, ep.url AS url, ep.type AS type, 
			   ep.method AS method, ep.status AS status, ep.lastChecked AS lastChecked,
			   s.name AS serviceName, o.name AS organizationName
		ORDER BY ep.name
	`, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var endpoints []gin.H
	for result.Next(ctx) {
		record := result.Record()
		endpoints = append(endpoints, gin.H{
			"id":               record.Values[0],
			"name":             record.Values[1],
			"url":              record.Values[2],
			"type":             record.Values[3],
			"method":           record.Values[4],
			"status":           record.Values[5],
			"lastChecked":      record.Values[6],
			"serviceName":      record.Values[7],
			"organizationName": record.Values[8],
		})
	}

	c.JSON(http.StatusOK, gin.H{"endpoints": endpoints})
}

func (e *CheckerEngine) TriggerManualCheck(c *gin.Context) {
	var payload struct {
		ID string `json:"id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// Query the endpoint from Neo4j
	ctx := context.Background()
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (ep:Endpoint {id: $id})
		RETURN ep.id, ep.name, ep.url, ep.type, ep.method, ep.status, ep.lastChecked
	`, map[string]interface{}{"id": payload.ID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !result.Next(ctx) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Endpoint not found"})
		return
	}

	record := result.Record()
	endpoint := &Endpoint{
		ID:          record.Values[0].(string),
		Name:        record.Values[1].(string),
		URL:         record.Values[2].(string),
		Type:        record.Values[3].(string),
		Method:      record.Values[4].(string),
		LastStatus:  Status(record.Values[5].(string)),
		LastChecked: record.Values[6].(time.Time),
	}

	// Trigger the check asynchronously
	go func() {
		checkCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		checker := e.resolveChecker(endpoint)
		status, err := checker.Check(checkCtx, endpoint)
		if err != nil {
			logger.Warn("Manual check failed", "endpoint", endpoint.ID, "error", err)
			status = StatusDown
		}

		e.persistStatus(checkCtx, endpoint, status)
	}()

	c.JSON(http.StatusAccepted, gin.H{"message": "manual check queued", "endpointId": payload.ID})
}

func (e *CheckerEngine) GetEndpointHistory(c *gin.Context) {
	endpointID := c.Param("id")
	if endpointID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing endpoint id"})
		return
	}

	ctx := context.Background()
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (ep:Endpoint {id: $id})-[:HAS_STATUS_RECORD]->(record:StatusRecord)
		RETURN record.status AS status, record.timestamp AS timestamp, record.message AS message
		ORDER BY record.timestamp DESC
		LIMIT 10
	`, map[string]interface{}{"id": endpointID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var history []gin.H
	for result.Next(ctx) {
		record := result.Record()
		history = append(history, gin.H{
			"status":    record.Values[0],
			"timestamp": record.Values[1],
			"message":   record.Values[2],
		})
	}

	if err = result.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"history": history})
}

func (e *CheckerEngine) GetEndpointLogs(c *gin.Context) {
	endpointID := c.Query("id")
	if endpointID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing endpoint id"})
		return
	}

	ctx := context.Background()
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (ep:Endpoint {id: $id})-[r:HAS_STATUS_RECORD]->(record:StatusRecord)
		RETURN record.status AS status, record.timestamp AS timestamp, record.message AS message
		ORDER BY record.timestamp DESC
		LIMIT 5
	`, map[string]interface{}{"id": endpointID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var logs []gin.H
	for result.Next(ctx) {
		record := result.Record()
		logs = append(logs, gin.H{
			"status":    record.Values[0],
			"timestamp": record.Values[1],
			"message":   record.Values[2],
		})
	}

	if err = result.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

type HTTPChecker struct{}

type ZapierChecker struct{}

type StripeStatusChecker struct{}

func (h *HTTPChecker) Check(ctx context.Context, endpoint *Endpoint) (Status, error) {
	req, err := http.NewRequestWithContext(ctx, endpoint.Method, endpoint.URL, strings.NewReader(endpoint.Payload))
	if err != nil {
		return StatusDown, err
	}

	for k, v := range endpoint.Headers {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return StatusDown, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return StatusUp, nil
	}
	return StatusDown, fmt.Errorf("unexpected status %d", resp.StatusCode)
}

func (z *ZapierChecker) Check(ctx context.Context, endpoint *Endpoint) (Status, error) {
	return (&HTTPChecker{}).Check(ctx, endpoint)
}

func (s *StripeStatusChecker) Check(ctx context.Context, endpoint *Endpoint) (Status, error) {
	resp, err := http.Get(endpoint.URL)
	if err != nil {
		return StatusDown, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return StatusDown, fmt.Errorf("stripe status returned %d", resp.StatusCode)
	}
	return StatusUp, nil
}
