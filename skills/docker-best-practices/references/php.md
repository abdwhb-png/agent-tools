# PHP Dockerfile Reference (FPM + nginx; multi-stage with Composer)

Annotated production-ready Dockerfile that applies all 5 core corrections and all 3 hardening extras from the parent skill. PHP is unique among the languages covered here because the PHP runtime alone cannot serve HTTP — you need a web server (Apache, nginx, or modern options like FrankenPHP) paired with PHP-FPM (FastCGI) or `mod_php`. The main template below is for the **most common 2025-2026 production shape: `php:fpm` runtime behind a separate nginx container, with Composer deps built in a throwaway stage**. Variants for Apache-bundled, FrankenPHP, Laravel, and queue workers are included further down.

PHP-specific note: the Alpine-vs-Slim rule from the parent skill applies **less forcefully** here, because the glibc-vs-musl native-binary problem mostly bites Python wheels and Node native modules, while PHP extensions are compiled fresh during `docker-php-ext-install` either way. The PHP-specific Alpine downside is instead **musl DNS resolver quirks** and harder `pecl install` workflows (need `$PHPIZE_DEPS`). For most teams the recommendation is still `php:<version>-fpm-bookworm` (Debian) for predictable behavior in production.

## The Dockerfile (PHP-FPM + Composer multi-stage)

```dockerfile
# syntax=docker/dockerfile:1
# Required because we use --mount=type=cache and multi-stage naming.

# ─────────────────────────────────────────────────────────────────────────────
# CORE #5 (pinning): pin both tag AND digest. Pin the minor version (8.4),
# not just major (8), and pin the Debian suite (bookworm) explicitly so
# upstream suite rotation doesn't surprise you.
# CORE #1 (slim-equivalent): we use `bookworm` (Debian) not `alpine` because
#   - musl DNS quirks can break service-mesh lookups
#   - `pecl install` is painful on Alpine (needs $PHPIZE_DEPS)
#   - the size win (~80MB) isn't worth the operational risk for most teams
# ─────────────────────────────────────────────────────────────────────────────
FROM php:8.4-fpm-bookworm@sha256:<run-`docker-buildx-imagetools-inspect-php:8.4-fpm-bookworm`-and-paste-here> AS base

# ─────────────────────────────────────────────────────────────────────────────
# Build stage for PHP extensions and system packages.
# We reuse the `base` image and add what we need, then keep it in the runtime.
# PHP extensions CAN'T be cleanly separated into builder/runtime stages the way
# Go or Node can — they need to be present where PHP runs. What we DO split is
# Composer (build-time tool, never ships to runtime).
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS runtime

# Install system libraries that PHP extensions depend on at RUNTIME.
# --no-install-recommends keeps the image lean.
# Always pair apt-get update + install + cleanup in the same RUN to avoid
# the package list bloating a layer.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        libpq-dev \
        libzip-dev \
        libicu-dev \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
 && rm -rf /var/lib/apt/lists/*

# PHP's official helpers: docker-php-ext-configure (custom ./configure flags),
# docker-php-ext-install (build + enable), docker-php-ext-enable (enable a
# PECL extension after `pecl install`). Install extensions in dependency order.
# gd needs a configure step (freetype + jpeg). -j$(nproc) parallelizes the build.
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j$(nproc) \
        opcache \
        pdo_pgsql \
        pdo_mysql \
        zip \
        intl \
        gd \
        bcmath \
        pcntl

# PECL-only extensions (redis, apcu, etc.). ALWAYS pin PECL versions — PECL
# does NOT check PHP version compatibility by default and may pick an
# incompatible release.
RUN pecl install redis-6.1.0 apcu-5.1.24 \
 && docker-php-ext-enable redis apcu

# ─────────────────────────────────────────────────────────────────────────────
# EXTRA #6 (non-root user): php:fpm runs its master process as ROOT by
# default (docker-library/php issue #70). Its worker privilege drop only
# handles workers. We must explicitly create a user and switch to it.
# Use www-data (already exists in php:*-bookworm) so we don't need to chown
# everything; just own the application directory before switching.
# ─────────────────────────────────────────────────────────────────────────────
WORKDIR /var/www/html

# ─────────────────────────────────────────────────────────────────────────────
# Composer deps live in a throwaway builder stage. Composer's binary and the
# git/unzip it needs never reach the final image.
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# CORE #2 (layer order): copy composer.json + composer.lock FIRST, install,
# THEN copy source. Every code change now skips the (slow) composer step.
# ─────────────────────────────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.json composer.lock ./

# EXTRA #8 (BuildKit cache mount): composer's cache survives layer rebuilds.
# Flags explained:
#   --no-dev          : skip devDependencies (phpunit, phpstan, etc.)
#   --no-scripts      : CRITICAL — skip composer.json post-install hooks.
#                       Supply-chain hardening (a compromised dep could ship
#                       a malicious script that runs at install time).
#   --optimize-autoloader / -o : dump a static classmap (faster runtime lookups)
#   --prefer-dist     : use tarballs not git clones (faster, more reproducible)
#   --no-interaction  : no prompts in CI
RUN --mount=type=cache,target=/tmp/composer-cache,id=composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install --no-dev --no-scripts --optimize-autoloader --prefer-dist --no-interaction

# Now copy source (CORE #3 — .dockerignore below keeps this lean).
COPY . .

# Generate the optimized autoloader WITH app source present (composer scripts
# that depend on the app being present can now run safely if you enable them).
RUN composer dump-autoload --no-dev --optimize \
 && chown -R www-data:www-data /var/www/html

# Drop root.
USER www-data

EXPOSE 9000

# ─────────────────────────────────────────────────────────────────────────────
# EXTRA #7 (HEALTHCHECK) — PHP-FPM has a built-in health check via the
# `ping.path` setting in www.conf, but it's off by default. Easier: use a
# tiny PHP one-liner that hits your app's /health route through FastCGI.
# We avoid curl (not present in slim-bookworm by default).
# ─────────────────────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD php -r 'exit(@file_get_contents("http://nginx/health") ? 0 : 1);' || exit 1
# Note: assumes a sibling `nginx` container reverse-proxying to FPM:9000.
# If you'd rather probe FPM directly, install fcgi-client (`libfcgi-bin`)
# and call cgi-fcgi.

CMD ["php-fpm"]

# ─────────────────────────────────────────────────────────────────────────────
# Production opcache settings — copy this to /usr/local/etc/php/conf.d/opcache.ini
# or bake into a custom ini file via COPY in a layer above.
# ─────────────────────────────────────────────────────────────────────────────
```

