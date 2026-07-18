# Python Dockerfile Reference (Flask / FastAPI / Django / generic web service)

Annotated production-ready Dockerfile that applies all 5 core corrections and all 3 hardening extras from the parent skill. Copy and adjust.

## The Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
# Required at the top because we use --mount=type=cache below.

# ────────────────────────────────────────────────────────────────────────────
# EXTRA #5 (image pinning): pin by digest, keep the tag as human-readable label.
# Replace the digest periodically (Renovate / Dependabot can automate this).
# Pick your Python minor version; 3.12 is current stable as of writing.
# ────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim@sha256:<run-`docker-buildx-imagetools-inspect-python:3.12-slim`-and-paste-here>

# ────────────────────────────────────────────────────────────────────────────
# EXTRA #6 (non-root user): create the user before switching to it.
# Use numeric UID/GID so this works without /etc/passwd (didn't matter here,
# but matters on distroless).
# ────────────────────────────────────────────────────────────────────────────
RUN groupadd --system --gid 1001 app \
 && useradd  --system --uid 1001 --gid app --home-dir /app --shell /usr/sbin/nologin app

WORKDIR /app

# ────────────────────────────────────────────────────────────────────────────
# CORE #2 (layer order): copy manifest and lockfile FIRST, install, then copy source.
# This is what makes every subsequent code change a fast rebuild.
# ────────────────────────────────────────────────────────────────────────────
COPY requirements.txt ./

# EXTRA #8 (BuildKit cache mount): pip's download cache survives layer rebuilds.
# Use --no-cache-dir ON the pip side is wrong here — you want the cache dir to
# be populated for next time. The cache mount makes it not bloat the layer.
#
# CORE #1 still applies implicitly: because we are on slim (glibc), prebuilt
# wheels for psycopg, cryptography, numpy, Pillow etc. install in <1s each.
# (On alpine, each of these would either fail or trigger a multi-second rebuild.)
# ────────────────────────────────────────────────────────────────────────────
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

# Now copy source. CORE #3 (.dockerignore) keeps this lean.
COPY . .

# Ensure the runtime user owns what it needs before we switch.
RUN chown -R app:app /app

# ────────────────────────────────────────────────────────────────────────────
# EXTRA #6 (non-root): switch to the app user. From here on, nothing runs as root.
# ────────────────────────────────────────────────────────────────────────────
USER app

EXPOSE 8000

# EXTRA #7 (HEALTHCHECK): use a tiny Python one-liner (no curl in slim by default).
# Adapt the URL to your health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).status==200 else 1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Companion `.dockerignore`

Save next to the Dockerfile:

```gitignore
.git
.gitignore

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/
.pytest_cache/
.mypy_cache/
.ruff_cache/

# Env / secrets
.env
.env.*
!.env.example

# IDE / OS
.vscode/
.idea/
.DS_Store

# Build / docs
docs/
*.md
Dockerfile*
docker-compose*.yml

# Tests — don't bake test files into prod image
tests/
test/
covers/
.coverage
htmlcov/
```

## Why each decision was made

| Decision | Reason |
| --- | --- |
| `python:3.12-slim` (not `:alpine`) | Prebuilt wheels install in <1s. On Alpine, psycopg2/lmdb/cryptography would either fail outright or compile from source (~15× build time). See [rules/base-image-selection.md](../rules/base-image-selection.md). |
| `python:3.12-slim` (not `python:3.12`) | The full image is ~1 GB and bundles the toolchain. slim is ~150 MB and is enough at runtime. |
| `--mount=type=cache,target=/root/.cache/pip` | First build is normal speed; subsequent builds where `requirements.txt` changed skip re-downloading packages that didn't change. See [rules/hardening-extras.md](../rules/hardening-extras.md). |
| `COPY requirements.txt` before `COPY . .` | onion-layer rule: source changes don't invalidate the slow install step. See [rules/caching-and-ordering.md](../rules/caching-and-ordering.md). |
| Numeric UID/GID (1001) | Works on slim and distroless alike; doesn't depend on `/etc/passwd` existing. |
| `chown -R app:app /app` BEFORE `USER app` | Once switched, the app user can't modify files it doesn't own — so we fix ownership first. |
| No `curl` for HEALTHCHECK | Adding curl to slim costs ~6 MB and opens an attack surface. A tiny Python one-liner reuses the interpreter already in the image. |
| `EXPOSE 8000` (not :80) | Non-root users can't bind ports < 1024. Surface :80 via your load balancer / proxy / Compose port mapping. |

## Variants

### Flask

Swap the last two lines:

```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "wsgi:app"]
```

### Django

```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "myproject.wsgi:application"]
```

(Add a `RUN python manage.py collectstatic --noinput` before `USER app` if you serve static files via the app server; otherwise handle via nginx — see [rules/multi-process-containers.md](../rules/multi-process-containers.md).)

### Poetry / uv instead of `requirements.txt`

Replace the install step:

```dockerfile
# Poetry
COPY pyproject.toml poetry.lock ./
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    pip install --no-cache-dir poetry==1.8.3 \
 && poetry config virtualenvs.create false \
 && poetry install --only=main --no-root

# uv (faster)
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    pip install --no-cache-dir uv \
 && uv sync --frozen --no-dev
```

### distroless variant (hardened runtime)

For the absolute minimum attack surface:

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/install -r requirements.txt
COPY . .

FROM gcr.io/distroless/python3-debian12:nonroot
WORKDIR /app
COPY --from=builder /install /usr/local/lib/python3.12/site-packages
COPY --from=builder /app /app
USER nonroot:nonroot
CMD ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

The distroless Python image expects `python -m module` syntax for the entrypoint, hence the leading `"-m"`. You lose `HEALTHCHECK` (no shell, no curl, but `--mount` based health checks via Python interpreter still work — distroless Python is fine).

## Common Mistakes When Using This Template

- **Forgetting to replace the placeholder digest.** `sha256:<...>` is not a literal — run `docker buildx imagetools inspect python:3.12-slim` and paste a real one.
- **Skipping `.dockerignore`.** Template assumes you have one; without it, `COPY . .` pulls `.git`, virtualenvs, etc. into the build context every build.
- **Adding `apk add build-base`** because the build failed. Almost always means you're on alpine (in which case switch to slim) or you genuinely need a system package (in which case `apt-get install -y --no-install-recommends libfoo` on slim).
- **Binding to `0.0.0.0:80` after `USER app`.** Won't work — non-root can't bind privileged ports. Use 8000/8080.
