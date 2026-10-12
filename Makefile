.PHONY: up down build frontend-build backend-tests e2e-tests verify

# Derived from tests/package.json so the Playwright image tag can never drift
# from the @playwright/test package. Dockerfile.test consumes it as a build arg.
PLAYWRIGHT_VERSION := $(shell sed -n 's/.*"@playwright\/test": *"\([^"]*\)".*/\1/p' tests/package.json)
export PLAYWRIGHT_VERSION

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
	docker compose up -d --wait rynctl-monitor
	docker compose --profile tools build e2e-tests
	docker compose exec -T -u 10001 rynctl-monitor sh -lc 'rm -rf /tmp/rynctl-scheduler-src /tmp/rynctl-scheduler-dst && mkdir -p /tmp/rynctl-scheduler-src /tmp/rynctl-scheduler-dst && printf scheduler-proof > /tmp/rynctl-scheduler-src/proof.txt'
	docker compose --profile tools run --rm --no-deps e2e-tests
	docker compose exec -T rynctl-monitor sh -lc 'test "$$(cat /tmp/rynctl-scheduler-dst/proof.txt)" = "scheduler-proof"'

verify: frontend-build backend-tests e2e-tests
