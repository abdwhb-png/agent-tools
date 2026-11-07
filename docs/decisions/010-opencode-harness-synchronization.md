# ADR-010: Synchronize instructions, agents and MCP configuration into OpenCode

Status: Accepted. Extends [ADR-001](001-cross-harness-instruction-synchronization.md), [ADR-002](002-explicit-harness-instruction-layers.md), [ADR-003](003-native-agent-synchronization.md), [ADR-004](004-separate-synchronization-commands.md) and [ADR-007](007-antigravity-harness-synchronization.md) without changing their ownership, conflict, backup or rollback model.

Date: 2026-11-06

## Context

OpenCode V2 reads global configuration from `~/.config/opencode`, or `$XDG_CONFIG_HOME/opencode` when set. Its relevant native surfaces are:

- Global instructions at `<home>/AGENTS.md`, loaded alongside project `AGENTS.md` files.
- File-based agents under `<home>/agents/<name>.md`, where the path-derived filename is the agent ID and the Markdown body is the system prompt.
- MCP servers under `mcp.servers` in `opencode.json(c)`.

V2 agent frontmatter uses `description`, `mode`, `model`, `permissions`, `steps`, `hidden`, `color` and `disabled`. The V1 `agent/` directory and fields such as `permission`, `prompt`, `tools`, `disable` and `maxSteps` are deprecated. OpenCode supports JSON and JSONC configuration and watches files for changes, so synchronization does not need to restart a runtime.

The repository already has canonical instruction layers, native agent profiles and the Antigravity MCP registry. OpenCode needs all three surfaces but not a new synchronization command.

## Decision

### Add OpenCode as an optional home-based harness

`harnesses.opencode` is an optional `HomeHarnessConfig` in both commands: `enabled`, `home` and repeatable named `additionalHomes`. It is absent from existing configurations and defaults to `$XDG_CONFIG_HOME/opencode`, otherwise `~/.config/opencode`, when enabled. `retiredAgents` remains Codex-only.

CLI options are `--opencode-home PATH`, repeatable `--opencode-additional-home ID=PATH`, `--enable-opencode` and `--disable-opencode`.

### Instruction layout

Each configured home receives one whole-file target, `<homeId>-agents` at `<home>/AGENTS.md`. It combines `invariant.md` and `instructions/opencode/system/*.md` with the tagged-module introduction, then `preferences.md`, `technology-defaults.md` and `instructions/opencode/agents/*.md`. This matches the Zed combined-output placement and avoids editing `opencode.json(c)` merely to register an `instructions` entry.

Project `AGENTS.md` discovery remains outside the tool. An existing unmanaged global `AGENTS.md` conflicts until explicit adoption.

### Agent layout

Each canonical role may declare an `opencode` section in `agents/<role>/agent.json`. `description` defaults to the shared description and `mode` defaults to `subagent`. The renderer supports V2 fields only and rejects V1 fields and `system`, because the Markdown body owns the prompt. Path bindings resolve in OpenCode native strings like the other harnesses.

Output is `<home>/agents/<role>.md`, with target IDs `<homeId>-agent-<role-id>` and the recorded `agentDirectory` needed by the existing unchanged-and-owned deletion lifecycle.

The synchronizer owns no role-specific allowlist. The catalog sets `mode: subagent` for every role and denies the `edit` tool for read-only roles in each role's `agent.json`. Execution roles keep edit access. Changing a role's mode, model or permissions is a canonical source edit followed by agent sync.

Denying `edit` is a tool permission, not a shell sandbox. Role prompts and user oversight remain the boundary for shell commands.

### MCP layout

`mcp/opencode.json` is the canonical OpenCode registry. It uses the native V2 shape:

```json
{
  "mcp": {
    "servers": {
      "context7": { "type": "remote", "url": "https://mcp.context7.com/mcp" },
      "firecrawl-mcp": {
        "type": "local",
        "command": ["npx", "-y", "firecrawl-mcp"],
        "environment": { "FIRECRAWL_API_KEY": "{env:FIRECRAWL_API_KEY}" }
      }
    }
  }
}
```

