# Dockerfile Build Reference (Dokploy)

> **Recommended for production.** Full control over build process, multi-stage support, exact base image selection.

## Dokploy Configuration

In Dokploy → Application → General tab:

| Field                   | Description                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Build Type**          | Select "Dockerfile"                                                               |
| **Dockerfile Path**     | Relative path (default: `./Dockerfile`). Use for monorepos: `apps/api/Dockerfile` |
| **Docker Context Path** | Build context root. Default: `.` (repository root)                                |
| **Docker Build Stage**  | Target a specific stage in multi-stage build                                      |

### Build Args

Set build-time variables in the **Environment** tab. They're passed as `--build-arg` to `docker build`.

## Multi-Stage Build Template

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

To target a specific stage, set **Docker Build Stage** to `production` in Dokploy.

## Laravel Production Dockerfile

```dockerfile
# ---- Dependencies ----
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --ignore-platform-reqs

# ---- Frontend Assets ----
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ---- Production Image ----
FROM php:8.3-fpm-alpine AS production
WORKDIR /app

# Install PHP extensions
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    icu-dev \
    && docker-php-ext-install \
    pdo_pgsql \
    zip \
    intl \
    opcache \
    pcntl

# Copy application
COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build

# Optimizations
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && php artisan event:cache

# Permissions
RUN chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
```

## React/Vite SPA Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Health Check in Dockerfile

Required for zero-downtime deployments:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## Domain Configuration

After deploying a Dockerfile-based application:

1. Go to **Domains** tab
2. Set **Container Port** to the port your app `EXPOSE`s (e.g., `3000`, `8000`, `80`)
3. Container Port does NOT get exposed publicly — Traefik routes to it internally

## CI/CD Pipeline (Recommended for Production)

Build images externally and deploy pre-built images to avoid server resource exhaustion.

### GitHub Actions → Docker Hub → Dokploy

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/myapp:latest
          platforms: linux/amd64
          target: production    # multi-stage target
```

Then in Dokploy:
1. Source Type → **Docker**
2. Image → `username/myapp:latest`
3. Add registry credentials if private
4. Deploy

### Auto-Deploy via Webhook

1. **Deployments** tab → copy Webhook URL
2. Add as webhook in DockerHub/GitHub/GitLab → triggers on image push
3. Matches branch/tag pattern → auto-deploys

## Docker Compose vs Dockerfile

| Use Case                                        | Choose                          |
| ----------------------------------------------- | ------------------------------- |
| Single service app                              | Dockerfile (Application)        |
| Multi-service stack (app + db + redis + worker) | Docker Compose                  |
| Need `build` directives                         | Docker Compose (not Stack)      |
| Swarm orchestration, replicas                   | Stack (Docker Compose in Swarm) |

## Best Practices

1. **Use multi-stage builds** — smaller images, faster deploys
2. **Pin base image versions** — `node:20.11-alpine`, not `node:latest`
3. **Copy dependency manifests first** — leverages Docker layer cache:
   ```dockerfile
   COPY package.json pnpm-lock.yaml ./
   RUN pnpm install
   COPY . .          # Source changes don't bust install cache
   ```
4. **Use `.dockerignore`** — exclude `node_modules`, `.git`, `vendor`, test files
5. **Don't run as root** — add `USER node` or `USER www-data`
6. **Build in CI, deploy images** — avoid on-server builds for production
7. **Include HEALTHCHECK** — enables zero-downtime deployments in Swarm mode
8. **Set `EXPOSE`** — documents the port; Dokploy needs to know for domain routing

## Common Issues

| Problem                   | Fix                                                     |
| ------------------------- | ------------------------------------------------------- |
| Build context too large   | Add `.dockerignore`                                     |
| Server OOM during build   | Build in CI/CD pipeline, deploy pre-built image         |
| Domain returns 502        | Container Port in Domains doesn't match `EXPOSE`        |
| Cache not working         | Ensure COPY order: manifests → install → source         |
| Multi-stage build failing | Set correct `target` or accept full Dockerfile is built |
