# Go Dockerfile Reference (multi-stage → distroless)

Annotated production-ready Dockerfile. Go is the language where multi-stage shines the hardest: a multi-hundred-MB toolchain image can be cut down to a ~20MB runtime by shipping only the compiled binary. This template applies all 5 core corrections plus the 3 hardening extras.

## The Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
# Required because we use --mount=type=cache.

# ────────────────────────────────────────────────────────────────────────────
# Builder stage.
# CORE #5 (pinning) applies — pin the golang image too.
# Even though this stage won't ship to prod, pinning it keeps build reproducible.
# ────────────────────────────────────────────────────────────────────────────
FROM golang:1.23@sha256:<run-`docker-buildx-imagetools-inspect-golang:1.23`-and-paste-here> AS builder

WORKDIR /src

# CORE #2 (layer order): go.mod/go.sum first, then `go mod download`,
# then copy source. Source changes don't re-download deps.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Build a STATIC binary.
#   CGO_ENABLED=0 turns off cgo, so the binary doesn't link glibc.
#   GOOS=linux pins the OS — sometimes useful when building cross-arch.
#   -ldflags="-s -w" strips debug info and the symbol table for a smaller binary.
#   (Optional: -trimpath removes your local file paths from the binary.)
# Without CGO_ENABLED=0, the binary won't run on distroless/static or scratch.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux \
    go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/app

# ────────────────────────────────────────────────────────────────────────────
# Runtime stage: distroless static. Tinier than alpine, includes CA certs,
# tzdata, and a nonroot user. See rules/multi-stage-and-runtime.md.
# ────────────────────────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot@sha256:<run-`docker-buildx-imagetools-inspect-gcr.io/distroless/static-debian12:nonroot`-and-paste-here>

# distroless already sets USER nonroot, but state it explicitly so it's readable.
USER nonroot:nonroot

COPY --from=builder /out/app /app

EXPOSE 8080

ENTRYPOINT ["/app"]
```

That's it. The runtime stage has:

- No shell
- No package manager
- No build tools
- No dev dependencies
- HTTPS certs (so outbound TLS works)
- A non-root user

And the entire binary is ~5–20 MB depending on what it imports.

## Why each decision was made

| Decision | Reason |
| --- | --- |
| Multi-stage `golang:1.23 AS builder` → `FROM distroless/static` | Source video: ~272MB → ~11MB → ~2.3MB going golang → multi-stage alpine → multi-stage scratch. distroless is the practical sweet spot (~2.3MB more than scratch, but with certs + non-root). |
| `CGO_ENABLED=0` | Without it, `go build` produces a binary that still links libc — won't run on distroless/static or scratch. See [rules/multi-stage-and-runtime.md](../rules/multi-stage-and-runtime.md). |
| `-ldflags="-s -w"` and `-trimpath` | Strips debug info and removes file paths — smaller binary, no leaking your host paths. |
| `go mod download` as its own `RUN` between `COPY go.mod go.sum` and `COPY . .` | Most go source changes don't change go.mod. Means `go mod download` is cached, builds after the first one only rebuild the binary. |
| `--mount=type=cache,target=/go/pkg/mod` and `/root/.cache/go-build` | Go module cache + build cache survive layer invalidation. Big wins on iterative rebuilds. |
| `COPY --from=builder /out/app /app` (one line, one artifact) | Only the binary ships. None of the source, none of the toolchain, none of the deps. |
| `USER nonroot:nonroot` | Distroless's `:nonroot` variant defaults to UID 65532; we just state it for readability. |
| No `HEALTHCHECK` | Distroless images have no shell, no curl, no Python — Dockerfile-level `HEALTHCHECK` is awkward. Encode liveness in the orchestrator's probe (K8s `livenessProbe`) or rely on TCP probe. |
| `ENTRYPOINT ["/app"]` (not `CMD`) | ENTRYPOINT is immutable when the container runs with extra args; CMD can be overridden. For a service where args are not a thing, either works — ENTRYPOINT signals "this is the binary". |

## Variant: `FROM scratch` (purist, tiny)

```dockerfile
FROM scratch
COPY --from=builder /out/app /app
# You need to bring certs yourself for HTTPS to work:
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
# And a passwd entry if you want non-root:
COPY --from=builder /etc/passwd /etc/passwd
USER app
EXPOSE 8080
ENTRYPOINT ["/app"]
```

You save ~10 MB vs distroless. You take on board bringing certs and user setup. Hardly ever worth it; distroless is the better default.

## Variant: App Uses cgo

Some Go programs need cgo (e.g. when wrapping a C library like SQLite via `mattn/go-sqlite3`, or using Kubernetes's `client-go` with some C deps). Then:

- Drop `CGO_ENABLED=0`.
- Switch from `gcr.io/distroless/static-debian12` to `gcr.io/distroless/base-debian12` (which includes libc).
- Expect ~10–20MB more.

```dockerfile
FROM golang:1.23 AS builder
# ... rest ...
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -ldflags="-s -w" -o /out/app ./cmd/app

FROM gcr.io/distroless/base-debian12:nonroot
USER nonroot:nonroot
COPY --from=builder /out/app /app
ENTRYPOINT ["/app"]
```

## Variant: Web Server (Needs /etc/mime.types, etc.)

If the binary serves static files and needs MIME types, use `gcr.io/distroless/base-debian12` (or include the file via `COPY` from the builder stage). Distroless static intentionally omits user-facing Linux files.

## Common Mistakes

- **Shipping the golang image as the runtime.** 200+ MB of toolchain to run a 10MB binary.
- **`CGO_ENABLED=0` omission.** Binary won't run on distroless/static; fault mode is `not found` message on container start (the kernel can't find the dynamic linker).
- **Forgetting to update digests.** Pinned digests get stale. Pair with Renovate / Dependabot so you also get fresh CVE-patched golang.
- **Building with modules not downloaded yet.** If you skip `go mod download` (or `go mod verify`) and just `COPY . .` + `go build`, you lose the caching benefit — but the build still works.
- **Building the wrong OS/arch.** If you build on an M-series Mac for a Linux x86 server without `GOOS=linux`, your binary is darwin/arm64 — won't run. Pin `GOOS=linux` (and `GOARCH=amd64` / `arm64` as needed).
- **`HEALTHCHECK` CMD in a distroless image.** No shell, no curl, no python. Use the orchestrator probe, or expose a `/healthz` HTTP endpoint and let your LB probe it.
- **`FROM scratch` without CA certs.** Outbound HTTPS fails cryptically. Bring `ca-certificates.crt` in via `COPY --from=builder`.
