init-infra:
	cd ./infra/init; terraform apply -auto-approve; terraform output -json > ../.infra-output/init.json

deploy-api:
	cd ./api; yarn deploy
