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
	docker compose exec -T -u 10001 rynctl-monitor sh -lc 'rm -rf /tmp/rynctl-scheduler-src /tmp/rynctl-scheduler-dst && mkdir -p /tmp/rynctl-scheduler-src /tmp/rynctl-scheduler-dst && printf scheduler-proof > /tmp/rynctl-scheduler-src/proof.txt'
	docker compose --profile tools build e2e-tests
	docker compose --profile tools run --rm e2e-tests
	docker compose exec -T rynctl-monitor sh -lc 'test "$$(cat /tmp/rynctl-scheduler-dst/proof.txt)" = "scheduler-proof"'

verify: frontend-build backend-tests e2e-tests
