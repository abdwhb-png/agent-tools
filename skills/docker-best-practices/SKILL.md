---
name: docker-best-practices
description: |
  Author, review, and optimize application Dockerfiles. Covers base-image choice (Alpine vs Slim vs distroless vs scratch), layer ordering, .dockerignore, multi-stage builds, digest pinning, and hardening (non-root user, HEALTHCHECK, BuildKit cache mounts). Use whenever the user writes, reviews, or debugs a Dockerfile, asks how to dockerize a Python / Node / PHP / Go app, or wonders why builds are slow or images are huge. Do NOT use for compose, Kubernetes manifests, image signing/SBOM, multi-platform builds, or PaaS deployment — use the `dokploy` skill for Dokploy, otherwise answer directly.
---

# Docker Best Practices

A focused skill for writing Dockerfiles that build fast, ship small, and behave predictably in production. The guidance centers on five corrections that fix most real-world Dockerfile pain (huge images, slow rebuilds, mysterious Alpine failures, drifting base images, bloated runtime) plus three industry-standard hardening extras (non-root user, health check, BuildKit cache mounts).

Source of the five core corrections: "Give me 15 minutes and I'll Fix Your Dockerfiles Forever" — DevOps Toolbox.

## When To Use This Skill

Use this skill whenever the user is working inside a **Dockerfile** (singular build recipe), not a multi-container topology. Typical signals:

- They are writing a new Dockerfile from scratch for a Python / Node / Go / PHP / Rust app.
- They are reviewing or optimizing an existing Dockerfile.
- The build is slow, re-runs dependency installation on every code change, or produces a huge image.
- They are debating base-image choice: Alpine vs Slim, distroless vs scratch.
  A native dependency fails to install on Alpine (e.g. `psycopg`, `lmdb`, Confluent clients, native Node modules).
- They hit "build tools missing on Alpine" and AI told them to `apk add build-base`.
- They want deterministic, reproducible builds (tag drift, supply-chain pinning).
- They are hardening a container for production (non-root user, health check).

## When NOT To Use This Skill

Route the user elsewhere for these:

| Need | Use instead |
| --- | --- |
| Choosing Nixpacks / Dockerfile / Static for a Dokploy deploy | `dokploy` skill |
| Multi-container orchestration (compose, K8s manifests, Swarm stack files) | `dokploy` for Dokploy; otherwise just answer directly |
| Image signing (cosign), SBOMs, registry scanning | Out of scope — answer directly or research |
| Multi-platform / cross-arch builds (`docker buildx`) | Out of scope — out of scope on purpose; one-line pointer only |
| Container runtime observability (logs, metrics, alerts) | Out of scope |

## Quick Reference: The 5 Corrections + 3 Extras

| # | Area | Bad | Good | Why |
| --- | --- | --- | --- | --- |
| 1 | Base image | `python:alpine` (musl libc → rebuilds native wheels from source, slow or fails) | `python:3.12-slim` (glibc → prebuilt wheels work, ~1s install) | Saves ~90MB is not worth ~15× build time |
| 2 | Layer order | `COPY . .` before `npm install` | `COPY package*.json`, install, then `COPY . .` | Layers are an onion: outer changes invalidate inner; put rarely-changing deps first |
| 3 | Build context | Mile-long `COPY` lists to dodge bloat | `.dockerignore` + plain `COPY . .` | Keeps Dockerfile readable; context actually shrinks |
| 4 | Runtime image | `FROM golang:alpine` (272MB) to ship a binary | Multi-stage → `distroless` (or `scratch`) → 2.3MB | Builder stage = bloat; runtime stage should be minimal |
| 5 | Pinning | `FROM node:26-slim` (tag moves) | `FROM node:26-slim@sha256:...` | Tags drift; digests are immutable |
| 6 (extra) | User | `USER root` (default) | Create non-root user, `USER app` | Blast-radius reduction on escape |
| 7 (extra) | Health | No health signal | `HEALTHCHECK CMD ...` (Docker / Compose) or external probe for K8s | Lets orchestrator act on liveness |
| 8 (extra) | Cache mounts | `RUN pip install ...` re-fetches on layer rebuild | `RUN --mount=type=cache,target=/root/.cache/pip pip install ...` | Persistent pkg-manager cache survives layer invalidation |

For any of these rows, read the matching `rules/*.md` for the full reasoning and edge cases.

## Core Rules (defaults)

These are the safe defaults. Override only with a measured reason.

