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
        frontend-serve frontend-preview resync-index

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

cli-build: ## Build the admin CLI (was cli:build)
	make -C packages/cli build

infra-apply: ## Terraform apply (was infra:apply)
	$(TF) apply -auto-approve

# Captures to temp files and validates BEFORE installing anything.
#
# The previous `terraform output | jq | tee a b c` was destructive on failure: tee truncates
# all three destinations before terraform has produced a byte, so an expired SSO session left
# every config empty. An empty web-client config does not fail at startup — it fails at
# sign-in, with an Amplify internal error, which is a miserable way to discover it.
#
# There is no pipeline here at all, which is a stronger guard than `set -o pipefail`: every
# command's exit status is checked directly and nothing masks terraform's.
#
# The CLI takes a DIFFERENT shape ({userPoolId, region, tableName, bucketName} — see
# packages/cli/internal/config/config.go). The old line wrote the web-client shape into it,
# so every run silently broke the admin CLI. Its Cognito and region values are refreshed here
# and any tableName/bucketName already in the file are preserved, because terraform does not
# output either one.
infra-output: ## Export Terraform outputs to client/CLI configs (was infra:output)
	@set -e; \
	raw=$$(mktemp); web=$$(mktemp); cli=$$(mktemp); \
	trap 'rm -f "$$raw" "$$web" "$$cli"' EXIT; \
	if ! $(TF) output -json > "$$raw"; then \
		echo "make: terraform output failed — every config left untouched. Try: aws sso login" >&2; \
		exit 1; \
	fi; \
	if ! jq -e '{alexandriaUserPoolId: .cognito_user_pool_id.value, alexandriaClientId: .cognito_user_pool_client_id.value, apiEndpoint: .api_endpoint.value} | select((.alexandriaUserPoolId // "") != "" and (.alexandriaClientId // "") != "")' "$$raw" > "$$web"; then \
		echo "make: terraform output was empty or missing the Cognito ids — every config left untouched" >&2; \
		exit 1; \
	fi; \
	pool=$$(jq -r '.cognito_user_pool_id.value' "$$raw"); \
	region=$$(jq -r '.region.value // "$(REGION)"' "$$raw"); \
	prev=$$(jq -c '{tableName: (.tableName // ""), bucketName: (.bucketName // "")}' ./packages/cli/bin/config.json 2>/dev/null || echo '{"tableName":"","bucketName":""}'); \
	echo "$$prev" | jq --arg pool "$$pool" --arg region "$$region" '. + {userPoolId: $$pool, region: $$region}' > "$$cli"; \
	cp "$$web" ./packages/web-client-v2/output.json; \
	cp "$$web" ./packages/web-client-v3/output.json; \
	cp "$$cli" ./packages/cli/bin/config.json; \
	if [ -z "$$(jq -r '.tableName' "$$cli")" ] || [ -z "$$(jq -r '.bucketName' "$$cli")" ]; then \
		echo "make: note — packages/cli/bin/config.json still needs tableName and bucketName; terraform outputs neither, so set them by hand." >&2; \
	fi; \
	echo "make: wrote web-client-v2, web-client-v3 and cli configs"

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

# THE FRONTEND IS v3. These targets pointed at web-client-v2 until the cutover; v2's source stays
# in the repo as a reference, but nothing here builds or deploys it any more.
#
# Leaving them aimed at v2 would have been the more dangerous option: after the cutover
# `frontend-deploy` still read as "deploy the app" while silently rolling production BACK to v2,
# with `--delete` removing v3 as it went. A target whose name no longer matches what it does is
# worse than one that does not exist.
#
# To build or serve v2 deliberately, use `yarn --cwd packages/web-client-v2 build|dev` — explicit,
# and nothing anyone reaches for by habit.
frontend-build: ## Sync configs then build the web client
	$(MAKE) infra-output
	yarn --cwd packages/web-client-v3 build

frontend-sync: ## Sync built web client to S3
	aws s3 sync packages/web-client-v3/dist s3://$$($(TF) output -raw webclient_bucket) --delete

# `/*`, not the four app-shell paths v2 listed. v3 adds /icons/* and /fonts/*, and the shell rule
# it was narrowed for — invalidate only what CloudFront must revalidate — does not hold once a
# release can change any path. The cost is one invalidation per deploy against a private app.
frontend-invalidate: ## Invalidate the CloudFront distribution
	aws cloudfront create-invalidation --paths '/*' --distribution-id $$($(TF) output -raw cloudfront_distribution_id)

frontend-deploy: ## Build, sync and invalidate the web client
	$(MAKE) frontend-build
	$(MAKE) frontend-sync
	$(MAKE) frontend-invalidate

frontend-serve: ## Run the Vite dev server (port 5173)
	yarn --cwd packages/web-client-v3 dev

frontend-preview: ## Build and serve locally against fixtures, no AWS required
	VITE_MOCK=1 yarn --cwd packages/web-client-v3 build
	VITE_MOCK=1 yarn --cwd packages/web-client-v3 preview


resync-index: ## Trigger a full search-index resync (was resync-index)
	aws lambda invoke --function-name alexandria-index-items --payload '{"action":"fullResync"}' --cli-binary-format raw-in-base64-out /dev/stdout
