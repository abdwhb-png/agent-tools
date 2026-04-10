---
name: dokploy-operations
description: |
  Installation, domains, environment variables, volumes, CI/CD, zero-downtime deployment, remote servers, clustering, and security practices for Dokploy.
---

# Dokploy Operations

Use this file after the deployment mode is chosen and the remaining questions are operational.

## Installation Baseline

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Ports required: **80**, **443**, **3000**.

If the user needs installation, update, or uninstall commands, provide the exact commands from Dokploy docs rather than paraphrasing.

## Domain Rules

Two paths:

- **Custom domain**: preferred for real deployments
- **`traefik.me`**: acceptable for quick/testing setups

Key rule: **Applications update domains immediately; Docker Compose changes require redeploy.**

Always verify:

- DNS A record points to server IP
- container port is correct
- HTTPS certificate is attached when HTTPS is enabled

## Environment Variable Rules

Dokploy has three scopes:

- **Project**: shared across services
- **Environment**: environment-wide
- **Service**: local to the service

Reference syntax:

```text
${{project.KEY}}
${{environment.KEY}}
${{SERVICE_KEY}}
```

For Docker Compose, variables may be written to `.env` but are **not automatically injected**. If compose services need them, include `env_file: [.env]` or explicit `${VAR}` usage.

## Volume Rules

Use `../files/...` bind mounts for persistence across redeploys.

```yaml
volumes:
  - "../files/postgres:/var/lib/postgresql/data"
```

Avoid absolute host paths for routine Dokploy persistence because they may be cleaned during deploy flows.

Use named volumes when Docker-managed persistence or backup workflows are required.

## Deployment Strategy

Prefer this order:

1. **Build in CI/CD**
2. **Push image to registry**
3. **Deploy via Dokploy webhook or Docker image source**

Avoid on-server builds for production if build pressure can destabilize the host.

## Zero-Downtime Rules

If the user asks for safe deployments, require both:

- a real health endpoint
- a start-first / rollback-capable update strategy

Without a health check, zero-downtime claims are weak and rollback behavior is unreliable.

## Remote Servers and Cluster

Use **remote servers** when Dokploy should manage workloads outside the main UI host.

Use **cluster / Swarm** only when horizontal scaling is explicitly needed. Prefer vertical scaling first.

## Security Rules

After domain + HTTPS are working, recommend disabling direct UI exposure on raw IP:3000 where appropriate.

Treat these as hardening defaults:

- prefer HTTPS
- avoid direct public management ports when domain routing is ready
- keep registry/auth setup explicit for Swarm deployments

## Troubleshooting Checklist

| Problem                      | Check first                                  |
| ---------------------------- | -------------------------------------------- |
| Domain not reachable         | DNS, Traefik routing, correct container port |
| 502 / Bad Gateway            | App is listening, health check, deploy state |
| Env vars missing in compose  | `env_file` or `${VAR}` wiring                |
| Files disappear after deploy | volume path choice                           |
| Build locks the server       | move build to CI/CD                          |
| Swarm image pull fails       | registry auth propagation                    |