- **Base image**: prefer `<lang>:<version>-slim`. Avoid Alpine unless you have measured the rebuild cost and accepted it. Use `gcr.io/distroless/...` for Go / static binaries.
- **Layer order**: `WORKDIR` → `COPY manifest+lockfile` → `RUN <install>` → `COPY . .`. Whatever changes most often goes last.
- **`.dockerignore` is mandatory**, not optional. Always include: `node_modules/`, `.git/`, `*.log`, build output dirs, `.env*`, IDE dirs, virtualenv folders.
- **Multi-stage** is the default for compiled languages (Go, Rust) and any app with heavy dev dependencies (Node, Python with native deps). Runtime stage uses distroless or slim.
- **Pin digests** for any image you ship to production, both official and internal. Use `docker buildx imagetools inspect <image>:<tag>` to fetch the digest.
- **Run as non-root**: create a dedicated user and switch to it before `CMD`.
- **Declare `HEALTHCHECK`** for pure-Docker / Compose deployments. For Kubernetes, prefer a real `livenessProbe` / `readinessProbe` in the manifest.
- **Use BuildKit cache mounts** when the same `RUN <install>` layer is rebuilt often (CI, frequent rebuilds).

## Working Style: A Fixed Decision Order

Drive every Dockerfile answer through this order so the recommendation is easy to audit:

1. **Choose base image** per language and binary type (slim / distroless / scratch).
2. **Order layers for cache** — manifest + lockfile first, source last.
3. **Add `.dockerignore`** with the standard exclusions.
4. **Multi-stage** if there is a build step or compiled artifact.
5. **Pin the digest** of every `FROM` line destined for production.
6. **Harden**: non-root user, `HEALTHCHECK`, and cache mounts where appropriate.

## Reference Files

Read narrowly — only the file that matches the user's question.

### Rules (concepts and decisions)

| File | Read when… |
| --- | --- |
| [rules/base-image-selection.md](rules/base-image-selection.md) | Choosing Alpine / Slim / distroless / scratch, debugging native-dep failures on Alpine |
| [rules/caching-and-ordering.md](rules/caching-and-ordering.md) | Slow rebuilds, "every code change reinstalls deps", `.dockerignore` questions |
| [rules/multi-stage-and-runtime.md](rules/multi-stage-and-runtime.md) | Image is too big, want to slim a compiled/static app, scratch vs distroless |
| [rules/image-pinning.md](rules/image-pinning.md) | Reproducible builds, supply chain, "pin the base image" |
| [rules/hardening-extras.md](rules/hardening-extras.md) | Non-root user, HEALTHCHECK, BuildKit `--mount=type=cache` |
| [rules/multi-process-containers.md](rules/multi-process-containers.md) | Legitimate need to run two processes (e.g. NGINX + app) in one image with supervisord |

### References (annotated, copy-pasteable Dockerfiles)

Use these as the starting point when the user asks to dockerize an app of that language. Each one applies all five corrections plus the hardening extras, with inline commentary.

| File | Stack |
| --- | --- |
| [references/python.md](references/python.md) | Python web service (Flask / FastAPI) with pip |
| [references/node.md](references/node.md) | Node service with npm, multi-stage with production-only deps |
| [references/go.md](references/go.md) | Go service, multi-stage builder → distroless |
| [references/php.md](references/php.md) | PHP web service — FPM + nginx, php:apache, FrankenPHP, queue worker variants |

## Tooling (lint layer)

Mention these to the user; the skill itself is not a replacement for them.

- **[hadolint](https://github.com/hadolint/hadolint)** — the de facto Dockerfile linter. Run locally and in CI.
- **[dockerroast](https://github.com/JonathanTreffler/dockerroast)** (Rust, mentioned in the source video) — opinionated "roast" mode detecting common mistakes like `npm install` instead of `npm ci`, or `COPY . .` without a `.dockerignore`. Use `--no-roast` for plain findings.

## Troubleshooting Order

When the user shows up with a broken or bad Dockerfile, narrow failure in this order before proposing fixes. Each step has a matching `rules/*.md` for deeper detail.

1. **Base-image compatibility** — Alpine + native deps? (rules/base-image-selection.md)
2. **Cache thrash** — Does every code change reinstall dependencies? (rules/caching-and-ordering.md)
3. **Build-context bloat** — Missing `.dockerignore`, painful transfers? (rules/caching-and-ordering.md)
4. **Runtime image size** — Are they shipping build tools to prod? (rules/multi-stage-and-runtime.md)
5. **Reproducibility** — Are they on a moving tag? (rules/image-pinning.md)
6. **Runtime hardening** — Running as root with no health signal? (rules/hardening-extras.md)

## Philosophy

"Don't do things just because that's how we've always done them." Most Dockerfile harm comes from cargo-culted patterns (Alpine because it's small, mile-long `COPY` lists, running as root). Every rule in this skill has a measurable reason — build time, image size, reproducibility, or blast radius. When in doubt, measure: `docker buildx imagetools inspect`, image size before/after, build time before/after.
