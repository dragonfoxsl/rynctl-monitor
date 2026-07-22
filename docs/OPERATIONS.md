# Production Operations

This guide covers the operational checks that should exist before exposing
Rynctl Monitor beyond a local development machine.

## Deployment Baseline

- Run a single application instance. The scheduler and job runner are
  in-process, so multiple Uvicorn workers or multiple app replicas can duplicate
  scheduled executions.
- Serve the app behind HTTPS. Set `RYNCTL_SECURE_COOKIES=true` when TLS is
  terminated before the browser.
- Keep the app behind private access where possible: VPN, Tailscale, Cloudflare
  Access, or a similar identity-aware proxy.
- Set a strong `RYNCTL_SECRET` before first production start:

  ```bash
  openssl rand -hex 32
  ```

- Set `RYNCTL_ADMIN_PASSWORD` before first startup, or change the default admin
  password immediately after the first login.

## Container Hardening

The production container drops to the unprivileged `rynctl` user before starting
Uvicorn. The entrypoint runs as root only long enough to create and repair
ownership for `/data` and `/home/rynctl`.

The default compose files also:

- mount `/data` as the only persistent writable volume,
- use a tmpfs for `/tmp`,
- make the root filesystem read-only,
- drop Linux capabilities,
- enable `no-new-privileges`.

Host sync paths must be mounted explicitly and their permissions must allow UID
`10001` to read source paths and write destination paths. SSH keys should be
mounted under `/home/rynctl/.ssh`.

## Backup And Restore Drill

Export a database snapshot:

```bash
curl -fS -b cookies.txt http://localhost:8080/api/backup/download -o rynctl.db
```

Restore through the API from a known-good backup:

```bash
curl -fS -b cookies.txt \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -F "file=@rynctl.db" \
  http://localhost:8080/api/backup/restore
```

After restore:

```bash
curl -fS http://localhost:8080/api/health
docker compose logs --tail 100 rynctl-monitor
```

For a container-level emergency restore, stop the container, replace
`/data/rynctl.db` from a verified backup, then start the container and check
`/api/health`.

## Observability

Health check:

```bash
curl -fS http://localhost:8080/api/health
```

Prometheus scrape example:

```yaml
scrape_configs:
  - job_name: rynctl-monitor
    metrics_path: /api/metrics
    static_configs:
      - targets: ["rynctl-monitor.example.com"]
```

Docker logging example:

```yaml
services:
  rynctl-monitor:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

Alert on:

- container unhealthy or restarting,
- `/api/health` not returning `healthy`,
- low disk space on the `/data` volume,
- repeated failed job runs,
- backup export or restore failures.

## Release And Rollback

The `docker-publish.yml` workflow runs backend tests, frontend audit/build,
e2e package audit, and the Dockerized browser suite before publishing a tag to
GHCR.

Release:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Rollback:

```bash
docker compose pull
docker compose up -d
```

Pin the image tag in production instead of using `latest` when rollback speed
matters.
