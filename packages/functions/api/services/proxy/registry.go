package proxy

import (
	"context"
	"os"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/rs/zerolog/log"
)

// Config defines how to proxy requests for a specific URL pattern
type Config struct {
	// Pattern to match in URL (e.g., "babelio.com")
	Pattern string
	// SSM parameter name for API key
	APIKeyParam string
	// BuildURL transforms target URL into proxied URL
	BuildURL func(apiKey, targetURL string) string
	// Timeout in seconds for proxied requests (0 = use default)
	TimeoutSeconds int
}

// registry holds all registered proxy configurations
var (
	registry     []Config
	registryLock sync.RWMutex
)

// apiKeyCache caches SSM-fetched API keys by parameter name
var (
	apiKeyCache     = make(map[string]string)
	apiKeyCacheLock sync.RWMutex
)

// Register adds a proxy configuration to the registry
func Register(cfg Config) {
	registryLock.Lock()
	defer registryLock.Unlock()
	registry = append(registry, cfg)
	log.Info().Str("pattern", cfg.Pattern).Msg("Proxy: registered configuration")
}

// Lookup finds a proxy config matching the given URL
// Returns nil if no proxy is needed
func Lookup(url string) *Config {
	registryLock.RLock()
	defer registryLock.RUnlock()

	for i := range registry {
		if strings.Contains(url, registry[i].Pattern) {
			return &registry[i]
		}
	}
	return nil
}

// GetAPIKey fetches and caches the API key from SSM
func GetAPIKey(paramName string) string {
	if paramName == "" {
		return ""
	}

	// Check cache first
	apiKeyCacheLock.RLock()
	if key, ok := apiKeyCache[paramName]; ok {
		apiKeyCacheLock.RUnlock()
		return key
	}
	apiKeyCacheLock.RUnlock()

	// Fetch from SSM
	apiKeyCacheLock.Lock()
	defer apiKeyCacheLock.Unlock()

	// Double-check after acquiring write lock
	if key, ok := apiKeyCache[paramName]; ok {
		return key
	}

	region := os.Getenv("REGION")
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		log.Warn().Str("param", paramName).Err(err).Msg("Proxy: failed to load AWS config")
		return ""
	}

	ssmClient := ssm.NewFromConfig(cfg)
	withDecryption := true
	output, err := ssmClient.GetParameter(context.TODO(), &ssm.GetParameterInput{
		Name:           &paramName,
		WithDecryption: &withDecryption,
	})
	if err != nil {
		log.Warn().Str("param", paramName).Err(err).Msg("Proxy: failed to fetch API key from SSM")
		return ""
	}

	apiKeyCache[paramName] = *output.Parameter.Value
	log.Info().Str("param", paramName).Msg("Proxy: API key loaded and cached")
	return apiKeyCache[paramName]
}
