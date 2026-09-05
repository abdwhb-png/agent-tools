# Technology defaults — apply when no project choice is established

- Preserve the project's established stack and tooling. Apply these defaults only when choosing new technology or when the user explicitly asks for a migration.
- Prefer strict TypeScript 7+ when TypeScript is relevant, and prefer Vite 8+ for a compatible frontend build tool.
- Prefer Next.js for content-oriented or e-commerce applications requiring SEO and massive default server-side rendering optimizations, and prefer TanStack (Start / Router) for complex SaaS applications or interactive dashboards requiring smooth client-side state management, a standard build tool with Vite, and strict end-to-end TypeScript typing.
- Prefer Oxlint for linting and Oxfmt for formatting in JavaScript and TypeScript projects. Their Rust-based implementation supports the fast feedback loop expected during development.
- Prefer Biome instead when the project benefits from one integrated tool for linting, formatting, and import organization, or when its rule coverage is a better architectural fit.
- Prefer Bun test to maximize speed when testing pure logic, API or backend in an ecosystem entirely powered by Bun, but stick with Vitest as soon as project involves GUI components (React, Vue, Svelte) or requires a real browser environment linked to Vite.
