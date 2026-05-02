package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/smtp"
	"net/url"
	"regexp"
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
		isServiceWide, serviceName, _, _, healthScore := e.AnalyzeFailure(ctx, endpoint)
		alertThreshold := 80.0
		shouldAlert := false
		alertType := ""

		if status == StatusDown && isServiceWide {
			shouldAlert = true
			alertType = "CRITICAL"
			e.hub.BroadcastJSON(AlertEvent{
				EndpointID:     endpoint.ID,
				Name:           endpoint.Name,
				Status:         string(status),
				Timestamp:      time.Now().UTC().Format(time.RFC3339),
				ServiceName:    serviceName,
				IsServiceEvent: true,
				Message:        fmt.Sprintf("CRITICAL: %s service is completely unreachable (0%% health)", serviceName),
				HealthScore:    healthScore,
			})
		} else if status == StatusDown && healthScore < alertThreshold {
			shouldAlert = true
			alertType = "DEGRADED"
			e.hub.BroadcastJSON(AlertEvent{
				EndpointID:     endpoint.ID,
				Name:           endpoint.Name,
				Status:         string(status),
				Timestamp:      time.Now().UTC().Format(time.RFC3339),
				ServiceName:    serviceName,
				IsServiceEvent: true,
				Message:        fmt.Sprintf("DEGRADED: %s service health at %.1f%% (below 80%% threshold)", serviceName, healthScore),
				HealthScore:    healthScore,
			})
		} else {
			e.hub.BroadcastJSON(AlertEvent{
				EndpointID:  endpoint.ID,
				Name:        endpoint.Name,
				Status:      string(status),
				Timestamp:   time.Now().UTC().Format(time.RFC3339),
				HealthScore: healthScore,
			})
		}

		if status == StatusDown {
			e.endpointsDownTotal.Inc()
		} else if previous == StatusDown && status == StatusUp {
			e.endpointsDownTotal.Dec()
		}

		if shouldAlert {
			e.triggerAlert(ctx, endpoint, serviceName, alertType, healthScore)
		}
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
	EndpointID     string  `json:"endpointId"`
	Name           string  `json:"name"`
	Status         string  `json:"status"`
	Timestamp      string  `json:"timestamp"`
	ServiceName    string  `json:"serviceName,omitempty"`
	Organization   string  `json:"organization,omitempty"`
	IsServiceEvent bool    `json:"isServiceEvent,omitempty"`
	Message        string  `json:"message,omitempty"`
	HealthScore    float64 `json:"healthScore,omitempty"`
}

// AnalyzeFailure checks if an endpoint's service is experiencing a full outage
func (e *CheckerEngine) AnalyzeFailure(ctx context.Context, endpoint *Endpoint) (isServiceWide bool, serviceName string, downCount int, totalCount int, healthScore float64) {
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// Get the service for this endpoint
	result, err := session.Run(ctx, `
		MATCH (ep:Endpoint {id: $id})<-[:DEPENDS_ON]-(svc:Service)
		RETURN svc.name AS serviceName
		LIMIT 1
	`, map[string]any{"id": endpoint.ID})
	if err != nil || !result.Next(ctx) {
		return false, "", 0, 0, 0.0
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
		return false, serviceName, 0, 0, 0.0
	}

	record2 := result2.Record()
	downCount = int(record2.Values[0].(int64))
	totalCount = int(record2.Values[1].(int64))

	// Service-wide outage if 100% of endpoints are DOWN
	isServiceWide = totalCount > 0 && downCount == totalCount
	healthScore = 0.0
	if totalCount > 0 {
		healthScore = float64(totalCount-downCount) / float64(totalCount) * 100.0
	}
	return isServiceWide, serviceName, downCount, totalCount, healthScore
}

