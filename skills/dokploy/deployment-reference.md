# Deployment & Operations Reference (Dokploy)

> Installation, CI/CD pipelines, zero-downtime, remote servers, clusters, security.

## Installation

```bash
# Standard install
curl -sSL https://dokploy.com/install.sh | sh

# Specific version
export DOKPLOY_VERSION=v0.26.6 && curl -sSL https://dokploy.com/install.sh | sh

# Update existing
curl -sSL https://dokploy.com/install.sh | sh -s update

# Custom swarm network (avoid CIDR conflicts with cloud VPCs)
export DOCKER_SWARM_INIT_ARGS="--default-addr-pool 172.20.0.0/16 --default-addr-pool-mask-length 24"
curl -sSL https://dokploy.com/install.sh | sh

# Uninstall (removes Docker, data, everything)
curl -sSL https://dokploy.com/uninstall.sh | sh
```

**Requirements:** 2GB RAM min, 30GB disk. Ubuntu 18-24, Debian 10-12, Fedora 40, CentOS 8-9.

Access UI at `http://<server-ip>:3000` after install.

## Environment Variables

Three scopes with cross-reference syntax:

```
# Project-level (shared across all services)
DATABASE_URL=postgresql://postgres:postgres@database:5432/postgres

# Reference project var in any service
DATABASE_URL=${{project.DATABASE_URL}}

# Reference environment var
API_KEY=${{environment.API_KEY}}

# Self-reference within same service
DATABASE_URL=postgresql://${{DATABASE_USER}}:${{DATABASE_PASSWORD}}@db:5432/postgres
```

For Docker Compose, env vars are saved to `.env` but NOT auto-injected. Use `env_file: [.env]` or `${VAR_NAME}` syntax in compose file.

## Docker Compose Volumes

### Bind Mounts (persist across deployments)

```yaml
volumes:
  - "../files/my-database:/var/lib/mysql"    # ✅ Persists
  - "/absolute/path:/data"                    # ❌ Cleaned on deploy
```

### Named Volumes (Docker-managed, supports Volume Backups)

```yaml
services:
  app:
    volumes:
      - my-data:/app/data
volumes:
  my-data:
```

Use `../files/` for simple persistence; named volumes for automated S3 backups.

## CI/CD Production Deployment

Build in CI/CD, deploy pre-built images to avoid server resource exhaustion.

### GitHub Actions

```yaml
name: Build and Deploy
on:
  push:
    branches: ["main"]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: namespace/repo:latest
          platforms: linux/amd64
```

In Dokploy: Source Type → **Docker**, image → `namespace/repo:latest`, Deploy.

### Auto-Deploy via Webhook

1. Deployments tab → copy Webhook URL
2. Add webhook in DockerHub/GitHub/GitLab/Bitbucket repository settings
3. Pushes matching branch/tag trigger automatic deployment

### Auto-Deploy via API

```bash
# Get application ID
curl -X GET 'https://your-domain/api/project.all' \
  -H 'x-api-key: <token>'

# Trigger deployment
curl -X POST 'https://your-domain/api/application.deploy' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: <token>' \
  -d '{"applicationId": "your-app-id"}'
```

## Zero-Downtime Deployments

Requires health check endpoint. In Advanced → Swarm Settings:

**Health Check:**

```json
{
  "Test": ["CMD", "curl", "-f", "http://localhost:3000/health"],
  "Interval": 30000000000,
  "Timeout": 10000000000,
  "StartPeriod": 30000000000,
  "Retries": 3
}
```

**Update Config (auto-rollback on failure):**

```json
{
  "Parallelism": 1,
  "Delay": 10000000000,
  "FailureAction": "rollback",
  "Order": "start-first"
}
```

## Remote Servers

Deploy apps on separate servers while managing from Dokploy UI.

**Server types:**

- **Deployment servers** — run containers, handle traffic via Traefik
- **Build servers** — compile/build images, push to registry (Applications only)

**Setup flow:**

1. Create SSH key in Dokploy (`/dashboard/settings/ssh-keys`)
2. Add public key to remote server
3. Add server in Dokploy (IP, username, SSH key)
4. Click Setup Server → Deployments tab → Setup

Dokploy UI only needs ~250MB RAM when using remote servers exclusively.

## Cluster (Horizontal Scaling)

Uses Docker Swarm. Requirements:

1. Dokploy server (manager node)
2. Additional server(s) with same architecture
3. Docker registry configured

Add nodes via Cluster UI → Add Node → follow join instructions.

Vertical scaling (more CPU/RAM) is simpler and recommended first.

## Security Hardening

After configuring domain with HTTPS:

```bash
# Disable direct IP:port access to Dokploy UI
docker service update --publish-rm "published=3000,target=3000,mode=host" dokploy
```

**Reset password:**

```bash
docker exec -it <container-id> bash -c "pnpm run reset-password"
```

**Reset 2FA:**

```bash
docker exec -it <container-id> bash -c "pnpm run reset-2fa"
```

## Domains — Full Configuration

Two options:

1. **Free domains** via `traefik.me` (HTTP only; HTTPS requires certificate setup)
2. **Custom domains** — point DNS A record to server IP

Key fields:

| Field          | Description                                               |
| -------------- | --------------------------------------------------------- |
| Host           | Domain name (e.g., `api.example.com`)                     |
| Path           | Public path prefix                                        |
| Container Port | Internal port Traefik routes to (NOT exposed to internet) |
| HTTPS          | Toggle + select certificate (letsencrypt or custom)       |
| Strip Path     | Removes path prefix before forwarding                     |
| Internal Path  | Adds prefix before forwarding to container                |

**Applications**: domain changes apply immediately (Traefik hot reload).
**Docker Compose**: domain changes require redeployment (Docker labels).
