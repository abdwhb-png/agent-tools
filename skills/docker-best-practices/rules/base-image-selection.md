---
name: docker-base-image-selection
description: |
  Choose the right base image for a Dockerfile: Alpine, Slim, distroless, or scratch.
  Understand the musl-vs-glibc problem, why Alpine breaks native dependencies, and when
  the size savings of scratch/distroless actually matter.
---

# Base Image Selection

This rule covers correction **#1 from the parent skill** (Alpine vs Slim) and the runtime-image half of correction **#4** (distroless vs scratch). Read it when the user is choosing a base image or debugging native-dependency failures.

## The musl-vs-glibc Problem

Alpine is tiny because it uses **musl libc** instead of **glibc**. This is not cosmetic.

- **glibc** is the GNU C library. It is what Debian, Ubuntu, Fedora, and most Linux distros ship. Most application releases that include compiled C-level code (Python wheels with native extensions, Node native addons, JavaScript engines, prebuilt binaries) are built and tested against glibc.
- **musl** is small and clean. Alpine uses it. It is **not binary-compatible** with glibc.

The consequence: when you install a package on Alpine that ships prebuilt artifacts (most Python wheels, many Node packages, official client binaries like Confluent's Kafka Python), there is no prebuilt musl variant. The package manager has to either:

1. **Fail outright** — e.g. Confluent Kafka Python: `ERROR: No matching distribution found for confluent-kafka`. LMDB (a small C key-value store) fails the same way.
2. **Fall back to compiling from source** — which requires a full C toolchain (gcc, make, headers). Without it, the build fails. With it, the build succeeds but takes dramatically longer.

### The "ChatGPT fix" trap

When Alpine builds fail with cryptic `gcc not found` errors, copilot/ChatGPT will cheerfully suggest:

```
RUN apk add --no-cache build-base
```

`build-base` pulls in GCC, make, musl-dev, and a pile of small libraries. The build then succeeds — but:

- A single library like LMDB that builds in **<1 second on `slim`** takes **~10 seconds on Alpine** with `build-base`. That is roughly **15× slower for one library**.
- Multiply across every native dependency in the project (psycopg2, lxml, numpy, pandas, cffi, cryptography, Pillow…).
- The toolchain and headers stay in the final image, undoing some of Alpine's size win.
- At enterprise scale (thousands of builds per day), you are paying real money and CI time for a 90MB savings you didn't need.

**The right fix is not `apk add build-base` — it is switching to `-slim`.**

## The Decision Matrix

| Image | Use when | Avoid when | Rough size (Python 3.12) |
| --- | --- | --- | --- |
| `python:3.12` (full) | You genuinely need the toolchain at runtime (rare) | Production | ~1 GB |
| `python:3.12-slim` | **Default for Python app containers.** Accepts prebuilt wheels, builds fast. | Apps that absolutely need every byte and have measured rebuild cost | ~150 MB |
| `python:3.12-alpine` | You have measured the rebuild cost and accept it; or you have a pure-Python app with zero native deps | Anything with native deps (psycopg, lmdb, numpy, lxml, cryptography, etc.) | ~60 MB |
| `gcr.io/distroless/python3-debian12` | Hardened runtime for Python; minimal surface, no shell, includes certs | You need a shell for debugging; you need `apt-get` at runtime | ~70 MB |
| `scratch` | You shipped a static binary (`FROM scratch` + `COPY binary`) | Anything that needs libc, certs, or a shell | ~0 MB base |

Same logic applies to **Node** (`node:22-slim` vs `node:22-alpine`), **Ruby**, **Java** (`eclipse-temurin:21-jre-alpine` vs `:21-jre-jammy`), and so on. The musl problem is independent of language.

### Compiled languages are different

For Go, Rust, and other compiled-to-static-binary languages, **Alpine (glibc-vs-musl) is irrelevant at runtime** because the binary is statically linked. The right move there is **multi-stage**:

```dockerfile
FROM golang:1.23 AS builder
# ... build a static binary ...
FROM gcr.io/distroless/static-debian12
# or FROM scratch (purist, no certs)
COPY --from=builder /app /app
CMD ["/app"]
```

For numbers, see [multi-stage-and-runtime.md](multi-stage-and-runtime.md).

## Rule of Thumb

> Any language ecosystem that distributes prebuilt binaries (Python wheels, npm tarballs that include `.node` files, Maven jars with native code) targets **glibc**. On Alpine, they fail or rebuild from source. Use `-slim`.

### The 90MB question

People pick Alpine to save disk. The Python difference between Alpine and Slim is **~90 MB**. Ask: is 90 MB worth 15× build time, occasional silent failures, and chat-AI telling people to `apk add build-base`?

For 99% of application containers, the answer is no. Reach for `-slim` first.

## When Alpine Is Actually Right

- Pure-Python app with zero native deps (e.g. Flask with no psycopg/cryptography/numpy).
- WebAssembly, microcontrollers, or environments where every MB genuinely matters and you've measured the tradeoff.
- Purist personal projects where you accept the friction.

In each case, you should be able to articulate **why** Alpine beats slim. If you can't, use slim.

## Adding System Packages to Slim

A common follow-up: "with Alpine I had `apk add libpq`, how do I get that on slim?" Use Debian's `apt-get`:

```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 \
 && rm -rf /var/lib/apt/lists/*
```

Notes:

- `--no-install-recommends` avoids pulling in suggested packages.
- Always pair `apt-get update` with `apt-get install` in the same `RUN` and clean up `/var/lib/apt/lists/*` so the package list isn't baked into a layer, bloating the image.
- Pin specific package versions (`libpq5=15.x-*`) only when you need reproducibility beyond what digest-pinning the base image gives you.

## Anti-patterns to Call Out

- **Switching to Alpine because a Stack Overflow answer said it was smaller.** Size without measuring rebuild cost is cargo cult.
- **`apk add build-base` to silence an Alpine build failure.** Hides the real bug; multiplies build time.
- **`python:latest`.** Latest tag drifts; major versions break code without warning. Pin major.minor at minimum.
- **Using the full `-devel` image in production** because it was easier to debug with. Ship a slim runtime; debug in the builder stage.
