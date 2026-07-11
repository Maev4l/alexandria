.PHONY: build build-api build-indexer build-consistency-manager build-user-onboarding build-user-approval package package-api package-indexer package-user-onboarding package-user-approval clean lint format run-api-local
# Build settings for AWS Lambda (ARM64)
GOOS := linux
GOARCH := arm64
LDFLAGS := -s -w

# Output directory
BIN_DIR := bin

# Package directory
PACKAGE_DIR := dist

# Build API handler for Lambda
build-api:
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags="$(LDFLAGS)" -o api/$(BIN_DIR)/bootstrap ./api/cmd

# Build Indexer for Lambda
build-indexer:
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags="$(LDFLAGS)" -o index-items/$(BIN_DIR)/bootstrap ./index-items/cmd

build-consistency-manager:
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags="$(LDFLAGS)" -o consistency-manager/$(BIN_DIR)/bootstrap ./consistency-manager/cmd

build-user-onboarding:
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags="$(LDFLAGS)" -o user-onboarding/$(BIN_DIR)/bootstrap ./user-onboarding/cmd

build-user-approval:
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags="$(LDFLAGS)" -o user-approval/$(BIN_DIR)/bootstrap ./user-approval/cmd

# Build all Lambda binaries
build: build-api build-indexer build-consistency-manager build-user-onboarding build-user-approval

package-api: build-api
	mkdir -p api/$(PACKAGE_DIR)
	cd api/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/api.zip bootstrap

package-indexer: build-indexer
	mkdir -p index-items/$(PACKAGE_DIR)
	cd index-items/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/indexer.zip bootstrap

package-consistency-manager: build-consistency-manager
	mkdir -p consistency-manager/$(PACKAGE_DIR)
	cd consistency-manager/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/consistency-mgr.zip bootstrap

package-user-onboarding: build-user-onboarding
	mkdir -p user-onboarding/$(PACKAGE_DIR)
	cd user-onboarding/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/user-onboarding.zip bootstrap

package-user-approval: build-user-approval
	mkdir -p user-approval/$(PACKAGE_DIR)
	cd user-approval/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/user-approval.zip bootstrap

# Package all Lambdas
package: package-api package-indexer package-consistency-manager package-user-onboarding package-user-approval

# Lint all Go code
lint:
	golangci-lint run ./...

# Format all Go code
format:
	golangci-lint fmt ./...


# Run the API lambda locally as a plain HTTP server (Web Adapter mode).
# Requires AWS credentials in the environment (e.g. `aws sso login`)
# and env vars sourced from api/.env.local (copy from .env.local.example).
run-api-local:
	@test -f api/.env.local || (echo "Missing api/.env.local — copy from api/.env.local.example"; exit 1)
	@set -a && . ./api/.env.local && set +a && go run ./api/cmd

clean:
	rm -rf api/$(BIN_DIR)
	rm -rf api/$(PACKAGE_DIR)
	rm -rf index-items/$(BIN_DIR)
	rm -rf index-items/$(PACKAGE_DIR)
	rm -rf consistency-manager/$(BIN_DIR)
	rm -rf consistency-manager/$(PACKAGE_DIR)
	rm -rf user-onboarding/$(BIN_DIR)
	rm -rf user-onboarding/$(PACKAGE_DIR)
	rm -rf user-approval/$(BIN_DIR)
	rm -rf user-approval/$(PACKAGE_DIR)
	rm -rf .serverless