# Static Build Reference (Dokploy)

> For static sites: HTML/CSS/JS, React SPAs, Vue, Astro, Vite, Hugo, Jekyll, etc.

## Dokploy Configuration

In Dokploy → Application → General tab:

| Field                 | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| **Build Type**        | Select "Static"                                                              |
| **Publish Directory** | Output directory of your build tool (e.g., `dist`, `build`, `out`, `public`) |

## How It Works

1. Dokploy detects your package manager and runs the build script from `package.json`
2. Copies the **Publish Directory** contents into an optimized NGINX container
3. Serves static files on **port 80**

**Domain port must be 80** when creating domains for static builds.

## Framework Publish Directories

| Framework               | Publish Directory             |
| ----------------------- | ----------------------------- |
| Vite / React (CRA)      | `dist`                        |
| Next.js (static export) | `out`                         |
| Astro                   | `dist`                        |
| Vue CLI                 | `dist`                        |
| Nuxt (static)           | `.output/public`              |
| Angular                 | `dist/<project-name>/browser` |
| SvelteKit (static)      | `build`                       |
| Gatsby                  | `public`                      |
| Hugo                    | `public`                      |
| Jekyll                  | `_site`                       |
| Docusaurus              | `build`                       |
| 11ty                    | `_site`                       |

## Static Build with Custom Build Command

If your build needs special commands, set environment variables:

```
# Dokploy Environment tab
NIXPACKS_BUILD_CMD=pnpm run build:production
NIXPACKS_INSTALL_CMD=pnpm install --frozen-lockfile
```

## React SPA Example

**Source:** GitHub repository with `package.json`

```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

**Dokploy settings:**
- Build Type: **Static**
- Publish Directory: `dist`
- Domain Container Port: **80**

## Custom NGINX Configuration

For SPAs that need client-side routing (React Router, Vue Router):

The default NGINX config serves `index.html` for all routes. If you need custom config, use the **Dockerfile** build type instead with a custom `nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

## Static vs Nixpacks SPA Auto-Serve

| Feature              | Static Build                   | Nixpacks (auto Caddy)                         |
| -------------------- | ------------------------------ | --------------------------------------------- |
| Server               | NGINX                          | Caddy                                         |
| Config required      | Publish Directory only         | Zero (auto-detected)                          |
| SPA routing          | Built-in `index.html` fallback | Built-in                                      |
| Supported frameworks | All                            | Vite + React/Vue/Svelte/Preact/Solid/Lit/Qwik |
| Custom server config | Via Dockerfile                 | `NIXPACKS_SPA_CADDY=false` to disable         |

**Use Static when:** You want explicit control over the output directory.
**Use Nixpacks when:** You want zero-config for Vite-based SPAs.

## Astro SSR vs Static

| Mode               | Build Type                      | Notes              |
| ------------------ | ------------------------------- | ------------------ |
| Static (default)   | **Static**, Publish Dir: `dist` | Pre-rendered HTML  |
| SSR (Node adapter) | **Nixpacks** or **Dockerfile**  | Needs Node runtime |
| SSR (Deno adapter) | **Dockerfile**                  | Custom runtime     |

## Domain Setup for Static Sites

1. Go to **Domains** tab
2. Host: `yoursite.example.com`
3. Path: `/`
4. **Container Port: 80** (mandatory for static builds)
5. Enable HTTPS → select letsencrypt certificate
6. DNS: A record pointing to server IP

## Build Environment Variables

Static sites often need build-time env vars (API URLs, keys):

```
# Dokploy Environment tab
VITE_API_URL=https://api.example.com
VITE_APP_NAME=My App
NEXT_PUBLIC_API_URL=https://api.example.com
```

These are baked into the static output at build time. Changing them requires a redeploy.

## Common Issues

| Problem                           | Fix                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Blank page after deploy           | Wrong Publish Directory — check build output folder name                     |
| 404 on page refresh (SPA)         | Default NGINX config handles this; if using Dockerfile, add `try_files`      |
| Domain returns 502                | Container Port must be **80**, not your dev port (3000, 5173)                |
| Environment variables not applied | Prefix with framework var (e.g., `VITE_`, `NEXT_PUBLIC_`). Requires redeploy |
| Build fails                       | Check build logs; ensure `build` script exists in `package.json`             |
| Assets not loading                | Check relative vs absolute paths in build config (`base: '/'` in Vite)       |
