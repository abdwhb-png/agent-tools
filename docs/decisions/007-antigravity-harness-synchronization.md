# ADR-007: Synchronize instructions and agents into Google Antigravity

## Status

Accepted. Extends the harness set defined in [ADR-001](/home/abdwhb/engineering/agent-tools/docs/decisions/001-cross-harness-instruction-synchronization.md), [ADR-002](/home/abdwhb/engineering/agent-tools/docs/decisions/002-explicit-harness-instruction-layers.md), [ADR-003](/home/abdwhb/engineering/agent-tools/docs/decisions/003-native-agent-synchronization.md) and [ADR-004](/home/abdwhb/engineering/agent-tools/docs/decisions/004-separate-synchronization-commands.md) without changing their safety model.

## Date

2026-10-18

## Context

Antigravity reads personal customizations from `~/.gemini/` and shares that layout between the Antigravity App, the Antigravity CLI (`agy`) and the Antigravity IDE. Verified from the vendor documentation:

- Rules load from `<home>/GEMINI.md`, `<home>/AGENTS.md`, `<home>/config/GEMINI.md`, `<home>/config/AGENTS.md` and, one level deep, `<home>/config/rules/*.md`.
- `GEMINI.md` and `AGENTS.md` ignore YAML frontmatter and stay always active. Files inside `config/rules/` require YAML frontmatter with a snake-case `trigger` of `always_on`, `model_decision`, `glob` or `manual`; a missing or malformed trigger silently drops the rule.
- A single rule file is truncated past 24,000 bytes, and always-on rules share a 20,000-token aggregate budget that demotes the largest files to path-and-description pointers.
- Custom agents load from `<home>/config/agents/<name>.md` for the App and CLI, with YAML frontmatter (`name`, `description`, `mainAgent`, `subagent`, `model` tier, `commandExecutionPolicy`, `tools`, `skills`, `plugins`, `mcpServers`, `inheritMcp`, `inheritCustomizations`) followed by the system prompt.
- An unmapped or misspelled entry in `tools` can hang subagent execution, so tool names must be validated against the documented built-in set before any write.
- The Antigravity IDE and extension surfaces document `~/.gemini/GEMINI.md` and `~/.gemini/config/rules/*.md`, but not `~/.gemini/config/GEMINI.md`.

The canonical sources total 23,320 bytes (`invariant.md` 10,111, `preferences.md` 11,889, `technology-defaults.md` 1,320). Emitting them as one file would sit 680 bytes below the truncation limit, so the destination layout must be split regardless of preference.

## Decision

Treat Antigravity as an optional harness in both existing commands, reusing the shared configuration validation, source discovery, renderer, planner, transaction, backup, adoption and rollback implementations. No new synchronization command or module is introduced.

### Destination model

`harnesses.antigravity` is an optional `HomeHarnessConfig`: `enabled`, `home` and repeatable named `additionalHomes`, matching Codex and Zed. It is absent from new configurations so existing `instructions.config.json` and `agents.config.json` files stay valid with no schema migration. `retiredAgents` remains Codex-only; Antigravity agent retirement uses the shared ownership-hash lifecycle.

CLI options are `--antigravity-home PATH`, repeatable `--antigravity-additional-home ID=PATH`, `--enable-antigravity` and `--disable-antigravity` in both commands.

### Instruction layout

Instructions are emitted as three targets per configured home:

| Target ID | Path | Content | Trigger |
| --- | --- | --- | --- |
| `<homeId>-gemini` | `<home>/GEMINI.md` | `invariant.md`, the tagged-module introduction when modules exist, and `instructions/antigravity/system/*.md` | Always active, no frontmatter |
| `<homeId>-preferences` | `<home>/config/rules/agent-policy-preferences.md` | `preferences.md` and `instructions/antigravity/agents/*.md` | `always_on` |
| `<homeId>-technology-defaults` | `<home>/config/rules/agent-policy-technology-defaults.md` | `technology-defaults.md` | `model_decision` |

`<home>/GEMINI.md` carries the operating layer because it is the one always-active, frontmatter-free location documented for all three surfaces, and because it matches the Pi `APPEND_SYSTEM.md` role: an invariant layer rather than a replaceable system prompt. The preferences rule keeps the tagged-module introduction out of its body, so the phrase appears exactly once per harness, matching the existing composition rule.

Technology defaults use `model_decision` instead of `always_on`. They apply only when a project has not established its own stack, invariant 20 and 21 of the canonical preferences already require deferring to established choices, and progressive disclosure keeps that 1,320 bytes out of every turn. The cost is that Antigravity decides relevance from the rule description; the declared stack case is therefore stated explicitly in that description.

