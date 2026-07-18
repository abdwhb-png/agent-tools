---
name: docker-hardening-extras
description: |
  Industry-standard hardening beyond the 5 core Dockerfile corrections: run as a non-root user,
  declare HEALTHCHECK, and use BuildKit --mount=type=cache for faster, leaner installs.
---

# Hardening Extras

Covers extras **#6, #7, #8 from the parent skill**. These are not in the source video's "5 corrections" but are universally agreed best practices that the skill would be incomplete without.

## EXTRA 6: Non-root User

By default, containers run as **root inside the namespace**. If an attacker escapes the container (CVE in your runtime, a kernel bug, etc.), they're running as root on the host side of the namespace. That's the worst-case blast radius.

Run as a dedicated non-root user instead.

### Pattern (interpreted languages — Python, Node, Ruby)

```dockerfile
FROM python:3.12-slim

# Create unprivileged user and group with explicit UID/GID (no PII lookup needed)
RUN groupadd --system --gid 1001 app \
 && useradd  --system --uid 1001 --gid app --home-dir /app --shell /usr/sbin/nologin app

WORKDIR /app

# Install deps, copy source as usual
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Make sure the app user owns what it needs to write to
RUN chown -R app:app /app

# Switch — everything after this runs as `app`
USER app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Shortcut: distroless already has a non-root user

If you use `gcr.io/distroless/static-debian12:nonroot` or `gcr.io/distroless/base-debian12:nonroot`, the `nonroot` user (UID 65532) is already created. Just add `USER nonroot:nonroot` (or rely on the image's default). That's why distroless non-root variants are a one-line win for compiled binaries.

### Node: image already has a user

`node:22-slim` ships with a `node` user (UID 1000). Reuse it:

```dockerfile
USER node
```

Avoid recreating a user if the base already provides one.

### Sticky details

- **UID/GID choice**: numeric UIDs are safer than names because some images don't have an `/etc/passwd` (distroless). Pick something unlikely to collide; 1001+ for app users is a common heuristic.
- **Order of `USER`**: switch as late as possible — `COPY` files, `RUN chown`, only then `USER app`. Once switched, subsequent `COPY`/`RUN` may lack permission to write to `/app`.
- **Files outside `/app`**: anything the app writes to (logs, a sqlite db, a cache dir) must be `chown`-ed to the app user before `USER` switches.
- **Privileged port binding**: the app user (non-root) can't bind to ports < 1024. Use port 8000/8080/etc., or set `net.ipv4.ip_unprivileged_port_start=80` if you insist on :80 — better, accept :8080 and surface :80 via the orchestrator/proxy.

### When the user must be root

- The image installs packages at runtime (shouldn't, but legacy requires it).
- A process needs raw socket access.

Treat each as a smell. In each case, try to encode the privileged action at build time (install the package, fix the perms) and run unprivileged.

## EXTRA 7: HEALTHCHECK

A `HEALTHCHECK` tells Docker (and orchestrators that consume it) whether the container is genuinely serving. A running PID is not the same as a serving app — it can deadlock, hang on a stuck DB connection, or sit in an infinite retry loop.

### Where it matters and where it doesn't

| Deploy target | Use HEALTHCHECK? |
| --- | --- |
| Plain `docker run` (single container) | **Yes** — Docker will report unhealthy, you can hook it to restart-policy. |
| `docker-compose.yml` | **Yes** — Compose surfaces state in `docker compose ps`. |
| Kubernetes | **Prefer a manifest-level `livenessProbe`/`readinessProbe`** instead. The Docker-level `HEALTHCHECK` is ignored by kubelet. |

### Basic shape

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1
```

Flags (all optional):

| Flag | Default | Notes |
| --- | --- | --- |
| `--interval` | 30s | How often to probe |
| `--timeout` | 30s | How long the probe may take |
| `--start-period` | 0s | Grace period during startup (avoid spurious failure on slow-booting apps) |
| `--retries` | 3 | Consecutive failures before marked unhealthy |

### Healthcheck client tooling

`curl` is not in slim/distroless images by default. Options:

- In slim images, `apt-get install -y --no-install-recommends curl` in the Dockerfile and use it for HEALTHCHECK.
- Better: write a tiny health-check script in the app's own language (a `python -c "import urllib.request; ..."` or `node -e "fetch(...).then(...)"`), so no extra binary is needed.
- Distroless images have no shell and no curl — you have to use the language-style approach or use an external healthcheck (the orchestrator probes the endpoint itself).

### App-side contract

- The `/health` endpoint should be **lightweight** (DB ping + process responsiveness). Don't include checks for transient downstream APIs — those belong in a separate `/ready` endpoint.
- Return 200 if healthy, 5xx otherwise. Body is optional.

## EXTRA 8: BuildKit Cache Mounts

Docker layer cache invalidates the entire layer when any input changes. If `requirements.txt` changes, the whole `pip install` re-runs from scratch — even though most packages didn't change.

BuildKit cache mounts solve this by giving the install command a **persistent cache directory** that survives layer invalidation:

```dockerfile
# syntax=docker/dockerfile:1   <-- REQUIRED at the top of the file

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

The first line (`# syntax=docker/dockerfile:1`) enables BuildKit's extended Dockerfile features. Without it, `--mount=type=cache` is a syntax error.

### Common cache mount targets

| Package manager | Cache target |
| --- | --- |
| pip | `/root/.cache/pip` (Linux), or per-user `~/.cache/pip` if not running as root |
| npm | `/root/.npm` |
| yarn | `/usr/local/share/.cache/yarn` |
| pnpm | `/pnpm/store` (set `PNPM_HOME`) |
| apt | `/var/cache/apt`, `/var/lib/apt` |
| Go modules | `/go/pkg/mod`, `/root/.cache/go-build` |
| Cargo | `/usr/local/cargo/registry`, `/usr/local/cargo/git` |
| Maven | `/root/.m2` |

### Why this beats layer caching for heavy installs

- Layer cache is per instruction; one changed dep = full re-install.
- Cache mount is per package; only the changed dep is fetched.

Saves real time in CI and local dev where manifests change often. Pairs well with the manifest-first layer-order rule in [caching-and-ordering.md](caching-and-ordering.md).

### Sharing the cache between builds

By default each `RUN --mount=type=cache` gets its own cache scope, scoped to that Dockerfile line. If you run multiple builds on the same machine (CI), the cache persists between them — perfect.

To share across different Dockerfiles or to control scope explicitly:

```dockerfile
RUN --mount=type=cache,id=pip,target=/root/.cache/pip \
    pip install -r requirements.txt
```

The `id` lets multiple Dockerfiles share the same physical cache directory.

### Other useful BuildKit mounts

- `--mount=type=secret,id=netrc,target=/root/.netrc` — pass credentials without baking them into the image (e.g. private PyPI/npm registry).
- `--mount=type=ssh` — use the host SSH agent inside the build (e.g. private repos in `go mod` / `npm`).

## Putting It Together

A Dockerfile that applies all three extras alongside the 5 core corrections is in the per-language `references/*.md` files. Pick the language and copy the template wholesale — it's already wired up correctly.
