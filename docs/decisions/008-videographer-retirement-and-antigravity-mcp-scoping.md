# ADR-008: Retire videographer, manage Antigravity MCP, scope inheritance

## Status

Accepted. Extends [ADR-007](/home/abdwhb/engineering/agent-tools/docs/decisions/007-antigravity-harness-synchronization.md) and supersedes the statement in [ADR-001](/home/abdwhb/engineering/agent-tools/docs/decisions/001-cross-harness-instruction-synchronization.md) that the synchronizer does not manage global MCP registries.

## Date

2026-11-02

## Context

Three problems surfaced after the first Antigravity synchronization.

The `videographer` role carried two YouTube MCP server bindings, a Pi skill selection, a Codex profile in two homes, and a VS Code profile, but its responsibility overlaps the direct YouTube tools and the `youtube-analysis` skill. The owning user retired it for every harness.

The `browser-tester` role still bound `chrome-devtools` in its Codex profile while its Pi and VS Code procedures already used the `agent-browser` CLI. Two browser transports for one role meant the Codex path produced evidence that the other paths could not reproduce.

Antigravity agents were created with `inheritMcp: true` and no per-agent servers. The live `~/.gemini/config/mcp_config.json` was 0 bytes, so every Antigravity agent had no MCP tools at all while Codex profiles had scoped access. Either the registry had to be populated, or inheritance meant nothing.

## Decision

### Retire videographer into a legacy tree

Move `agents/videographer/` to `legacy/agents/videographer/` with its prompts and native profiles intact, and document the reason in `legacy/README.md`. The directory leaves the `agents/` scan root, so the loader emits no source and the existing obsolete-agent lifecycle removes the managed native file in every enabled harness after an unchanged-and-owned check, with recovery backups.

Remove the `videographer` clause from `instructions/preferences.md`. A shared instruction that names a specialist who no longer exists is worse than no clause, because it directs models to a role that cannot be selected.

### Use agent-browser as the only browser bridge

Delete `mcp_servers.chrome_devtools` from `agents/browser-tester/agent.json` and state `agent-browser` explicitly in the shared responsibility instead of referring to "the preferred browser bridge". A named transport is reproducible; an implied one is not, and a second transport produces evidence the other harnesses cannot repeat.

### Manage Antigravity's global MCP registry

Add the canonical source `mcp/antigravity.json` and render it to `<home>/config/mcp_config.json` as `<homeId>-mcp-config`, with whole-file hash ownership, conflict blocking, adoption and backups, exactly like every other file target. The registry publishes `context7`, `deepwiki`, `exa` and `firecrawl-mcp`.

Credentials never enter the repository. The Firecrawl server declares a `variables` entry so Antigravity prompts for `FIRECRAWL_API_KEY`, and the value is referenced through the server's `env` map. The renderer rejects keys named `apiKey`, `token`, `secret` or `password` anywhere in the registry, which turns "do not commit a key" from a convention into a preflight failure.

This is a deliberate widening of the instruction domain from Markdown policy to one JSON customization file. It is justified because a registry maintained by hand drifts silently, and because the file is machine-local in exactly the same way as the generated rules.

### Scope inheritance by role, and keep role-specific servers per agent

`inheritMcp` is `true` for the twelve research and review roles and `false` for the five execution roles, so a registry server used for reading documentation does not silently reach a role whose job is writing code. Role-specific servers stay in the agent profile instead of becoming global; `pi-expert` keeps `pi-session-recall` bound through path bindings because no other role should see that server.

Extend the Antigravity validator to check each server entry: required kebab-case unique `name`, no entry combining `command` and `url`, string arguments, string environment values, and no keys outside the supported set.

### Delete the shared Antigravity prompt file

Remove `agents/antigravity.md` without replacement. Its content restated shared invariants and described the synchronizer's own design to the model. `agents/pi.md` sets the standard for this layer by stating a fact that is true only of Pi. Antigravity currently has no such shared fact, so the file is deleted rather than filled with narration. Role-specific `agents/<role>/antigravity.md` files remain available and in use.

## Alternatives Considered

- **Keep videographer with fewer MCP servers.** The role's overlap with the direct YouTube tools and the `youtube-analysis` skill is the actual problem, so trimming servers would leave the duplication.
- **Hand-write `mcp_config.json` once.** Simpler, and rejected: it recreates exactly the drift the synchronizer exists to prevent, and the file would be the only Antigravity customization outside ownership tracking.
- **Keep `chrome-devtools` for Codex only.** Rejected because it makes the browser evidence depend on which harness ran the validation.
- **Whole-registry `inheritMcp: true`.** Rejected for execution roles, which would gain documentation and scraping servers with no task need.
- **Merge into `mcp_config.json` by key instead of whole-file ownership.** Rejected: JSON has no comment markers, so a key-level merge needs a bespoke parser for a file that starts at 0 bytes.

## Consequences

- The catalog drops from 18 to 17 roles. Every harness loses one managed agent file, with a backup.
- Antigravity agents stop being MCP-blind: research and review roles reach four servers through the registry, and `pi-expert` additionally reaches session recall through its profile.
- Any server added later through the Antigravity UI makes `mcp_config.json` conflicted until `adopt` runs, because the file is owned as a whole. Servers should be added to `mcp/antigravity.json` and synchronized instead.
- `youtubeServerScript` stops being required by the catalog. The historical path-binding decision stays as written; only its example is updated.
- A hand-edited native agent file blocks the `videographer` removal until it is adopted, which is the intended protection rather than a defect.

## Validation Requirements

Cover the registry with focused tests: deterministic rendering and sorted keys, rejection of malformed shapes and secret-like keys, invalid JSON in a project, one target per configured home, conflict on an existing empty unmanaged file, adoption with a backup, and idempotent re-sync. Cover the catalog with a 17-role assertion, the inherit policy per role, resolved path bindings for the single per-agent server, browser-tester rendering without any chrome-devtools reference, and removal of a role that carries MCP settings. Rebuild the standalone bundles and verify them against source before applying anything to a live profile.

## Known unverified boundary

Antigravity documents per-agent `mcpServers` as `object[]` without an entry schema. The chosen entry shape reuses the field names of the platform's own `mcp_config.json`. Validation in this repository proves the shape is internally consistent, and `agy agents` still lists a role that carries the field, which proves the frontmatter parses. It does not prove that Antigravity exposes those servers to the subagent at runtime. A session-level probe was attempted on 2026-11-02 and returned `RESOURCE_EXHAUSTED` with quota resetting in roughly five days, so the runtime half of that check is outstanding. Until it runs, treat the per-agent server as parsed but unconfirmed, and prefer publishing shared servers through `mcp/antigravity.json`, which follows the documented registry contract.
