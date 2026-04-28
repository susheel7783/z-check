package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type AppConfig struct {
	BindAddress    string
	Neo4jURI       string
	Neo4jUser      string
	Neo4jPassword  string
	WhatsAppAPIURL string
	WhatsAppToken  string
}

func main() {
	config := loadConfig()
	initLogger()
	driver, err := initNeo4jDriver(config.Neo4jURI, config.Neo4jUser, config.Neo4jPassword)
	if err != nil {
		logger.Error("failed to initialize neo4j driver", "error", err)
		os.Exit(1)
	}
	defer driver.Close(context.Background())

	hub := NewHub()
	go hub.Run()

	checkerEngine := NewCheckerEngine(driver, config, hub)
	go checkerEngine.Start()

	r := gin.Default()
	r.GET("/health", func(c *gin.Context) {
		if err := checkerEngine.VerifyDatabase(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy", "error": "database connection failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))
	r.GET("/api/status", checkerEngine.StatusHandler)
	r.GET("/api/endpoints/:id/history", checkerEngine.GetEndpointHistory)
	r.GET("/api/endpoint-logs", checkerEngine.GetEndpointLogs)
	r.GET("/api/ws", func(c *gin.Context) {
		serveWs(hub, c.Writer, c.Request)
	})
	r.POST("/api/test-check", checkerEngine.TriggerManualCheck)

	logger.Info("starting backend", "address", config.BindAddress)

	srv := &http.Server{
		Addr:    config.BindAddress,
		Handler: r,
	}

	serverErrors := make(chan error, 1)
	go func() {
		serverErrors <- srv.ListenAndServe()
	}()

	shutdownCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErrors:
		if err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	case <-shutdownCtx.Done():
		logger.Info("shutdown signal received")
	}

	shutdownTimeout, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownTimeout); err != nil {
		logger.Warn("server shutdown error", "error", err)
	}
	checkerEngine.Stop()
	logger.Info("shutdown complete")
}

func loadConfig() AppConfig {
	return AppConfig{
		BindAddress:    getEnv("BACKEND_BIND_ADDRESS", ":8080"),
		Neo4jURI:       getEnv("NEO4J_URI", "neo4j://neo4j:7687"),
		Neo4jUser:      getEnv("NEO4J_USER", "neo4j"),
		Neo4jPassword:  getEnv("NEO4J_PASSWORD", "password"),
		WhatsAppAPIURL: getEnv("WHATSAPP_API_URL", "https://graph.facebook.com/v16.0/PHONE_NUMBER_ID/messages"),
		WhatsAppToken:  getEnv("WHATSAPP_API_TOKEN", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

func initNeo4jDriver(uri, username, password string) (neo4j.DriverWithContext, error) {
	const maxAttempts = 20
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(username, password, ""))
		if err != nil {
			if attempt == maxAttempts {
				return nil, err
			}
			backoff := time.Duration(2<<uint(attempt-1)) * time.Second
			if backoff > 30*time.Second {
				backoff = 30 * time.Second
			}
			logger.Warn("neo4j driver initialization failed", "attempt", attempt, "error", err, "backoff", backoff)
			time.Sleep(backoff)
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err = driver.VerifyConnectivity(ctx)
		cancel()
		if err == nil {
			return driver, nil
		}

		_ = driver.Close(context.Background())
		if attempt == maxAttempts {
			return nil, err
		}
		backoff := time.Duration(2<<uint(attempt-1)) * time.Second
		if backoff > 30*time.Second {
			backoff = 30 * time.Second
		}
		logger.Warn("neo4j connectivity check failed", "attempt", attempt, "error", err, "backoff", backoff)
		time.Sleep(backoff)
	}
	return nil, fmt.Errorf("could not initialize neo4j after %d attempts", maxAttempts)
}
