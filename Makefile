# Alexandria monorepo tasks.
# Replaces the former root package.json scripts (no root JS deps existed — only scripts).
# Target names mirror the old npm script names with ':' -> '-' (Make treats ':' as the
# rule separator, so colons are not usable in target names).

# Shared config, factored out of the repeated inline literals in the old scripts.
REGION       := eu-central-1
ACCOUNT_ID   := 671123374425
ECR_REGISTRY := $(ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com
IMAGE        := alexandria/images-processing
TF           := terraform -chdir=packages/infrastructure

.DEFAULT_GOAL := help
.PHONY: help cli-build infra-apply infra-output backend-build backend-deploy \
        frontend-build frontend-sync frontend-invalidate frontend-deploy \
        frontend-serve resync-index

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

cli-build: ## Build the admin CLI (was cli:build)
	make -C packages/cli build

infra-apply: ## Terraform apply (was infra:apply)
	$(TF) apply -auto-approve

infra-output: ## Export Terraform outputs to client/CLI configs (was infra:output)
	$(TF) output -json | jq '{alexandriaUserPoolId: .cognito_user_pool_id.value, alexandriaClientId: .cognito_user_pool_client_id.value, apiEndpoint: .api_endpoint.value}' | tee ./packages/web-client-v2/output.json ./packages/cli/bin/config.json > /dev/null

backend-build: ## Build backend functions + images-processing arm64 image (was backend:build)
	make -C packages/functions build
	docker buildx build --platform linux/arm64 -t $(IMAGE) -f ./packages/functions/images-processing/Dockerfile ./packages/functions/images-processing --provenance false
	docker tag $(IMAGE) $(ECR_REGISTRY)/$(IMAGE)
	docker image prune --force

backend-deploy: ## Package, push image to ECR, then apply infra (was backend:deploy)
	make -C packages/functions package
	aws ecr get-login-password --region $(REGION) | docker login --username AWS --password-stdin $(ECR_REGISTRY)
	docker push $(ECR_REGISTRY)/$(IMAGE)
	$(MAKE) infra-apply

frontend-build: ## Sync configs then build the web client (was frontend:build)
	$(MAKE) infra-output
	yarn --cwd packages/web-client-v2 build

frontend-sync: ## Sync built web client to S3 (was frontend:sync)
	aws s3 sync packages/web-client-v2/dist s3://$$($(TF) output -raw webclient_bucket) --delete

frontend-invalidate: ## Invalidate CloudFront app shell (was frontend:invalidate)
	aws cloudfront create-invalidation --paths '/index.html' '/sw.js' '/manifest.webmanifest' '/workbox-*' --distribution-id $$($(TF) output -raw cloudfront_distribution_id)

frontend-deploy: ## Build, sync and invalidate the web client (was frontend:deploy)
	$(MAKE) frontend-build
	$(MAKE) frontend-sync
	$(MAKE) frontend-invalidate

frontend-serve: ## Run the Vite dev server (was frontend:serve)
	yarn --cwd packages/web-client-v2 dev

resync-index: ## Trigger a full search-index resync (was resync-index)
	aws lambda invoke --function-name alexandria-index-items --payload '{"action":"fullResync"}' --cli-binary-format raw-in-base64-out /dev/stdout
