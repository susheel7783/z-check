package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
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
	WhatsAppTo     string
	EmailSMTPHost  string
	EmailSMTPPort  string
	EmailUsername  string
	EmailPassword  string
	AlertEmailFrom string
	AlertEmailTo   string
	ALERT_MODE     string
	JWTSecret      string
	GinMode        string
}

func main() {
	config := loadConfig()
	gin.SetMode(config.GinMode)
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

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(cors.Default())

	// Auth routes (public)
	r.POST("/auth/signup", func(c *gin.Context) {
		Signup(c, driver)
	})
	r.POST("/auth/login", func(c *gin.Context) {
		Login(c, driver, config.JWTSecret)
	})

	// Public routes
	r.GET("/health", func(c *gin.Context) {
		if err := checkerEngine.VerifyDatabase(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy", "error": "database connection failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Protected API routes
	api := r.Group("/api")
	api.Use(JWTMiddleware(config.JWTSecret))
	{
		api.GET("/status", checkerEngine.StatusHandler)
		api.GET("/endpoints/:id/history", checkerEngine.GetEndpointHistory)
		api.GET("/reports/logs", checkerEngine.GetRecentStatusRecords)
		api.GET("/endpoint-logs", checkerEngine.GetEndpointLogs)
		api.GET("/ws", func(c *gin.Context) {
			serveWs(hub, c.Writer, c.Request)
		})
		api.POST("/test-check", checkerEngine.TriggerManualCheck)
	}

	// Dummy API endpoints for testing
	dummyAPI := r.Group("/dummy")
	{
		dummyAPI.GET("/payments", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":    "UP",
				"service":   "Payments API",
				"latency":   "23ms",
				"timestamp": time.Now().Format(time.RFC3339),
				"uptime":    "99.98%",
			})
		})
		dummyAPI.GET("/orders", func(c *gin.Context) {
			// Simulate occasional failures
			if time.Now().Unix()%10 == 0 {
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"status":    "DOWN",
					"service":   "Orders API",
					"error":     "Database connection timeout",
					"timestamp": time.Now().Format(time.RFC3339),
				})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"status":    "UP",
				"service":   "Orders API",
				"latency":   "45ms",
				"timestamp": time.Now().Format(time.RFC3339),
				"uptime":    "99.95%",
			})
		})
		dummyAPI.GET("/inventory", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":    "UP",
				"service":   "Inventory API",
				"latency":   "31ms",
				"timestamp": time.Now().Format(time.RFC3339),
				"uptime":    "99.99%",
			})
		})
		dummyAPI.GET("/gateway", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":    "UP",
				"service":   "Gateway API",
				"latency":   "18ms",
				"timestamp": time.Now().Format(time.RFC3339),
				"uptime":    "99.97%",
			})
		})
		dummyAPI.GET("/auth", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":    "UP",
				"service":   "Authentication API",
				"latency":   "12ms",
				"timestamp": time.Now().Format(time.RFC3339),
				"uptime":    "99.99%",
			})
		})
		dummyAPI.POST("/alert-test", func(c *gin.Context) {
			var alertData struct {
				ServiceName string `json:"service_name" binding:"required"`
				Email       string `json:"email" binding:"required,email"`
				Message     string `json:"message" binding:"required"`
			}

			if err := c.BindJSON(&alertData); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
				return
			}

			// Send test alert email
			err := SendAlertEmail(
				config.EmailSMTPHost,
				config.EmailSMTPPort,
				config.EmailUsername,
				config.EmailPassword,
				config.AlertEmailFrom,
				alertData.Email,
				alertData.ServiceName,
				alertData.Message,
			)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"success":   true,
				"message":   "Alert email sent successfully",
				"recipient": alertData.Email,
				"timestamp": time.Now().Format(time.RFC3339),
			})
		})
	}

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
		WhatsAppTo:     getEnv("ALERT_WHATSAPP_TO", ""),
		EmailSMTPHost:  getEnv("EMAIL_SMTP_HOST", ""),
		EmailSMTPPort:  getEnv("EMAIL_SMTP_PORT", "587"),
		EmailUsername:  getEnv("EMAIL_USERNAME", ""),
		EmailPassword:  getEnv("EMAIL_PASSWORD", ""),
		AlertEmailFrom: getEnv("ALERT_EMAIL_FROM", ""),
		AlertEmailTo:   getEnv("ALERT_EMAIL_TO", ""),
		ALERT_MODE:     getEnv("ALERT_MODE", "PRODUCTION"),
		JWTSecret:      getEnv("JWT_SECRET", "your-secret-key-change-this-in-production"),
		GinMode:        getEnv("GIN_MODE", gin.ReleaseMode),
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