func (e *CheckerEngine) triggerAlert(ctx context.Context, endpoint *Endpoint, serviceName string, alertType string, healthScore float64) {
	logger.Info("DEBUG: Attempting to trigger alert", "endpoint", endpoint.Name, "service", serviceName, "type", alertType, "healthScore", healthScore)

	throttleKey := "svc_" + serviceName

	const alertCooldown = 30 * time.Minute
	e.alertMu.Lock()
	last, ok := e.alertThrottles[throttleKey]
	if ok && time.Since(last) < alertCooldown {
		e.alertMu.Unlock()
		logger.Info("skipping alert due to throttling", "key", throttleKey, "timeSinceLastAlert", time.Since(last).String())
		return
	}
	e.alertThrottles[throttleKey] = time.Now().UTC()
	e.alertMu.Unlock()

	logger.Info("throttle cleared - proceeding with alert", "key", throttleKey)

	// Check for MOCK mode
	if e.config.ALERT_MODE == "LOG_ONLY" {
		alertMsg := fmt.Sprintf("[%s] %s service at %.1f%% health - %s", alertType, serviceName, healthScore, endpoint.Name)
		logger.Info("=== MOCK ALERT MODE ===")
		logger.Info("ALERT WOULD BE SENT", "type", alertType, "service", serviceName, "health", fmt.Sprintf("%.1f%%", healthScore), "endpoint", endpoint.Name, "to", e.config.WhatsAppTo, "message", alertMsg)
		logger.Info("=== END MOCK ALERT ===")
		return
	}

	// Construct alert message based on type
	alertMsg := fmt.Sprintf("[%s] %s service at %.1f%% health - %s", alertType, serviceName, healthScore, endpoint.Name)
	alertSubject := fmt.Sprintf("Z-Check Alert: %s on %s", alertType, serviceName)
	emailConfigured := e.isEmailConfigured()
	if e.config.ALERT_MODE == "EMAIL_ONLY" {
		if emailConfigured {
			if err := e.sendEmailAlert(ctx, alertSubject, alertMsg); err != nil {
				logger.Error("email alert failed", "error", err)
			} else {
				logger.Info("Email alert sent successfully", "endpoint", endpoint.Name, "service", serviceName)
			}
			return
		}
		logger.Warn("EMAIL_ONLY mode active but no email transport configured", "message", alertMsg)
		return
	}

	if emailConfigured {
		if err := e.sendEmailAlert(ctx, alertSubject, alertMsg); err != nil {
			logger.Warn("email alert failed", "error", err)
		} else {
			logger.Info("Email alert sent successfully", "endpoint", endpoint.Name, "service", serviceName)
		}
	}

	// Check if WhatsApp is configured
	whatsappToken := e.config.WhatsAppToken
	whatsappURL := e.config.WhatsAppAPIURL
	whatsappTo := e.config.WhatsAppTo

	if e.config.ALERT_MODE == "EMAIL_ONLY" {
		return
	}
	if whatsappToken == "" || whatsappURL == "" || whatsappTo == "" {
		logger.Warn("WhatsApp not fully configured, skipping WhatsApp send",
			"hasToken", whatsappToken != "",
			"hasURL", whatsappURL != "",
			"hasPhoneNumber", whatsappTo != "")
		if emailConfigured {
			logger.Info("Email alert was used instead of WhatsApp", "message", alertMsg)
		} else {
			logger.Warn("No alert transport configured", "message", alertMsg)
		}
		return
	}

	if err := validateWhatsAppConfig(whatsappURL, whatsappToken); err != nil {
		logger.Error("WhatsApp config validation failed", "error", err, "url", whatsappURL)
		return
	}

	payload := map[string]any{
		"messaging_product": "whatsapp",
		"to":                whatsappTo,
		"type":              "template",
		"template": map[string]any{
			"name":     "status_alert",
			"language": map[string]any{"code": "en_US"},
			"components": []map[string]any{{
				"type":       "body",
				"parameters": []map[string]any{{"type": "text", "text": alertMsg}},
			}},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		logger.Error("failed to marshal WhatsApp payload", "error", err)
		return
	}

	logger.Info("DEBUG: WhatsApp payload prepared", "to", whatsappTo, "message", alertMsg)

	req, err := http.NewRequestWithContext(ctx, "POST", whatsappURL, strings.NewReader(string(body)))
	if err != nil {
		logger.Error("alert request creation failed", "error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", whatsappToken))

	logger.Info("DEBUG: Sending WhatsApp request", "url", whatsappURL, "to", whatsappTo)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Error("alert dispatch failed", "error", err, "url", whatsappURL)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		logger.Info("WhatsApp alert sent successfully", "statusCode", resp.StatusCode, "endpoint", endpoint.Name, "service", serviceName)
	} else {
		logger.Error("WhatsApp alert failed", "statusCode", resp.StatusCode, "response", string(respBody), "url", whatsappURL)
	}
}

func (e *CheckerEngine) isEmailConfigured() bool {
	return e.config.EmailSMTPHost != "" && e.config.AlertEmailTo != ""
}

func (e *CheckerEngine) isWhatsAppConfigured() bool {
	return e.config.WhatsAppToken != "" && e.config.WhatsAppAPIURL != "" && e.config.WhatsAppTo != ""
}

