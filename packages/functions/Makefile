.PHONY: build build-api build-indexer build-consistency-manager build-onboard-users package package-api package-indexer package-presignup clean lint
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

build-onboard-users:
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags="$(LDFLAGS)" -o onboard-users/$(BIN_DIR)/bootstrap ./onboard-users/cmd

# Build all Lambda binaries
build: build-api build-indexer build-consistency-manager build-onboard-users

package-api: build-api
	mkdir -p api/$(PACKAGE_DIR)
	cd api/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/api.zip bootstrap

package-indexer: build-indexer
	mkdir -p index-items/$(PACKAGE_DIR)
	cd index-items/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/indexer.zip bootstrap

package-consistency-manager: build-consistency-manager
	mkdir -p consistency-manager/$(PACKAGE_DIR)
	cd consistency-manager/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/consistency-mgr.zip bootstrap

package-onboard-users: build-onboard-users
	mkdir -p onboard-users/$(PACKAGE_DIR)
	cd onboard-users/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/onboard-users.zip bootstrap

# Package all Lambdas
package: package-api package-indexer package-consistency-manager package-onboard-users

# Lint all Go code
lint:
	golangci-lint run ./...

# Format all Go code
format:
	golangci-lint fmt ./...


clean:
	rm -rf api/$(BIN_DIR)
	rm -rf api/$(PACKAGE_DIR)
	rm -rf index-items/$(BIN_DIR)
	rm -rf index-items/$(PACKAGE_DIR)
	rm -rf consistency-manager/$(BIN_DIR)
	rm -rf consistency-manager/$(PACKAGE_DIR)
	rm -rf onboard-users/$(BIN_DIR)
	rm -rf onboard-users/$(PACKAGE_DIR)
	rm -rf .serverless