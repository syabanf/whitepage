package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Env             string
	Host            string
	Port            int
	LogLevel        string
	DatabaseURL     string
	UploadDir        string
	AssetPublicBase  string
	InternalToken    string
	PlatformDomain   string
	DomainAutoVerify bool
}

func Load() (Config, error) {
	cfg := Config{
		Env:             env("API_ENV", "development"),
		Host:            env("API_HOST", "0.0.0.0"),
		LogLevel:        env("API_LOG_LEVEL", "info"),
		UploadDir:       env("UPLOAD_DIR", ".uploads"),
		AssetPublicBase: env("ASSET_PUBLIC_BASE", "http://localhost:8080"),
		InternalToken:   env("INTERNAL_TOKEN", "dev_only_not_secret"),
		PlatformDomain:  env("PLATFORM_DOMAIN", "cms.app"),
		// Dev shortcut: skip real DNS TXT verification (we can't own demo domains).
		DomainAutoVerify: env("DOMAIN_DEV_AUTOVERIFY", "true") == "true",
	}

	portStr := env("API_PORT", "8080")
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return Config{}, fmt.Errorf("API_PORT %q is not a number: %w", portStr, err)
	}
	cfg.Port = port

	cfg.DatabaseURL = os.Getenv("DATABASE_URL")
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}

	return cfg, nil
}

func (c Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
