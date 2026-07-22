# Stage 1: Build frontend with Vite + Preact
FROM node:20-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# Stage 2: Shared Python base
FROM python:3.12-slim AS python-base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends rsync openssh-client cron gosu && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY static/ static/
COPY run.py .

# Stage 3: Production image
FROM python-base AS production

# Copy built frontend assets from stage 1
COPY --from=frontend /static/dist static/dist

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin rynctl && \
    mkdir -p /data/logs /home/rynctl/.ssh && \
    chown -R rynctl:rynctl /data /home/rynctl

COPY docker/entrypoint.sh /usr/local/bin/rynctl-entrypoint
RUN chmod +x /usr/local/bin/rynctl-entrypoint

ENV HOME=/home/rynctl

ENV RYNCTL_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/api/health')" || exit 1

ENTRYPOINT ["rynctl-entrypoint"]
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8080"]
