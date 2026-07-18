---
name: docker-multi-stage-and-runtime
description: |
  Use multi-stage builds to ship minimal runtime images. Covers the builder stage (where bloat
  is fine), the distroless-vs-scratch-vs-slim decision for the final stage, and per-language
  examples. Source of the dramatic Go 272MB → 11MB → 2.3MB numbers.
---

# Multi-Stage Builds and Runtime Images

This rule covers correction **#4 from the parent skill**. Read it when the user's image is too big, when working with compiled languages (Go, Rust), or when shipping a static binary.

## The Core Idea

> **The builder stage is a bloat zone. The final stage is runtime-only.**

In a single-stage Dockerfile, every build tool, dev dependency, and intermediate artifact ends up in the final image. That is wasted disk, larger attack surface, and slower pulls/deployments.

A multi-stage build splits these concerns:

- **`AS builder` stage** — full base image (`golang`, `node`, `python:3.12`), all dev dependencies, all tools. Whatever it takes to produce the artifact.
- **Runtime stage** — copy only the artifact (compiled binary, `npm ci --omit=dev` `node_modules/`, the `.next/` static build) into a minimal image.

## Size Results (Measured in the Source Video)

For a Go HTTP service:

| Dockerfile shape | Image size |
| --- | --- |
| `FROM golang:1.23` (build + run same stage), no optimization | ~272 MB |
| Multi-stage: `golang:... AS builder` → `FROM alpine`, copy binary | ~11 MB |
| Multi-stage: `golang:... AS builder` → `FROM scratch`, copy binary | ~2.3 MB |

A ~120× reduction going from the naive approach to `scratch`. Even the conservative `alpine` runtime cut more than 95%.

For Node and Python, the savings are smaller because the runtime needs the interpreter — but multi-stage still matters for excluding dev dependencies from production.

## Choosing the Runtime Image: scratch vs distroless vs slim

| Runtime | Pros | Cons | Use when |
| --- | --- | --- | --- |
| `scratch` | Absolutely minimal (~0 base) | No certs (HTTPS breaks), no shell, no `/tmp`, no `/etc/passwd` (so non-root needs manual setup) | Purist, single static binary, you've handled certs and user yourself |
| `gcr.io/distroless/...` | Tiny, no shell, no package manager, includes CA certs, timezones, non-root user, sensible defaults | No shell makes debugging awkward; image has to be specified precisely | **Default recommendation for compiled/static binaries in production** |
| `<lang>:<version>-slim` | Familiar, has shell for debugging, accepts package installs | Larger than distroless | Default for interpreted languages (Python, Node, Ruby) |

### Why distroless is the practical default over scratch

- ships CA certificates (HTTPS works out of the box)
- ships timezone data (`time.Now().Zone()` etc. work)
- ships a non-root user (`nonroot:nonroot`) — no manual `/etc/passwd` work
- has `gcr.io/distroless/static-debian12` (for static binaries), `gcr.io/distroless/base-debian12` (for binaries that need libc), and language-specific variants (`gcr.io/distroless/python3-debian12`, `gcr.io/distroless/nodejs22-debian12`, etc.)
- still tiny — typically 2–20 MB depending on variant

`scratch` purism is real, but it's a sharp edge. Distroless is the same concept with day-1 needs handled.

## Named Stages Convention

Always name the builder stage `builder`. Other stages get descriptive names too (`deps`, `test`, `final`). Three reasons:

1. The name is what `COPY --from=builder` references.
2. Builders leaving an unnamed stage is confusing to read.
3. Docker can skip stages that aren't referenced by the final image (faster builds with `--target final`).

## Pattern: Compiled Language

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.23 AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# CGO_ENABLED=0 produces a static binary — required for distroless/static and scratch
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/app ./cmd/app

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/app /app
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
```

Notes:

- `CGO_ENABLED=0` builds statically. Without it, the binary still links glibc and won't run on `distroless/static` or `scratch`.
- `gcr.io/distroless/static-debian12:nonroot` — the `:nonroot` variant already `USER nonroot` for you, but stating it explicitly is clearer.
- See [references/go.md](../references/go.md) for the full annotated version.

## Pattern: Interpreted Language (Node, with build + runtime split)

```dockerfile
# syntax=docker/dockerfile:1

# --- deps stage: install everything (dev too, so we can build) ---
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder stage: produce the artifact (e.g. transpiled dist) ---
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime stage: production deps + built artifact only ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev          # prod deps only
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Notes:

- `NODE_ENV=production` makes npm skip optional/development-flagged packages and many frameworks switch to optimized paths.
- `npm ci --omit=dev` (npm 9+) — older npm used `--production` or `--only=production`.
- See [references/node.md](../references/node.md) for the full annotated version.

## Pattern: Frontend Build (Vite / Next.js static export / CRA)

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build               # produces /app/dist or /app/.next or /app/out

FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

For a static-only output, `nginx:alpine` is fine — musl-vs-glibc is irrelevant because nginx ships prebuilt and `nginx:alpine` is a tested combination. See [base-image-selection.md](base-image-selection.md) for when Alpine exceptions like this apply.

## When Multi-Stage Is Overkill

- Tiny apps with no build step (a single-file `app.go` or a one-script Python service).
- Prototyping locally where you'll throw the image away.

But the moment you cross into "this is going to production" or "we're shipping this to customers", multi-stage is the default.

## Common Mistakes

- **No multi-stage for compiled languages.** Shipping the entire Go toolchain (200+ MB) to prod to run a 10MB binary.
- **Forgetting `CGO_ENABLED=0`** and then being confused why the binary won't run on `distroless/static`.
- **Using `-alpine` runtime for an interpreted-language app.** Catches the musl problem from [base-image-selection.md](base-image-selection.md) again.
- **Shipping dev dependencies to production** (`npm ci` instead of `npm ci --omit=dev` in the final stage).
- **Keeping the build stage un-named.** `COPY --from=0` works but is fragile; a future Dockerfile edit reshuffling stages silently copies from the wrong one.
- **Using `scratch` without realizing HTTPS breaks.** CA certs have to be copied from the builder stage.
