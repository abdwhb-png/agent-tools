# Node Dockerfile Reference (npm; multi-stage with production-only deps)

Annotated production-ready Dockerfile that applies all 5 core corrections and all 3 hardening extras. Copy and adjust. Covers a Node service that needs a build step (TypeScript, Next.js, NestJS, Vite SSR, etc.); a no-build version is included at the bottom.

## The Dockerfile (with build step)

```dockerfile
# syntax=docker/dockerfile:1
# Required because we use --mount=type=cache and multi-stage naming.

# ────────────────────────────────────────────────────────────────────────────
# CORE #5 (pinning) + CORE #1 (slim, not alpine).
# node ships prebuilt .node binaries targeting glibc — alpine would fail or
# recompile things like better-sqlite3, bcrypt, sharp, etc.
# ────────────────────────────────────────────────────────────────────────────
FROM node:22-slim@sha256:<run-`docker-buildx-imagetools-inspect-node:22-slim`-and-paste-here> AS base

# ────────────────────────────────────────────────────────────────────────────
# Builder stage: install ALL deps (incl. dev), then build the artifact.
# ────────────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# CORE #2 (layer order): manifests+lockfile before source.
COPY package.json package-lock.json ./

# EXTRA #8 (cache mount): persist npm cache across rebuilds.
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

# ────────────────────────────────────────────────────────────────────────────
# Runtime stage: production deps only + built artifact + run as `node` user.
# ────────────────────────────────────────────────────────────────────────────
FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Install production deps only.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev && \
    # Wipe npm cache from inside the layer too (belt and braces).
    npm cache clean --force

# Bring in the built artifact from the builder stage.
COPY --from=builder /app/dist ./dist

# node:22-slim already ships a `node` user (UID 1000). OWN what we copied.
RUN chown -R node:node /app

USER node

EXPOSE 3000

# EXTRA #7 (HEALTHCHECK): Node 22 has global fetch(); no curl needed.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
```

## Companion `.dockerignore`

```gitignore
.git
.gitignore

# Host-installed deps — they will be installed inside the image, never ship them
node_modules/

# Build outputs (we rebuild inside the image)
dist/
build/
.next/
.nuxt/
.turbo/

# Env / secrets
.env
.env.*
!.env.example

# Tests
coverage/
*.test.ts
*.spec.ts
tests/
__tests__/
e2e/

# Tooling
.vscode/
.idea/
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# Meta
*.md
docs/
Dockerfile*
docker-compose*.yml
```

## Why each decision was made

| Decision | Reason |
| --- | --- |
| `node:22-slim` (not `:alpine`) | sharp, better-sqlite3, bcrypt, esbuild's binary deps and many others ship prebuilt for glibc. On Alpine they fail or compile. See [rules/base-image-selection.md](../rules/base-image-selection.md). |
| Multi-stage with separate `builder` and `runtime` | Dev deps (TypeScript, babel, webpack, vitest, esbuild) can be hundreds of MB and are not needed at runtime. Builder stage = bloat zone; runtime stage keeps them out. See [rules/multi-stage-and-runtime.md](../rules/multi-stage-and-runtime.md). |
| `npm ci` everywhere (not `npm install`) | Strict install from lockfile. Faster, reproducible, refuses to mutate `package-lock.json`. |
| `npm ci --omit=dev` in runtime | Skip devDependencies in the production image. Saves tens of MB. |
| `NODE_ENV=production` | Many libs switch to optimized code paths when this is set; npm skips `optionalDependencies` flagged optional. |
| `--mount=type=cache,target=/root/.npm` | Survives layer invalidation when package.json changes; only the changed packages re-download. See [rules/hardening-extras.md](../rules/hardening-extras.md). |
| `COPY package*.json` before `COPY . .` | Source changes (the most common case) don't invalidate npm ci. See [rules/caching-and-ordering.md](../rules/caching-and-ordering.md). |
| `chown -R node:node` before `USER node` | The `node` user already exists in `node:22-slim`. Just own the working files. |
| Numeric-free `USER node` | node image already provides a `node` user — reuse it instead of creating one. |
| `fetch(...)` in HEALTHCHECK | Node 22 has global `fetch`. No need to install curl. |
| Pinned digest on `FROM ... AS base` | Both builder and runtime inherit the pin via `FROM base AS ...`, so a single digest update upgrades both. |

## Variant: No Build Step

If your service is plain JS (or runs TypeScript directly via something like `tsx`):

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-slim@sha256:<...>
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

COPY . .

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/index.js"]
```

No multi-stage needed because there is no compiled artifact to produce; runtime deps are all that's needed.

## Variant: pnpm

```dockerfile
FROM base AS builder
RUN corepack enable
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS runtime
RUN corepack enable
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
```

(Set `ENV PNPM_HOME=/pnpm` before `corepack enable` if you need it.)

## Variant: Yarn Berry

```dockerfile
FROM base AS builder
RUN corepack enable
COPY .yarnrc.yml package.json yarn.lock ./
COPY .yarn ./.yarn
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --immutable
COPY . .
RUN yarn build
```

Note Yarn Berry's PnP model can complicate runtime; many teams still prefer Yarn Classic or pnpm in containers.

## Common Mistakes

- **Forgetting to actually SEE the digest.** `node:22-slim` and `node:22-slim@sha256:<your-sha>` need the same digest run fresh from `imagetools inspect`.
- **Building with `npm install` instead of `npm ci`** at runtime. Slow and produces different node_modules in different builds.
- **`COPY . .` before `COPY package*.json`** in the runtime stage. Breaks caching on source changes.
- **Missing `.dockerignore` for `node_modules/`.** Ships your localhost dependencies (often with platform-specific binaries) into the image — multi-arch builds break loudly.
- **Binding to port 80 after `USER node`.** Same trap as Python — non-root can't bind < 1024.
- **`HEALTHCHECK CMD curl ...`** in a slim image without `apt-get install -y --no-install-recommends curl`. Use Node's global `fetch` instead.
- **Setting `NODE_ENV=production` in the builder stage.** Will hide devDependencies when the build tries to invoke `tsc` / `vite` / `webpack`. Keep builder on whatever your dev env needs; set `NODE_ENV=production` only in the runtime stage.
