.PHONY: up down build frontend-build backend-tests e2e-tests verify

up:
	docker compose up -d rynctl-monitor

down:
	docker compose down

build:
	docker compose build rynctl-monitor

frontend-build:
	docker compose --profile tools run --rm frontend-build

backend-tests:
	docker compose --profile tools run --rm backend-tests

e2e-tests:
	docker compose up -d rynctl-monitor
	docker compose --profile tools run --rm e2e-tests

verify: frontend-build backend-tests e2e-tests
