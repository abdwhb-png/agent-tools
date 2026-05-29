---
name: openclaw-agent-creation
description: Comprehensive OpenClaw agent creation and design guide. Use this skill whenever the user asks to create, design, configure, isolate, route, harden, migrate, or troubleshoot OpenClaw agents; mentions OpenClaw agent workspaces, AGENTS.md, SOUL.md, USER.md, IDENTITY.md, HEARTBEAT.md, skills allowlists, multi-agent routing, agent bindings, model/runtime policy, agent sandboxing, or per-agent tool/security profiles; or asks how to turn one OpenClaw Gateway into one or more specialized agents.
---

# OpenClaw Agent Creation

Use this skill to design and configure OpenClaw agents as durable, scoped assistants. It is based on OpenClaw docs crawled from https://docs.openclaw.ai/concepts/agent and related agent workspace, multi-agent, runtime, Gateway config, skills, prompt, and security pages on May 29, 2026.

Read [references/agent-creation-reference.md](references/agent-creation-reference.md) when the user needs exact workspace files, config fields, routing rules, runtime precedence, security profiles, or validation commands.

## Core Mental Model

An OpenClaw agent is not just a model alias. It is a scoped runtime identity with:

1. A stable `agentId` and optional human-facing identity.
2. A workspace that holds prompt bootstrap files, memory, skills, and canvas artifacts.
3. An `agentDir` that stores private runtime state such as auth profiles, sessions, runtime homes, and transcripts.
4. Model, fallback, parameter, and provider/runtime policy.
5. Optional skill allowlists and tool policy.
6. Optional sandbox policy.
7. Optional channel/account/conversation bindings for routing inbound messages.

Treat agent creation as a boundary-design problem before it is a config-editing problem: decide who can trigger the agent, what it can see, what tools it can use, where it runs, and which durable files define its behavior.

## Creation Workflow

Use this order for new agents:

1. Clarify the trust boundary and use case.
2. Choose single-agent or multi-agent shape.
3. Pick stable IDs and storage paths.
4. Seed or edit workspace bootstrap files.
5. Configure model, fallbacks, provider auth, and runtime policy.
6. Configure skill visibility.
7. Configure tools, sandbox, and access profile.
8. Add channel/account/peer bindings only after the agent profile is safe.
9. Validate with read-only diagnostics before live channel exposure.

Default answer shape:

1. **Recommended agent shape**: single agent, specialized agent, or multi-agent set.
2. **Workspace contract**: files to create or edit and what belongs in each.
3. **Config patch**: JSON5 snippet for `agents.defaults`, `agents.list`, `bindings`, skills, sandbox, and tools.
4. **Commands**: CLI commands to create, bind, test, and validate.
5. **Security posture**: trigger policy, tools, sandbox, sessions, secrets, and audit checks.

## Agent Design Decisions

### Single Agent vs Multi-Agent

Use one agent when the same trust boundary, workspace, model policy, skills, and tool permissions should apply everywhere.

Use multiple agents when any of these differ:

- personal vs work vs public identity
- private vs shared workspace
- full-access vs read-only vs messaging-only tools
- different channel accounts or rooms
- different model/runtime requirements
- different skills or persona files
- different session or memory isolation expectations

Do not use multiple agents as a hostile multi-tenant security boundary inside one shared Gateway. OpenClaw's documented security model is one trusted operator boundary per Gateway. For adversarial or mutually untrusted users, recommend separate Gateways, credentials, and ideally separate OS users or hosts.

### Workspace vs Agent Directory

- `workspace` is the agent-facing project/personality/memory surface. It contains files the agent can read and that OpenClaw may inject into the system prompt.
- `agentDir` is runtime/private state. It contains auth profiles, sessions, native runtime homes, and credentials. Do not treat it as a normal project repo.

Keep secrets, provider tokens, channel credentials, auth profiles, and session transcripts out of committed workspaces. Prefer SecretRefs, Gateway env, provider auth flows, and tight permissions on `~/.openclaw`.

### Bootstrap Files

Use workspace files deliberately:

| File                   | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `AGENTS.md`            | Operating instructions, workflows, project constraints, red lines. |
| `SOUL.md`              | Personality, voice, values, interaction style.                     |
| `USER.md`              | User preferences and durable user context.                         |
| `IDENTITY.md`          | Agent identity details, name, role, surface-specific behavior.     |
| `TOOLS.md`             | Tool-use policy, approval expectations, allowed workflows.         |
| `HEARTBEAT.md`         | Background heartbeat instructions when heartbeats are enabled.     |
| `BOOTSTRAP.md`         | Brand-new workspace startup guidance.                              |
| `MEMORY.md`            | Short curated durable summary. Keep it concise.                    |
| `memory/YYYY-MM-DD.md` | Detailed daily notes retrievable by memory tools.                  |
| `skills/`              | Workspace-local skills.                                            |
| `canvas/`              | Canvas artifacts and related UI files.                             |

Keep injected files concise. Large bootstrap files are truncated by `bootstrapMaxChars` and `bootstrapTotalMaxChars`. Put detailed history in `memory/*.md` instead of stuffing `MEMORY.md`.

### System Prompt Assembly

OpenClaw owns and assembles the system prompt. Do not assume a runtime default prompt is used.