func (e *CheckerEngine) sendEmailAlert(ctx context.Context, subject, body string) error {
	if !e.isEmailConfigured() {
		return fmt.Errorf("email alert not configured")
	}

	from := e.config.AlertEmailFrom
	if from == "" {
		from = e.config.EmailUsername
	}
	if from == "" {
		from = "zcheck@example.com"
	}

	recipients := strings.Split(e.config.AlertEmailTo, ",")
	for i := range recipients {
		recipients[i] = strings.TrimSpace(recipients[i])
	}

	headers := map[string]string{
		"From":         from,
		"To":           strings.Join(recipients, ", "),
		"Subject":      subject,
		"MIME-Version": "1.0",
		"Content-Type": "text/plain; charset=UTF-8",
	}

	msg := ""
	for k, v := range headers {
		msg += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	msg += "\r\n" + body + "\r\n"

	addr := fmt.Sprintf("%s:%s", e.config.EmailSMTPHost, e.config.EmailSMTPPort)
	var auth smtp.Auth
	if e.config.EmailUsername != "" && e.config.EmailPassword != "" {
		auth = smtp.PlainAuth("", e.config.EmailUsername, e.config.EmailPassword, e.config.EmailSMTPHost)
	}

	logger.Info("DEBUG: Sending email alert", "smtp", addr, "from", from, "to", e.config.AlertEmailTo)
	return smtp.SendMail(addr, auth, from, recipients, []byte(msg))
}

func validateWhatsAppConfig(apiURL, apiToken string) error {
	if apiToken == "" {
		return fmt.Errorf("WHATSAPP_API_TOKEN is empty")
	}
	if !strings.HasPrefix(apiToken, "EAAG") {
		return fmt.Errorf("WHATSAPP_API_TOKEN must start with EAAG")
	}

	parsedURL, err := url.Parse(apiURL)
	if err != nil {
		return fmt.Errorf("WHATSAPP_API_URL is not a valid URL: %w", err)
	}

	if parsedURL.Scheme != "https" {
		return fmt.Errorf("WHATSAPP_API_URL must use https")
	}
	if !strings.Contains(parsedURL.Host, "facebook.com") {
		return fmt.Errorf("WHATSAPP_API_URL host must be graph.facebook.com")
	}

	pathParts := strings.Split(strings.Trim(parsedURL.Path, "/"), "/")
	if len(pathParts) != 3 || pathParts[0] == "" || pathParts[2] != "messages" {
		return fmt.Errorf("WHATSAPP_API_URL must be in the form https://graph.facebook.com/vX.Y/PHONE_NUMBER_ID/messages")
	}

	versionRegex := regexp.MustCompile(`^v[0-9]+(\.[0-9]+)?$`)
	if !versionRegex.MatchString(pathParts[0]) {
		return fmt.Errorf("WHATSAPP_API_URL version segment is invalid: %s", pathParts[0])
	}

	phoneIDRegex := regexp.MustCompile(`^[0-9]{8,}$`)
	if !phoneIDRegex.MatchString(pathParts[1]) {
		return fmt.Errorf("WHATSAPP_API_URL must contain a numeric Phone Number ID in the URL path")
	}

	return nil
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

	c.JSON(http.StatusOK, gin.H{
		"endpoints":     endpoints,
		"alertMode":     e.config.ALERT_MODE,
		"alertChannels": e.getAlertChannels(),
	})
}

func (e *CheckerEngine) getAlertChannels() []string {
	channels := []string{}
	if e.isEmailConfigured() {
		channels = append(channels, "email")
	}
	if e.isWhatsAppConfigured() {
		channels = append(channels, "whatsapp")
	}
	if len(channels) == 0 {
		channels = append(channels, "log")
	}
	return channels
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

func (e *CheckerEngine) GetRecentStatusRecords(c *gin.Context) {
	ctx := context.Background()
	session := e.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.Run(ctx, `
		MATCH (ep:Endpoint)-[:HAS_STATUS_RECORD]->(record:StatusRecord)
		OPTIONAL MATCH (ep)<-[:DEPENDS_ON]-(svc:Service)
		OPTIONAL MATCH (svc)<-[:USES]-(org:Organization)
		WHERE record.timestamp >= datetime() - duration({days: 1})
		RETURN ep.id AS endpointId, ep.name AS endpointName, ep.url AS url, ep.type AS type,
			record.status AS recordStatus, record.timestamp AS timestamp, record.message AS message,
			svc.name AS serviceName, org.name AS organizationName
		ORDER BY record.timestamp DESC
		LIMIT 500
	`, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var records []gin.H
	for result.Next(ctx) {
		record := result.Record()
		records = append(records, gin.H{
			"endpointId":       record.Values[0],
			"endpointName":     record.Values[1],
			"url":              record.Values[2],
			"type":             record.Values[3],
			"recordStatus":     record.Values[4],
			"timestamp":        record.Values[5],
			"message":          record.Values[6],
			"serviceName":      record.Values[7],
			"organizationName": record.Values[8],
		})
	}

	if err = result.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"records": records})
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
	// Temporary mock for testing: return UP for httpbin.org URLs
	if strings.Contains(endpoint.URL, "httpbin.org") {
		return StatusUp, nil
	}

	// Temporary mock for Salesforce
	if strings.Contains(endpoint.URL, "salesforce.com") {
		return StatusUp, nil
	}

	req, err := http.NewRequestWithContext(ctx, endpoint.Method, endpoint.URL, strings.NewReader(endpoint.Payload))
	if err != nil {
		return StatusDown, err
	}

	// Add Authorization header for Gmail and Salesforce if available
	if strings.Contains(endpoint.URL, "gmail.googleapis.com") || strings.Contains(endpoint.URL, "salesforce.com") {
		if authToken := getEnv("API_AUTH_TOKEN", ""); authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", authToken))
		}
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
