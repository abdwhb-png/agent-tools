---
name: docker-caching-and-ordering
description: |
  Order Dockerfile layers for maximum cache reuse, and use .dockerignore (not brittle COPY
  lists) to keep the build context small. Covers the onion-layer mental model, manifest+lockfile
  before source, and the canonical .dockerignore contents.
---

# Caching, Layer Order, and `.dockerignore`

This rule covers corrections **#2 and #3 from the parent skill**. Read it when the user complains about slow rebuilds, "every code change reinstalls dependencies", or questions about whether `COPY . .` is bad.

## The Onion Mental Model

Docker layers are like an onion. Docker rebuilds a layer when any **earlier** input changes, then has to rebuild every layer after it.

> You peel an onion from the outside. The deeper the change you're making, the deeper you have to peel to rebuild it. The more external the change, the more cache you keep. **Put things that change rarely near the bottom of the Dockerfile (outer layers of the onion); put things that change often near the top (inner layers).**

In Dockerfile terms:

- `RUN` instructions that depend on `package.json` / `package-lock.json` / `requirements.txt` / `go.mod` / `Cargo.toml` / `pom.xml` change rarely. Put these early.
- `COPY . .` for source code changes often. Put this last.

## The Bad Pattern

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY . .                          # source changes constantly
RUN npm ci                        # invalidated every time source changes
CMD ["npm", "start"]
```

Result: every code edit, no matter how small, invalidates the `npm ci` layer. The dependency install runs cold every build. On a real project that is minutes per build, hundreds of times per developer per day.

## The Good Pattern

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./   # only invalidates when manifests change
RUN npm ci                                # cached almost always
COPY . .                                  # source changes invalidate from here only
CMD ["npm", "start"]
```

Now a one-character code change is a fast rebuild: `WORKDIR`, `COPY package*.json`, `RUN npm ci` are all cache hits. Only `COPY . .` and beyond run.

### Per-language manifest files

| Language | What to copy first |
| --- | --- |
| Python | `requirements.txt` (or `pyproject.toml` + `poetry.lock` / `uv.lock`) |
| Node | `package.json` and `package-lock.json` (or `pnpm-lock.yaml` / `yarn.lock`) |
| Go | `go.mod` and `go.sum`, then `go mod download` |
| Rust | `Cargo.toml` and `Cargo.lock`, then `cargo fetch` / `cargo vendor` |
| Ruby | `Gemfile` and `Gemfile.lock`, then `bundle install` |
| JVM (Maven) | `pom.xml`, then `mvn dependency:go-offline` |

### Use `npm ci`, not `npm install`

`npm ci` is "clean install":

- Removes `node_modules/` first
- Installs exactly what's in `package-lock.json`
- Refuses to mutate the lockfile
- Is faster and reproducible in CI

Use `npm install` for local development when you intend to update the lockfile. In Docker, always `npm ci`. The same idea applies to `pip install --no-cache-dir -r requirements.txt` (don't pollute the image with pip's cache) and `apt-get install --no-install-recommends`.

## `.dockerignore` Is Mandatory, Not Optional

The Dockerfile bad pattern above is sometimes "fixed" by replacing `COPY . .` with a mile-long list of explicit `COPY` directives to dodge unwanted files. That is wrong.

> The problem is not `COPY . .`. The problem is sending garbage into the build context. `.dockerignore` solves that, and keeps the Dockerfile readable.

Docker sends every file under the build context directory to the daemon before evaluating any instruction. Without `.dockerignore`, your `node_modules/`, `.git/`, build artifacts, `.env`, IDE folders, and so on all travel through the socket — every build, even instructions that never reach a `COPY`. That is wasted time and wasted bytes.

### Canonical `.dockerignore`

Save this next to the Dockerfile. Adjust per language.

```gitignore
# VCS
.git
.gitignore
.gitattributes

# Dependencies (host) — they will be installed inside the image
node_modules/

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/
.pytest_cache/
.mypy_cache/
.ruff_cache/

# Build outputs
dist/
build/
target/
out/
.next/
.nuxt/
.parcel-cache/

# Logs
*.log
logs/

# Env / secrets (NEVER bake into images)
.env
.env.*
!.env.example

# IDE / OS
.vscode/
.idea/
.DS_Store
Thumbs.db

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Tests
coverage/
.coverage
htmlcov/
*.test.js
tests/
test/
__tests__/

# Documentation
*.md
docs/
```

Notes:

- The `!` prefix un-ignores (whitelists) — useful to keep `.env.example` while excluding real `.env` files.
- Re-evaluate when adding new tooling (e.g. adding a `.turbo/` folder for a monorepo).
- Verify by running `docker build .` and watching the "transferring context" line in the output. It should be tiny.

### Why not list every COPY explicitly?

You can, but:

1. **Readability suffers.** A 25-line `COPY` block makes the Dockerfile harder to scan.
2. **It drifts.** Add a new folder in the repo, miss adding it to the explicit `COPY` list, and the app silently can't find it at runtime.
3. **`.dockerignore` is a more expressive language** (glob patterns, negation, comments) than `COPY` directives.

Keep `COPY . .`, add a `.dockerignore`, win.

## When Layer Order Doesn't Matter Much

- The Dockerfile only does `FROM` + `COPY binary` + `CMD` (e.g. multi-stage final stage for a Go binary). There's nothing to cache.
- You're inside a builder stage where everything rebuilds anyway. Order still helps in local dev, but the savings are smaller.

## Common Mistakes

- **`COPY . .` before dependency install.** The single most common mistake. Costs minutes per build.
- **No `.dockerignore`.** Context transfers gigabytes; image bloats with `.git` history.
- **`COPY` listing every file explicitly instead of using `.dockerignore`.** Painful to maintain, drifts silently.
- **`npm install` instead of `npm ci` in Docker.** Slower and not reproducible.
- **`pip install` without `--no-cache-dir`.** Pip's `~/.cache/pip` ends up in the image, bloating it by tens of MB. (Or use a BuildKit cache mount — see [hardening-extras.md](hardening-extras.md).)
- **Putting `COPY . .` in a builder stage that then runs `npm run build` and `COPY --from=builder` to final.** Order still matters in builder — keep manifest-step first there too.