`renderAntigravityRule` validates the trigger and its required fields, and `assertAntigravityRuleSize` rejects any generated Antigravity rule or `GEMINI.md` above 24,000 UTF-8 bytes during preflight. A canonical source that would truncate therefore blocks synchronization instead of writing a silently incomplete rule.

### Agent layout

Each canonical role may declare an `antigravity` profile in `agents/<role>/agent.json`. `name` defaults to the role ID, `description` to the shared description, and `mainAgent` and `subagent` to `true`, so a synced role is both selectable as a primary session agent and delegable through `invoke_subagent`. Path bindings resolve in `skills` and `mcpServers` exactly as they do for Pi and Codex. `agents/antigravity.md` and `agents/<role>/antigravity.md` provide the shared and role-specific native procedures, composed after the shared role guidance in the established order.

All 18 canonical roles publish a profile. Read-only reviewers and `scout` omit file-edit and command tools and set `commandExecutionPolicy: "off"`; `browser-tester` and `qa-tester` allow sandboxed `run_command` without file-edit tools; `quick-worker`, `test-engineer` and `worker` allow scoped edits and sandboxed commands; `code-reviewer` and `oracle` additionally receive the subagent tools. `inheritMcp` is `true` everywhere, so workspace and personal MCP servers remain the owner of external integrations instead of being duplicated into generated profiles.

`validateAntigravity` rejects unsupported keys, invalid model tiers, invalid command policies, non-boolean flags, unexpected MCP entry shapes, duplicate names, duplicate tools and any tool outside `ANTIGRAVITY_BUILTIN_TOOLS`. That last check is the concrete mitigation for the documented hang on unmapped tool names.

Agent targets are `<homeId>-agent-<roleId>` at `<home>/config/agents/<name>.md`, with `agentDirectory` recorded so the existing unchanged-and-owned deletion rule applies when a canonical role disappears. Disabling or moving a home preserves its files and records, as it does for every other harness.

## Alternatives Considered

- **Single `<home>/GEMINI.md`.** Simplest layout, but 23,320 of 24,000 bytes leaves no headroom for a new module and fails at the first addition. Rejected as a silent-truncation hazard.
- **`config/rules/*.md` only, leaving `GEMINI.md` unmanaged.** Avoids claiming a file shared with standalone Gemini CLI, but forfeits the `user_global` always-active placement and the operating layer that all three surfaces document. Rejected after review: `harness-sync` already blocks accidental overwrite of an unmanaged `GEMINI.md` through its ordinary conflict rule.
- **`<home>/config/GEMINI.md` plus `<home>/config/AGENTS.md`.** Keeps the `~/.gemini` root clean, but the IDE and extension surfaces do not document those paths for global rules. Rejected on surface coverage.
- **All technology defaults inside the `always_on` preferences rule.** One fewer target and no reliance on model-driven rule selection, but it spends context on every turn against the user's stated preference for deterministic, minimal prompt weight. Retained as a one-line change if `model_decision` proves unreliable in practice.
- **An Antigravity plugin bundle** (`~/.gemini/config/plugins/`). Bundles rules, agents and MCP servers, but replaces the established per-home file ownership and conflict model with a packaging layer this repository does not otherwise need. Rejected as a new mechanism.

## Consequences

- Antigravity joins Pi, Codex, Zed and VS Code as an optional instruction destination and joins Pi, Codex and VS Code as an optional agent destination, with independent configuration and ownership state per command.
- Existing users see no behavior change until they run `configure` with the new flags. `doctor` and `check` report Antigravity targets only when enabled.
- The 24,000-byte preflight makes future canonical growth fail loudly rather than truncate.
- Antigravity has no `retiredAgents` equivalent; legacy files created outside `harness-sync` must be adopted explicitly or removed manually.
- Generated `~/.gemini/GEMINI.md` participates in the ordinary hash ownership. Editing it through the Antigravity Customizations UI creates a conflict until `adopt` is run, which keeps the shared file under one owner.
- Runtime behavior stays manually verified. Live discovery in the App (`/agents`, Customizations) and CLI (`agy agents`, `/context`) is not proven by the static or CLI checks.

## Validation Requirements

Use focused RED-to-GREEN tests through the real modules for configuration, CLI flags, source discovery, rule rendering, byte limits, target planning, agent validation, YAML round-trip, retention, conflict blocking and rollback. Verify the committed standalone bundles against source with `bun run verify:dist`, and exercise both commands end to end against temporary primary and additional homes. Do not apply generated content to a live profile as part of this decision.
