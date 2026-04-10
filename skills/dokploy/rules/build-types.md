---
name: dokploy-build-types
description: |
  Choose the correct Dokploy deployment mode and build type for an application.
  Covers Application vs Docker Compose, plus Nixpacks, Railpack, Dockerfile, Static, and buildpack choices.
---

# Dokploy Build Types

Use this file when the user already chose Dokploy and the main question is how the app should be deployed.

Detailed build-type rules live here:

- [../nixpacks-reference.md](../nixpacks-reference.md)
- [../dockerfile-reference.md](../dockerfile-reference.md)
- [../static-reference.md](../static-reference.md)

## Decision Order

Choose in this order:

1. **Application vs Docker Compose**
2. **Build type**
3. **Container port / publish directory**
4. **Health check and deploy strategy**

## Application vs Docker Compose

| Choose             | When                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Application**    | Single service, single image, or one repo that produces one deployable app                             |
| **Docker Compose** | Multiple tightly coupled services, custom networking, or service topology already expressed in compose |
| **Stack**          | Docker Swarm orchestration is explicitly required                                                      |

Use **Application** by default. Use **Docker Compose** only when the service graph itself is part of the deployment requirement.

## Build Type Selection

| Build type                  | Use when                                                                                       | Avoid when                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Nixpacks**                | Fast prototype, standard Node/PHP app, conventional build/start commands                       | App needs exact OS packages, custom image layout, or unusual runtime setup |
| **Railpack**                | Same niche as Nixpacks, but newer path when the instance supports it                           | Team needs the most documented/stable path right now                       |
| **Dockerfile**              | Production workloads, multi-stage builds, exact runtime control, custom NGINX/Caddy, monorepos | User wants the fastest zero-config path                                    |
| **Static**                  | Build artifact is static files only and should be served from NGINX                            | App needs server runtime, SSR, workers, or custom runtime processes        |
| **Heroku/Paketo Buildpack** | Migration from those ecosystems or explicit buildpack need                                     | Greenfield deployments without a buildpack constraint                      |

## Hard Rules

- **Use Dockerfile for production by default** when reliability and reproducibility matter more than convenience.
- **Use Static only for generated files** such as `dist`, `build`, `out`, `public`, or `_site`.
- **Static domains must target port 80.**
- **Use Nixpacks first, Dockerfile second** for simple apps unless the user explicitly asks for hardened production deployment.
- **If SPA routing needs custom behavior**, prefer Dockerfile with custom NGINX config instead of fighting the default static setup.

## Build-Type Notes

### Nixpacks

Use for conventional apps with standard install/build/start behavior. It is the convenience path, not the highest-control path.

Use [../nixpacks-reference.md](../nixpacks-reference.md) for:

- `NIXPACKS_*` environment variables
- `nixpacks.toml` overrides
- publish directory behavior for static output
- choosing Nixpacks vs Dockerfile

### Dockerfile

Use for production, monorepos, multi-stage builds, and exact image/runtime control.

Use [../dockerfile-reference.md](../dockerfile-reference.md) for:

- Dockerfile path and context rules
- multi-stage build guidance
- monorepo deployment patterns
- Dockerfile-first production recommendations

### Static

Use only when the final artifact is generated files served from NGINX.

Use [../static-reference.md](../static-reference.md) for:

- publish directory selection
- framework output directory reference
- static port rules
- SPA routing tradeoffs vs Dockerfile

## Publish Directory Guide

| Framework             | Typical publish directory |
| --------------------- | ------------------------- |
| Vite / React          | `dist`                    |
| Next.js static export | `out`                     |
| Astro                 | `dist`                    |
| Vue                   | `dist`                    |
| Nuxt static           | `.output/public`          |
| Gatsby / Hugo         | `public`                  |
| Jekyll / 11ty         | `_site`                   |

## Typical Recommendations

| App shape                         | Recommended Dokploy setup                                      |
| --------------------------------- | -------------------------------------------------------------- |
| Laravel API                       | **Dockerfile**                                                 |
| React/Vite SPA                    | **Static** or **Nixpacks** with publish directory              |
| Node API with standard scripts    | **Nixpacks** first, **Dockerfile** if runtime tuning is needed |
| Monorepo app in subfolder         | **Dockerfile** with explicit Dockerfile/context paths          |
| Existing `docker-compose.yml` app | **Docker Compose**                                             |

## Production Note

When the user asks for the safest production path, prefer `Application` with a `Dockerfile` or a prebuilt image flow. Treat Nixpacks as the fast-start option, not the hardened deployment default.

## Common Mistakes

- Choosing **Docker Compose** for a single simple app and adding needless operational complexity.
- Using **Static** for SSR or long-running server processes.
- Forgetting the **publish directory** for static output.
- Pointing a static domain at app ports like `3000` or `5173` instead of **80**.
- Treating Nixpacks as a production hardening strategy instead of a convenience build system.
