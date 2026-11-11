# Canonical Instructions Architecture

This directory holds the canonical global instruction sources synchronized across harnesses by [`tools/harness-sync/dist/instruction-sync.mjs`](../tools/harness-sync/README.md).

> **Note:** `loadCanonicalSources` in [`tools/harness-sync/src/sources.ts`](../tools/harness-sync/src/sources.ts) reads only the explicit top-level files (`invariant.md`, `preferences.md`, `technology-defaults.md`), `pi/APPEND_SYSTEM.md`, and `*.md` modules inside `<harness>/system/` and `<harness>/agents/`. This `README.md` is documentation only and is never loaded or rendered into any harness target.

## Layer Separation (`invariant.md` vs. `preferences.md` vs. `technology-defaults.md`)

To prevent instruction intermingling and respect each harness's privilege hierarchy (such as Codex's `developer`-role `developer_instructions` versus `user`-role `AGENTS.md`), every topic lives in exactly one canonical source based on its authority and override rules:

| Canonical File | Layer Role | What Belongs Here | Why |
| --- | --- | --- | --- |
| [`invariant.md`](invariant.md) | **Operating Invariants** (Non-overridable system/developer rules) | - Purpose & evidence-led judgment<br>- Anti-slop philosophy, Ousterhout deep modules, DRY / single source of truth, and concise code smell guardrails<br>- Scope, authority, architecture decision format, and security/secrets boundaries<br>- External information truth hierarchy (live registries vs. `DeepWiki` / `Context7`) | Rendered into the highest-privilege layer (`developer_instructions` in Codex, `APPEND_SYSTEM.md` in Pi, `GEMINI.md` in Antigravity). Project-level `AGENTS.md` files and skills must never weaken these invariants, and keeping them in the developer layer preserves the global `AGENTS.md` byte budget. |
| [`preferences.md`](preferences.md) | **Engineering Workflows & Personal Guidance** | - Core paradigms (determinism, model routing, anti-slop)<br>- Test-driven development (`tdd` skill routing, two-tier integration-first surface rule, regression budgeting, live/benchmark verification, TDD anti-patterns)<br>- Validation and completion cadence<br>- Dependency installation workflow (`dependency-installation` skill routing)<br>- Delegation, subagent authorization boundary, and specialist routing<br>- Writing style (single-line prose), concise communication, and chat reference codes (`D1`, `O1`, `A1`) | Rendered into the global guidance layer (`AGENTS.md` in Codex and Pi, `always_on` rule in Antigravity). Defines default cross-project workflows, skill routing, and communication style while allowing repository-specific `AGENTS.md` files to add local commands or repo-specific test/lint conventions. |
| [`technology-defaults.md`](technology-defaults.md) | **Conditional Stack Defaults** | - Default runtime, package manager, framework, test runner, and tooling preferences when starting greenfield work | Applies only when a repository has not established its own stack or when explicitly migrating stacks (rendered with `trigger: model_decision` in Antigravity). |

## Harness-Specific Modules

Optional per-harness directories extend either layer without polluting other harnesses:

- `instructions/<harness>/system/*.md` — Appended to the **Operating Layer** after `invariant.md` wrapped in `<harness_system_module>` tags (for example, [`codex/system/executor.md`](codex/system/executor.md), [`codex/system/user-question-wait.md`](codex/system/user-question-wait.md), [`pi/system/specific-tools.md`](pi/system/specific-tools.md)).
- `instructions/<harness>/agents/*.md` — Appended to the **Personal Guidance Layer** after `preferences.md` wrapped in `<harness_agents_module>` tags (for example, [`pi/agents/task-workflow.md`](pi/agents/task-workflow.md)).
- [`instructions/pi/APPEND_SYSTEM.md`](pi/APPEND_SYSTEM.md) — Dedicated Pi append source concatenated after Pi's operating layer in `~/.pi/agent/APPEND_SYSTEM.md`.

## Native Harness Destination Mapping

| Harness | Operating Layer (`invariant.md` + `<harness>/system/*.md`) | Personal Guidance (`preferences.md` + `technology-defaults.md` + `<harness>/agents/*.md`) | Notes |
| --- | --- | --- | --- |
| **Codex** | Managed `developer_instructions` block in `<home>/config.toml` (`developer` API role) | `<home>/AGENTS.md` (`user` context role, loaded before repo `AGENTS.md`) | `developer_instructions` cannot be overridden by repo `AGENTS.md` and does not consume Codex's `project_doc_max_bytes` budget. `mcp_servers` from `mcp/codex.json` are managed in a second marked region of `config.toml`. |
| **Pi** | `<agentDir>/APPEND_SYSTEM.md` (followed by `pi/APPEND_SYSTEM.md`) | `<agentDir>/AGENTS.md` | Preserves Pi's native system prompt while appending operating invariants. |
| **OpenCode** | `<home>/AGENTS.md` (operating layer followed by personal guidance) | Same file | MCP servers from `mcp/opencode.json` are written to a marked `mcp.servers` region in `opencode.jsonc` (or `mcp.servers` in plain `opencode.json`). |
| **Antigravity** | `<home>/GEMINI.md` (plain Markdown, always active) | `<home>/config/rules/agent-policy-preferences.md` (`trigger: always_on`) & `<home>/config/rules/agent-policy-technology-defaults.md` (`trigger: model_decision`) | Each Antigravity rule file is checked against the 24,000-byte preflight cap. |
| **VS Code** | Combined into configured `*.instructions.md` targets (`invariants` section) | Combined into configured `*.instructions.md` targets (`preferences` section) | Emitted with `applyTo: "**"`. |
| **Zed** | First section of `<home>/AGENTS.md` | Second section of `<home>/AGENTS.md` | Combined in order: operating layer then personal guidance. |
