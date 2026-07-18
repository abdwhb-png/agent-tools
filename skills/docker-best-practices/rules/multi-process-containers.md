---
name: docker-multi-process-containers
description: |
  Run two processes legitimately inside one container using supervisord. Covers when this is
  pragmatic (e.g. NGINX in front of an app server below Kubernetes scale) and how to wire it up.
---

# Multi-Process Containers with supervisord

Covers the **supervisord bonus** from the source video. Read this when the user needs two processes in one image (most commonly NGINX in front of an app server) and isn't yet at Kubernetes scale where splitting into separate containers/pods is cheap.

## The Pragmatic Exception

> "One process per container is a vibe, not a law." — author of the source video

The one-process-per-container rule exists because:

- Separation of concerns (the orchestrator restarts only what's broken).
- Independent scaling.
- Cleaner logs.

But it costs complexity. If you're not running Kubernetes (or even Compose), running NGINX in front of your Django/Express/FastAPI app often means spinning up Compose, networking two containers, wiring them together, and now your simple deployment has baggage.

When the alternative is "two containers and a Compose file just to serve one Python app from one box", one container with **supervisord** managing two processes is genuinely simpler.

## When This Is The Right Call

- Single host, plain `docker run`.
- Demo / staging / small internal tool.
- The proxy and the app are operationally a single unit anyway.

## When To Still Prefer Separate Containers

- Running on Docker Compose, Swarm, or Kubernetes.
- The proxy and the app have different lifecycles, scaling needs, or release cadences.
- Anything reasonably described as "production infrastructure".

## What supervisord Does

`supervisord` is a process control system. It:

- Starts specified programs on container start.
- Restarts them if they crash (`autorestart=true`).
- Forwards stdout/stderr to logs you can inspect.
- Responds to signals, so the container lifecycle (stop/restart) reaches the children correctly.

Use it as PID 1 (or effectively, by being the `CMD`).

## Minimal Wiring

### `supervisord.conf`

```ini
[supervisord]
nodaemon=true                ; run in foreground (so exec as PID 1)
logfile=/dev/null            ; don't fight Docker for logs
logfile_maxbytes=0
pidfile=/var/run/supervisord.pid

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/fd/1
stdout_logfile_maxbytes=0
stderr_logfile=/dev/fd/2
stderr_logfile_maxbytes=0

[program:app]
command=gunicorn main:app -b 127.0.0.1:8000
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/fd/1
stdout_logfile_maxbytes=0
stderr_logfile=/dev/fd/2
stderr_logfile_maxbytes=0
```

Notes:

- `nodaemon=true` makes supervisord itself stay in the foreground. Without this, it daemonizes and the container exits immediately.
- Pointing each program's `stdout`/`stderr` to `/dev/fd/1` and `/dev/fd/2` makes logs go through Docker's normal logging — `docker logs` works as expected.
- `autostart=true` + `autorestart=true` is the whole point: automatic restart on crash.

### Dockerfile shape

```dockerfile
FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx supervisor \
 && rm -rf /var/lib/apt/lists/*

# Install Python deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Drop in our NGINX config (proxy from :80 to the app on :8000)
COPY nginx.conf /etc/nginx/sites-available/app
RUN ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app

# Drop in the supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/app.conf

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
```

Notes:

- Use `supervisord`'s default config include path (`/etc/supervisor/conf.d/*.conf` on Debian) instead of overriding its main config — quieter Dockerfile.
- Still apply all the usual rules: install deps before copying source, `.dockerignore`, multi-stage if applicable (it almost never is here, since you need nginx+supervisor at runtime), non-root user where possible.

## Signal Handling Caveat

For Docker's `stop` (SIGTERM) to reach the app cleanly, supervisord needs to forward it. Modern supervisord does this by default, but verify in your version. If `docker stop` takes 10s and then SIGKILLs, your signal forwarding is broken and you're likely to lose in-flight requests.

## Common Mistakes

- **Using a shell `&` hack** (`nginx & python ...`) instead of a real process manager. SIGTERM doesn't reach either process; if one dies the container doesn't notice.
- **Forgetting `daemon off;` for nginx.** Container exits immediately.
- **Forgetting `nodaemon=true` for supervisord.** Container exits immediately.
- **Using this when you're actually on Kubernetes.** Use Deployment + separate Service objects; let K8s do its job.
- **Baking log files into the image.** Route everything to stdout/stderr, never to `/var/log/*.log` files inside the container.