The prompt includes fixed sections for tooling, execution bias, safety, skills, OpenClaw control, workspace, documentation, injected workspace files, sandbox state, time zone, output directives, heartbeat, runtime, and reasoning. Provider plugins may contribute small provider-specific overlays, but should not replace the whole prompt.

Use `systemPromptOverride` only for controlled experiments because it replaces the assembled OpenClaw prompt. Prefer editing workspace files, identity, tool policy, prompt overlays, or per-agent config first.

## Config Patterns

### Minimal Specialized Agent

```json5
{
  agents: {
    list: [
      {
        id: "docs",
        name: "Docs Agent",
        workspace: "~/.openclaw/workspace-docs",
        agentDir: "~/.openclaw/agents/docs/agent",
        model: {
          primary: "anthropic/claude-opus-4-6",
          fallbacks: ["openai/gpt-5.4-mini"],
        },
        skills: ["docs-search"],
        identity: { name: "Docs", emoji: "DOCS" },
      },
    ],
  },
}
```

### Multi-Agent Routing

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

Binding specificity order for normal route bindings is peer, guild, team, exact account, wildcard account, then default agent. First match within the winning tier wins.

### Runtime Policy

Runtime policy belongs on providers or models, not on whole-agent runtime pins.

Use provider/model `agentRuntime` settings:

```json5
{
  models: {
    providers: {
      openai: { agentRuntime: { id: "codex" } },
    },
  },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-7": { agentRuntime: { id: "claude-cli" } },
        "vllm/*": { agentRuntime: { id: "openclaw" } },
      },
    },
  },
}
```

Whole-agent runtime keys such as `agents.defaults.agentRuntime`, `agents.list[].agentRuntime`, session runtime pins, and `OPENCLAW_AGENT_RUNTIME` are legacy/ignored by runtime selection. Recommend `openclaw doctor --fix` to clean stale values.

### Skill Visibility

Agent skill allowlists are final sets, not merge layers:

- Omit `agents.defaults.skills` for unrestricted skills by default.
- Set `agents.defaults.skills` for a shared default allowlist.
- Omit `agents.list[].skills` to inherit defaults.
- Set `agents.list[].skills` to replace defaults for that agent.
- Set `agents.list[].skills: []` for no visible skills.

Use per-agent skill allowlists when agents share the same machine skill roots but need different visible skills.

### Access Profiles

Common patterns:

| Profile          | Use when                                       | Key config                                                                                 |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Full personal    | Single trusted operator and private workspace. | `sandbox: { mode: "off" }` with locked-down channels.                                      |
| Read-only shared | Family/team helper can inspect but not mutate. | `sandbox.mode: "all"`, `workspaceAccess: "ro"`, deny write/exec/browser.                   |
| Public/messaging | Broad audience or public room.                 | `workspaceAccess: "none"`, messaging tools only, deny fs/exec/browser/canvas/gateway/cron. |

For any agent exposed to untrusted or semi-trusted input, prefer sandboxing, narrow tools, pairing or allowlists, mention-gated groups, and `session.dmScope: "per-channel-peer"` or `"per-account-channel-peer"`.

## CLI Commands To Use

Use the `openclaw-cli` skill for exact command inventory. For agent creation answers, these are the usual command surfaces:

```bash
openclaw agents add docs --workspace ~/.openclaw/workspace-docs
openclaw agents list --bindings --json
openclaw agents bind docs --channel slack --account work
openclaw agent --agent docs --message "Say ready and summarize your workspace files" --json
openclaw config validate --json
openclaw doctor --lint --json
openclaw security audit --json
```

If the docs or local CLI version differ, ask the user to run `openclaw agents --help`, `openclaw agents add --help`, or `openclaw config schema lookup agents.list` rather than inventing flags.

## Validation Checklist

Before saying an agent is ready:

- Config validates.
- Workspace path and bootstrap files exist.
- No secrets are placed in workspace files or committed repos.
- The selected model/provider has auth and is in the model catalog or provider list.
- Runtime policy is model/provider-scoped.
- Skill allowlist matches the agent's purpose.
- Tool policy and sandbox match the trust boundary.
- Channel DM/group policy is pairing, allowlist, or mention-gated unless public access is intentional.
- Session scope prevents cross-user context leakage for shared inboxes.
- `openclaw security audit` has no critical findings for the intended exposure.
- A test `openclaw agent --agent <id> --json` run succeeds before binding broad live channels.

## Security Defaults

- Start with the smallest tool set that works.
- Keep Gateway local or authenticated; do not expose it publicly without auth, firewalling, and a deliberate proxy plan.
- Treat channel tokens, auth profiles, session transcripts, `agentDir`, and `~/.openclaw` as sensitive.
- Treat skill folders and plugins as trusted code. Restrict who can edit them.
- For public or shared agents, deny `gateway`, `cron`, `sessions_spawn`, `sessions_send`, `exec`, `process`, filesystem mutation, browser, and canvas unless the use case explicitly requires them.
- Prompt guardrails are advisory. Hard boundaries come from channel policy, tool policy, exec approvals, sandboxing, host isolation, and separate Gateways.

## Honesty Notes

- OpenClaw docs evolve quickly. Use local `openclaw config schema lookup ...` and `openclaw <command> --help` as the final authority for installed versions.
- Some docs snippets render without line breaks on the site; preserve config semantics and format snippets cleanly.
- The async Firecrawl research job for these docs was still processing when this skill was authored; direct page scrapes supplied the source material.