The validator supports local and remote V2 server fields, rejects V1 `enabled`, validates URLs, timeouts, protocols and OAuth shapes, and requires `{env:NAME}` references for secret-like environment, header and OAuth values.

Instruction synchronization owns the whole `mcp.servers` object for each configured OpenCode home, as target `<homeId>-mcp-config`. For JSONC files the object is wrapped in explicit markers:

```jsonc
"mcp": {
  // >>> agent-policy mcp servers >>>
  "servers": {
    "context7": { "type": "remote", "url": "https://mcp.context7.com/mcp" }
  }
  // <<< agent-policy mcp servers <<<
}
```

Everything outside the markers is preserved. For a plain `opencode.json`, the renderer replaces the `mcp.servers` object and reserializes valid JSON. If both `opencode.json` and `opencode.jsonc` exist, synchronization fails. If neither exists, the tool creates `opencode.jsonc`.

An existing configuration without markers requires explicit adoption. First adoption of a JSONC file rewrites it deterministically with markers, preserving all JSON data but normalizing formatting and dropping comments; the transaction creates a recovery backup. Subsequent updates replace only the marked region and preserve comments and settings outside it. Servers added through `opencode mcp add --global` conflict until adopted; shared servers belong in `mcp/opencode.json`.

MCP configuration is managed by `instruction-sync` only. `agent-sync` does not read or write `opencode.json(c)`.

## Alternatives Considered

- **Register a policy file through `opencode.json`'s `instructions` array.** Avoids owning global `AGENTS.md`, but requires a new JSONC merge and ownership mechanism for a file that also contains unrelated user settings. Rejected for the initial integration.
- **Manage only selected MCP entries by key.** Preserves user-added servers automatically, but requires per-key ownership state inside a shared JSON object and a more complex conflict model. The whole-registry region matches the established Antigravity MCP trade-off and keeps ownership simple.
- **Invoke `opencode mcp add` or the OpenCode API.** Preserves OpenCode's own formatting, but moves mutation outside the planner and file transaction and breaks deterministic previews, backups and rollback. Rejected.
- **Use a JSONC range editor for first adoption.** Preserves comments, but adds a new parser and edit-range implementation. Deferred; the deterministic first-adoption rewrite is explicit and backed up.
- **Default every role to `mode: all`.** Makes every specialist selectable as a primary agent, but adds up to 17 primary entries. The catalog starts with subagents and can promote individual roles in their `agent.json`.

## Consequences

- OpenCode joins Pi, Codex, Zed, VS Code and Antigravity as an instruction destination and Pi, Codex, VS Code and Antigravity as an agent destination, with independent configuration and ownership state per command.
- Existing users see no behavior change until they configure and enable OpenCode.
- The catalog gains OpenCode profiles for every enabled canonical role; the current catalog disables `pi-expert`, leaving 16 active OpenCode profiles, and adds one canonical MCP registry.
- A user-added server in `opencode.json(c)` is a conflict, not a merge. It must be added to `mcp/opencode.json` or preserved before adoption.
- First adoption may normalize JSONC formatting and remove comments outside the new markers, with a backup.
- OpenCode skills, commands, plugins, providers, `default_agent`, global permissions and other configuration settings remain outside the tool.
- Static tests and JSON/YAML parsing do not prove that a live OpenCode service loads the agents or connects the MCP servers. Runtime discovery remains a manual acceptance check.

## Validation Requirements

Use focused tests through the real modules for configuration validation, CLI flags, instruction composition, agent rendering and validation, target identity, adoption, conflict blocking, removal, MCP region rendering, JSONC parsing, plain JSON handling, secret rejection, both-file failure, idempotence and rollback. Validate generated YAML with an independent parser and generated JSONC with Bun's JSONC parser. Rebuild both standalone bundles and run `bun run verify:dist`. Do not apply generated content to a live OpenCode profile as part of this decision.
