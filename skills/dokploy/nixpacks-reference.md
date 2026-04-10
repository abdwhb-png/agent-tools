# Nixpacks Build Reference (Dokploy)

> **Note:** Nixpacks is in maintenance mode. Consider Railpack as successor.

Nixpacks is the **default build type** in Dokploy. It auto-detects language and builds OCI-compliant images with zero config.

Docs: https://nixpacks.com/docs | Packages: https://search.nixos.org/packages?channel=unstable

## Dokploy Environment Variables

Set these in the Dokploy **Environment** tab:

| Variable                      | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `NIXPACKS_INSTALL_CMD`        | Override install command                       |
| `NIXPACKS_BUILD_CMD`          | Override build command                         |
| `NIXPACKS_START_CMD`          | Override start command                         |
| `NIXPACKS_PKGS`               | Additional Nix packages to install             |
| `NIXPACKS_APT_PKGS`           | Additional Apt packages (comma-delimited)      |
| `NIXPACKS_LIBS`               | Additional Nix libraries for `LD_LIBRARY_PATH` |
| `NIXPACKS_INSTALL_CACHE_DIRS` | Extra cache dirs during install                |
| `NIXPACKS_BUILD_CACHE_DIRS`   | Extra cache dirs during build                  |
| `NIXPACKS_NO_CACHE`           | Disable build caching                          |
| `NIXPACKS_CONFIG_FILE`        | Path to `nixpacks.toml` (relative to app root) |
| `NIXPACKS_DEBIAN`             | Enable Debian base image (OpenSSL 1.1 support) |

## Publish Directory (Static Sites)

Dokploy exposes a **Publish Directory** field for Nixpacks. When set, after build Dokploy copies the specified directory contents and serves them via an optimized NGINX Dockerfile.

Example: Astro builds to `dist/` → set Publish Directory to `dist`.

Use **port 80** when creating a domain for published static builds.

## Configuration File (`nixpacks.toml`)

Place in app root for fine-grained control. Priority (lowest→highest): Provider → File → Environment → CLI.

```toml
# nixpacks.toml

# Add extra packages
[phases.setup]
nixPkgs = ['...', 'ffmpeg']       # '...' extends provider defaults
aptPkgs = ['wget']

# Custom install
[phases.install]
cmds = ['pnpm install --frozen-lockfile']
cacheDirectories = ['node_modules/.cache']

# Custom build
[phases.build]
cmds = ['pnpm run build']
dependsOn = ['install']

# Runtime
[start]
cmd = 'pnpm start'

# Environment variables baked into image
[variables]
NODE_ENV = 'production'
```

### Phase Options

| Option             | Type       | Description                         |
| ------------------ | ---------- | ----------------------------------- |
| `cmds`             | `string[]` | Commands to run                     |
| `nixPkgs`          | `string[]` | Nix packages to install             |
| `nixLibs`          | `string[]` | Nix libraries for `LD_LIBRARY_PATH` |
| `aptPkgs`          | `string[]` | Apt packages to install             |
| `dependsOn`        | `string[]` | Phases that must run first          |
| `cacheDirectories` | `string[]` | Dirs to cache (not in final image)  |
| `onlyIncludeFiles` | `string[]` | Only these files available in phase |
| `paths`            | `string[]` | Append to `PATH`                    |

### Array Extending

Use `'...'` to extend provider defaults instead of replacing:

```toml
[phases.setup]
nixPkgs = ['...', 'cowsay']   # Adds cowsay to auto-detected packages
```

## Node.js Provider

**Detection:** `package.json` present.

| Setting          | Details                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Node versions    | 16, **18** (default), 20, 22, 23                                                                    |
| Version override | `NIXPACKS_NODE_VERSION`, `engines.node` in package.json, or `.nvmrc`                                |
| Package manager  | Auto-detected from lockfile: npm, yarn, pnpm, bun                                                   |
| Corepack         | Supported via `packageManager` field in `package.json`                                              |
| Monorepo         | NX (`NIXPACKS_NX_APP_NAME`), Turborepo (`NIXPACKS_TURBO_APP_NAME`), Moon (`NIXPACKS_MOON_APP_NAME`) |
| SPA auto-serve   | Vite+React/Vue/Svelte → auto-served with Caddy (disable: `NIXPACKS_SPA_CADDY=false`)                |
| Env defaults     | `CI=true`, `NODE_ENV=production`, `NPM_CONFIG_PRODUCTION=false`                                     |

**Cached dirs:** Global package manager cache, `node_modules/.cache`, `.next/cache` (NextJS).

## PHP Provider

**Detection:** `composer.json` present.

| Setting           | Details                                                             |
| ----------------- | ------------------------------------------------------------------- |
| PHP versions      | 8.1, **8.2** (default), 8.3, 8.4                                    |
| Version detection | Parsed from `composer.json` `require.php`                           |
| Extensions        | Add to `require` in `composer.json`: `"ext-redis": "*"`             |
| Server root       | Default: `/app`. Override: `NIXPACKS_PHP_ROOT_DIR=/app/public`      |
| Fallback          | `NIXPACKS_PHP_FALLBACK_PATH=/index.php` (for router-based apps)     |
| Nginx config      | Custom `nginx.conf` or `nginx.template.conf` in project root        |
| **Laravel**       | Requires `APP_KEY` env var. Set `NIXPACKS_PHP_ROOT_DIR=/app/public` |

**Build steps:** `composer install` → `npm/yarn/pnpm install` (if package.json) → `npm/yarn/pnpm build` (if package.json) → Nginx start.

## Supported Languages

Clojure, Cobol, Crystal, C#/.NET, Dart, Deno, Elixir, F#, Gleam, Go, Haskell, Java, Lunatic, **Node**, **PHP**, Python, Ruby, Rust, Scala, Scheme, Staticfile, Swift, Zig.

## Common Patterns

### Laravel App
```
# Dokploy environment variables
NIXPACKS_PHP_ROOT_DIR=/app/public
NIXPACKS_PHP_FALLBACK_PATH=/index.php
APP_KEY=base64:your-key-here
APP_ENV=production
```

### Node.js App with Custom Build
```
# Dokploy environment variables
NIXPACKS_BUILD_CMD=pnpm run build:production
NIXPACKS_START_CMD=node dist/server.js
NIXPACKS_PKGS=ffmpeg
```

### Monorepo (Turborepo)
```
# Dokploy environment variables
NIXPACKS_TURBO_APP_NAME=web
```

## When NOT to Use Nixpacks

- **Production at scale** → Use Dockerfile or CI/CD pipeline builds (see `going-production` in SKILL.md)
- **Complex multi-stage builds** → Use Dockerfile
- **Need exact base image control** → Use Dockerfile
- **Server freezes during build** → Switch to CI/CD + Docker image deploy
