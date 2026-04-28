package main

import (
	"log/slog"
	"os"
)

var logger *slog.Logger

func initLogger() {
	env := getEnv("ENV", "development")
	var handler slog.Handler
	if env == "production" {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{AddSource: false})
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{AddSource: true})
	}

	logger = slog.New(handler).With("service", "zcheck-backend", "env", env)
}
