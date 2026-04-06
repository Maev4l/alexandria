package proxy

import (
	"context"
	"crypto/tls"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

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
	// BuildURL transforms target URL into proxied URL (for GET requests via URL method)
	BuildURL func(apiKey, targetURL string) string
	// BuildProxyURL returns the proxy server URL for proxy mode (for POST/other methods)
	// If nil, proxy mode is not supported
	BuildProxyURL func(apiKey string) string
	// Timeout in seconds for proxied requests (0 = use default)
	TimeoutSeconds int
	// SkipTLSVerify disables TLS certificate verification (needed for proxies that do TLS interception)
	SkipTLSVerify bool
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

// CreateHTTPClient creates an HTTP client configured for proxy mode
// Returns nil if proxy mode is not supported for this config
func CreateHTTPClient(cfg *Config) *http.Client {
	if cfg == nil || cfg.BuildProxyURL == nil {
		return nil
	}

	apiKey := GetAPIKey(cfg.APIKeyParam)
	if apiKey == "" {
		return nil
	}

	proxyURLStr := cfg.BuildProxyURL(apiKey)
	proxyURL, err := url.Parse(proxyURLStr)
	if err != nil {
		log.Warn().Str("pattern", cfg.Pattern).Err(err).Msg("Proxy: failed to parse proxy URL")
		return nil
	}

	timeout := 30 * time.Second
	if cfg.TimeoutSeconds > 0 {
		timeout = time.Duration(cfg.TimeoutSeconds) * time.Second
	}

	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}
	if cfg.SkipTLSVerify {
		tlsConfig.InsecureSkipVerify = true
	}

	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			Proxy:           http.ProxyURL(proxyURL),
			TLSClientConfig: tlsConfig,
		},
	}
}