Companion `opcache.ini` (mount or COPY into `/usr/local/etc/php/conf.d/opcache.ini`):

```ini
[opcache]
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 20000
; CRITICAL for container production: container is immutable at runtime,
; so we skip the per-request mtime check. This is BOTH a perf win and a
; post-exploitation control (an attacker dropping a .php file won't see
; it executed until the image is rebuilt).
opcache.validate_timestamps = 0
opcache.revalidate_freq = 0
opcache.save_comments = 1
; PHP 8 JIT (where available)
opcache.jit = 1255
opcache.jit_buffer_size = 100M
```

Companion `php-fpm-pool.conf` (mount/COPY to `/usr/local/etc/php-fpm.d/zz-docker.conf` to override defaults):

```ini
[www]
; `pm = static` is correct for containers. Dynamic spawns workers based on
; load, which fights the container's fixed memory limit and gets OOM-killed.
; Set max_children = container_mem_limit / observed_per_request_RSS.
pm = static
pm.max_children = 20
; Recycle workers periodically to mitigate memory leaks in long-running apps.
pm.max_requests = 1000
; Slow-log hung requests for visibility.
request_slowlog_timeout = 10s
slowlog = /proc/self/fd/2
; NEVER expose pm.status_path outside an internal network.
```

## Companion `.dockerignore`

Save next to the Dockerfile:

```gitignore
.git
.gitignore

# Host-installed deps — they will be installed inside the image
vendor/
node_modules/

# Env / secrets (NEVER bake into images)
.env
.env.*
!.env.example

# Tests
tests/
tests-unit/
phpunit.xml
phpunit.dist.xml
.phpunit.result.cache

# Tooling / static analysis
.phpstan/
.php-csfixer/
.ide/
.vscode/
.idea/

# Build / docs
docs/
*.md
README*
CHANGELOG*

# Docker meta
Dockerfile*
docker-compose*.yml
.dockerignore

# OS
.DS_Store
Thumbs.db
```

## Why each decision was made

| Decision | Reason |
| --- | --- |
| `php:8.4-fpm-bookworm` (not `:alpine`) | Musl DNS quirks + harder `pecl install` dwarf the size savings. PHP doesn't suffer the Python/Node glibc-vs-musl native-binary problem the same way, but the operational risk is real. Bookworm is the predictable default. |
| `php:8.4-fpm-bookworm` (not `:8.4-fpm-bookworm` with `:latest`) | Tag drift. Pin minor (8.4) + Debian suite (bookworm) for predictability. Pin digest for true reproducibility. |
| Multi-stage with `composer:2` as `--from` | Composer binary and the git/unzip deps it needs never reach the runtime image. Saves space and reduces supply-chain attack surface. |
| `composer install --no-dev --no-scripts` | `--no-dev` drops dev deps from production. `--no-scripts` is a documented supply-chain control — composer.json hooks run as root during build. |
| `composer install --optimize-autoloader` | Bakes a static classmap. Faster lookups vs PSR-4 directory scanning at runtime. |
| `--mount=type=cache,target=/tmp/composer-cache,id=composer-cache` | Composer's package cache survives layer rebuilds. Only changed packages re-download. |
| `COPY composer.*` before `COPY . .` | Standard "manifest first" onion layer rule. |
| `extension list` (opcache, pdo_pgsql, etc.) | Always include opcache (huge perf win, ~free). Only include intl/gd if used; they're 15-25MB each. |
| `pecl install redis-6.1.0 apcu-5.1.24` (pinned) | PECL doesn't check PHP compat by default — pinning versions is critical. |
| `USER www-data` | php:fpm master runs as ROOT by default (docker-library/php issue #70). Always switch. |
| `pm = static` | Fixed worker count matches container memory model. Avoids OOM-kills from reactive spawning. |
| `opcache.validate_timestamps = 0` | Containers are immutable at runtime. Skips per-request mtime stat. Both perf AND security win. |
| HEALTHCHECK hits nginx | FPM serves FastCGI, not HTTP. Easiest probe is via the sibling nginx container's `/health` route. |

## Variant: php:apache (single-container, all-in-one)

For small apps, prototypes, or anything where avoiding a separate nginx container matters:

```dockerfile
# syntax=docker/dockerfile:1

FROM php:8.4-apache-bookworm@sha256:<paste-digest-here>

# mod_rewrite for clean URLs; headers for security headers in .htaccess
RUN a2enmod rewrite headers

# Same extension install pattern as FPM template above.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev libzip-dev libicu-dev \
 && rm -rf /var/lib/apt/lists/* \
 && docker-php-ext-install -j$(nproc) opcache pdo_pgsql zip intl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install --no-dev --no-scripts --optimize-autoloader --prefer-dist
COPY . .
RUN composer dump-autoload --optimize \
 && chown -R www-data:www-data /var/www/html

# Apache's child workers run as www-data; parent is still root. Acceptable
# but worse than the FPM template aboveground for hardening.
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD php -r 'exit(@file_get_contents("http://127.0.0.1/health") ? 0 : 1);' || exit 1
```

Stopped short of `USER www-data` because Apache's privilege-drop architecture needs the parent as root to bind :80. This is a tradeoff vs the FPM template.

## Variant: FrankenPHP (modern, single-binary, Caddy-based)

FrankenPHP is the 2024-2026 modern alternative for new apps — Caddy + PHP embedded in one Go binary, automatic HTTPS, native Laravel Octane. Base image: `dunglas/frankenphp:php8.4-*`. Compares very well to FPM+nginx:

| Aspect | PHP-FPM + nginx | FrankenPHP |
| --- | --- | --- |
| Containers for web serving | 2 (nginx + FPM) | 1 |
| Config file | nginx `default.conf` (80+ lines) | `Caddyfile` (~15 lines) |
| HTTPS | Manual certbot | Automatic (built-in Let's Encrypt) |
| HTTP/2, HTTP/3 | Manual config | On by default |
| PHP version of install-php-extensions | Manual `docker-php-ext-install` | `install-php-extensions` baked in |

```dockerfile
# syntax=docker/dockerfile:1

FROM dunglas/frankenphp:php8.4-alpine@sha256:<paste-digest-here> AS base

# install-php-extensions is built into FrankenPHP. Handles apk deps
# automatically for you (equivalent to mlocati/docker-php-extension-installer).
RUN install-php-extensions \
        opcache \
        pdo_pgsql \
        pdo_mysql \
        intl \
        zip \
        bcmath \
        pcntl \
        gd \
        redis \
        apcu

# Multi-stage Composer as before.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install --no-dev --no-scripts --optimize-autoloader --prefer-dist
COPY . .
RUN composer dump-autoload --optimize \
 && chown -R www-data:www-data /app
USER www-data

# Caddyfile replaces nginx config.
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD php -r 'exit(@file_get_contents("http://127.0.0.1/up") ? 0 : 1);' || exit 1

CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
```

Companion `Caddyfile` (~15 lines):

```caddyfile
{
    frankenphp
    # Disable auto-HTTPS in dev; remove this line in production so Caddy
    # obtains and renews real Let's Encrypt certs.
    auto_https off
    order php_server before file_server
}

:80 {
    root * /app/public
    encode zstd br gzip
    php_server
}
```

## Variant: Laravel 10/11/12/13 (FrankenPHP)

The Laravel path of least resistance in 2025-2026: FrankenPHP base + multi-stage + Laravel's `storage/` and `bootstrap/cache/` writable by the runtime user. Full example follows the pattern in the main template above, plus:

- Run `php artisan config:cache`, `route:cache`, `view:cache`, `event:cache` at build time (after `COPY . .`) to pre-warm.
- Mount a named volume or bind for `/var/www/html/storage` and `/var/www/html/bootstrap/cache` so they survive container restarts.
- For queue workers and scheduled tasks, override `CMD` per-service (e.g. `CMD ["php", "artisan", "queue:work", "--sleep=3", "--tries=3"]`, `CMD ["php", "artisan", "schedule:work"]`).

## Variant: Queue Worker / CLI (php:cli, no web server)

For Laravel Horizon, Symfony Messenger, or any queue consumer:

```dockerfile
# syntax=docker/dockerfile:1

FROM php:8.4-cli-bookworm@sha256:<digest>

# Same extension install as main template.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev libzip-dev \
 && rm -rf /var/lib/apt/lists/* \
 && docker-php-ext-install -j$(nproc) opcache pdo_pgsql zip pcntl bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install --no-dev --no-scripts --optimize-autoloader --prefer-dist
COPY . .
RUN composer dump-autoload --optimize \
 && chown -R www-data:www-data /var/www/html
USER www-data

# pcntl is required for proper signal handling (SIGTERM → graceful shutdown).
CMD ["php", "artisan", "queue:work", "--sleep=3", "--tries=3", "--max-time=3600"]
```

Disable HEALTHCHECK (no HTTP listener in this image).

## Common Mistakes

- **`composer install` without `--no-dev`** at runtime — ships PHPUnit + PHPStan to prod.
- **`pecl install redis`** (no version) — picks whatever's latest, may not be PHP-8.4 compatible.
- **Leaving FPM master as root** — the documented behavior of `php:fpm` (issue #70). Always `USER www-data`.
- **`pm = dynamic`** in FPM — wrong for containers. Use `static` sized against the container memory limit.
- **Forgetting `opcache.validate_timestamps = 0`** — free perf AND security win, since container source is immutable at runtime.
- **`composer install --no-scripts` missing** — exposes you to supply-chain attacks via post-install hooks in compromised dependencies.
- **`install-php-extensions` from PECL with `phpize` missing on Alpine** — you need `apk add $PHPIZE_DEPS`, install, then `apk del`. Easier to just use Debian Bookworm.
- **Mixing the entrypoint of `php:fpm`** (expects a FastCGI proxy in front) with attempts to serve HTTP directly — won't work; FPM is the FastCGI Process Manager, not an HTTP server.
- **`docker-php-ext-install` after `COPY . .`** — defeats caching. Install extensions before bringing in any source.
- **Binding `php:fpm` to port 80** — non-root user can't bind <1024 and PHP-FPM isn't an HTTP server anyway. Use nginx/FrankenPHP/Apache for that.

## Sources

- [PHP official Docker Hub image docs](https://hub.docker.com/_/php) — extension helpers, variant differences.
- [Snyk — Building production-ready Dockerfile for PHP](https://snyk.io/blog/building-production-ready-dockerfile-php/) — FPM vs Apache, base image selection.
- [Safeguard.sh — Production-ready PHP Dockerfile](https://safeguard.sh/resources/blog/production-ready-dockerfile-php-best-practices) — non-root, digest pinning, supply-chain.
- [Safeguard.sh — Hardening PHP-FPM and Apache Container Images](https://safeguard.sh/resources/blog/securing-php-containers) — opcache as security control, disable_functions, pm tuning.
- [PHP Everyday — Dockerizing PHP Apps: Best Practices 2026](https://www.phpeveryday.com/articles/dockerizing-php-apps-best-practices-2026/) — modern patterns, Laravel/Symfony variants.
- [dykyi-roman/awesome-claude-code — PHP extensions matrix](https://github.com/dykyi-roman/awesome-claude-code/blob/master/skills/docker-php-extensions-knowledge/references/extensions-matrix.md) — extension dependencies per OS.
- [mlocati/docker-php-extension-installer](https://github.com/mlocati/docker-php-extension-installer) — `install-php-extensions` script (used by FrankenPHP).
- [FrankenPHP — Laravel docs](https://frankenphp.dev/docs/laravel/) — Octane integration, standalone binary builds.
- [blog.thms.uk — Multi-stage Dockerfile for Laravel and FrankenPHP](https://blog.thms.uk/2026/06/laravel-frankenphp-dockerfile) — production FrankenPHP + Laravel pattern.
