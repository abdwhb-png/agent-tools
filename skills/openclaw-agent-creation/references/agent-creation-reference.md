# OpenClaw Agent Creation Reference

This reference expands the `openclaw-agent-creation` skill with concrete design rules and configuration patterns gathered from the OpenClaw agent, agent workspace, multi-agent, agent runtimes, Gateway agents config, system prompt, skills config, and security docs.

## Agent Object Checklist

When creating or reviewing an `agents.list[]` entry, inspect these fields first:

| Field                    | Use                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | Stable required agent id. Use short lowercase IDs such as `main`, `work`, `docs`, `public`.                                       |
| `default`                | Makes the agent the default route. If multiple are true, first wins and logs a warning. If none are true, first agent is default. |
| `name`                   | Human-readable agent name.                                                                                                        |
| `workspace`              | Agent-facing working directory and bootstrap/memory/skills surface.                                                               |
| `agentDir`               | Runtime/private state directory for auth, sessions, native runtimes, and transcripts.                                             |
| `model`                  | Per-agent primary model string or `{ primary, fallbacks }`. String form is strict primary only.                                   |
| `models`                 | Optional per-agent model catalog/runtime overrides keyed by full provider/model ids.                                              |
| `params`                 | Per-agent provider parameters such as cache retention, temperature, or max tokens.                                                |
| `skills`                 | Optional final skill allowlist for this agent. Replaces defaults when set.                                                        |
| `skillsLimits`           | Optional per-agent skills prompt budget override.                                                                                 |
| `identity`               | Name, theme, emoji, avatar, ack defaults, mention derivation.                                                                     |
| `groupChat`              | Mention patterns and group-chat behavior.                                                                                         |
| `sandbox`                | Per-agent sandbox override.                                                                                                       |
| `tools`                  | Per-agent tool profile, allow/deny lists, elevated settings, sessions visibility.                                                 |
| `subagents`              | Which configured agents this agent may spawn or target.                                                                           |
| `heartbeat`              | Per-agent heartbeat behavior. When any agent defines heartbeat, only those agents run heartbeats.                                 |
| `contextInjection`       | Override bootstrap injection behavior.                                                                                            |
| `bootstrapMaxChars`      | Per-file injected bootstrap character cap.                                                                                        |
| `bootstrapTotalMaxChars` | Total injected bootstrap character cap.                                                                                           |
| `contextLimits`          | Runtime excerpt limits, memory_get sizing, tool result caps.                                                                      |

## Workspace Files

Default workspace is `OPENCLAW_WORKSPACE_DIR` when set, otherwise `~/.openclaw/workspace`. An explicit `agents.defaults.workspace` wins over the environment variable.

OpenClaw can automatically create bootstrap files unless `skipBootstrap` is set. Optional bootstrap file creation can be selectively skipped with `skipOptionalBootstrapFiles` for `SOUL.md`, `USER.md`, `HEARTBEAT.md`, and `IDENTITY.md`.

### File Roles

- `AGENTS.md`: Durable operating instructions, workflows, project rules, verification requirements, red lines, and collaboration norms. This is the main behavior contract.
- `SOUL.md`: Personality, voice, values, and style. Use this when the agent should feel distinct without changing tools or project rules.
- `USER.md`: User preferences, durable user facts, naming conventions, communication preferences, and recurring constraints.
- `IDENTITY.md`: Agent identity, role, account/channel-facing presentation, name, mission, and boundaries.
- `TOOLS.md`: Tool-use policy, approval expectations, risky-tool guidance, channel-specific send rules, and what tools should be avoided.
- `HEARTBEAT.md`: Instructions for periodic heartbeat agent turns.
- `BOOT.md` or `BOOTSTRAP.md`: Startup/bootstrap guidance for brand-new workspaces.
- `MEMORY.md`: Curated long-term summary. Keep this short.
- `memory/YYYY-MM-DD.md`: Detailed daily or session notes.
- `skills/`: Workspace-local skills.
- `canvas/`: Canvas artifacts.

### Prompt Injection Behavior

Bootstrap files are injected into the OpenClaw-owned system prompt depending on runtime and config.

Injected files normally include `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, and `MEMORY.md` when present. Sub-agent sessions only inject `AGENTS.md` and `TOOLS.md` to keep context small.

Native Codex handling is special: Codex discovers `AGENTS.md` itself, while OpenClaw forwards `SOUL.md`, `IDENTITY.md`, `TOOLS.md`, and `USER.md` as developer instructions. `HEARTBEAT.md` and `MEMORY.md` are not pasted into every Codex turn when memory tools or heartbeat behavior can handle them more cheaply.

### Context Budget Settings

Use these when an agent's prompt surface is too large:

```json5
{
  agents: {
    defaults: {
      contextInjection: "continuation-skip",
      bootstrapMaxChars: 12000,
      bootstrapTotalMaxChars: 60000,
      bootstrapPromptTruncationWarning: "always"
    },
    list: [
      {
        id: "large-docs",
        bootstrapMaxChars: 50000,
        bootstrapTotalMaxChars: 300000
      }
    ]
  }
}
```

`contextInjection` values:

- `always`: inject bootstrap files on every turn.
- `continuation-skip`: skip re-injection on safe continuation turns after completed assistant responses.
- `never`: disable workspace bootstrap/context-file injection. Use only for custom context engines or specialized bootstrap-free workflows.

## System Prompt Design

OpenClaw builds the system prompt for every run and does not rely on a runtime default prompt.

The assembled prompt includes sections such as:

- Tooling
- Execution Bias
- Safety
- Skills
- OpenClaw Control
- OpenClaw Self-Update
- Workspace
- Documentation
- Workspace Files
- Sandbox
- Current Date & Time
- Assistant Output Directives
- Heartbeats
- Runtime
- Reasoning

Provider plugins may replace a small set of core sections, add stable prefixes, or add dynamic suffixes. Use these for provider/model-family tuning, not for normal persona work.

Prefer this order for behavior changes:

1. `AGENTS.md` for durable operating behavior.
2. `SOUL.md` for personality.
3. `TOOLS.md` and tool config for tool behavior.
4. `identity` and `groupChat` for channel-facing identity.
5. `promptOverlays` for model-family style toggles.
6. `systemPromptOverride` only for controlled experiments.

## Model and Runtime Policy

Use explicit provider/model references where possible, such as `anthropic/claude-opus-4-6` or `openai/gpt-5.5`.

Model config can be a string or object:

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6", fallbacks: ["openai/gpt-5.4-mini"] }
    },
    list: [
      { id: "fast", model: "openai/gpt-5.4-mini" },
      { id: "strict", model: { primary: "anthropic/claude-opus-4-6", fallbacks: [] } }
    ]
  }
}
```

String form sets only a primary. Object form supports ordered fallback models.

### Runtime Precedence

Runtime policy belongs on providers or models:

```json5
{
  models: {
    providers: {
      openai: { agentRuntime: { id: "codex" } }
    }
  },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-7": { agentRuntime: { id: "claude-cli" } },
        "vllm/*": { agentRuntime: { id: "openclaw" } }
      }
    },
    list: [
      {
        id: "local",
        models: {
          "vllm/my-model": { agentRuntime: { id: "openclaw" } }
        }
      }
    ]
  }
}
```

Precedence is exact model policy first, then wildcard model policy, then provider-wide policy. Whole-agent runtime keys are legacy and ignored by runtime selection. `agentRuntime.id` can be `auto`, `openclaw`, registered plugin harness ids such as `codex`, or supported CLI backend aliases such as `claude-cli`.

Runtime policy controls text agent-turn execution only. Media generation, vision, PDF, music, video, and TTS use their own provider/model settings.

## Skills

OpenClaw skill roots include:

- `~/.openclaw/skills`
- `~/.agents/skills`
- `<workspace>/.agents/skills`
- `<workspace>/skills`
- bundled skills
- `skills.load.extraDirs`

Load precedence is workspace `skills`, workspace `.agents/skills`, personal `~/.agents/skills`, managed `~/.openclaw/skills`, bundled skills, then extra dirs.

Agent-specific skill visibility lives under `agents.defaults.skills` and `agents.list[].skills`:

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" },
      { id: "docs", skills: ["docs-search"] },
      { id: "locked-down", skills: [] }
    ]
  }
}
```

Rules:

- Omit defaults for unrestricted skills by default.
- Agent entries that omit `skills` inherit defaults.
- Agent entries with `skills` replace defaults.
- Empty list means no skills.

When a session is sandboxed, skill processes run inside the sandbox backend and do not inherit the host environment automatically. Configure sandbox env, mounted secret files, or custom images deliberately.

## Multi-Agent Routing

Use `bindings` to route channel/account/peer contexts to agents:

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" }
    ]
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } }
  ]
}
```

Binding match fields:

- `type`: optional; `route` by default, `acp` for persistent ACP conversation bindings.
- `match.channel`: required.
- `match.accountId`: optional; `*` means any account, omitted means default account.
- `match.peer`: optional `{ kind: direct|group|channel, id }`.
- `match.guildId`: optional.
- `match.teamId`: optional.
- `acp`: optional only for `type: "acp"`, with fields such as `mode`, `label`, `cwd`, `backend`.

Deterministic normal route order:

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. Exact `match.accountId` without peer/guild/team
5. `match.accountId: "*"`
6. Default agent

Within a tier, first matching binding wins. ACP bindings resolve by exact conversation identity and do not use the route tier order.

## Session and Inbox Isolation

Important session settings:

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "per-channel-peer",
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"]
    },
    reset: { mode: "daily", atHour: 4 },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow"
    }
  }
}
```

Recommendations:

- For shared inboxes, use `dmScope: "per-channel-peer"`.
- For multi-account channels, use `dmScope: "per-account-channel-peer"`.
- Use `identityLinks` only when intentionally sharing context across channel identities.
- Session isolation prevents context leakage, but it is not a host authorization boundary.

## Security Profiles

OpenClaw's supported security posture is personal assistant deployment: one trusted operator boundary per Gateway, possibly many agents. It is not a hostile multi-tenant isolation model.

### Full Personal Agent

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" }
      }
    ]
  }
}
```

Use only for trusted operator surfaces with locked-down channel access.

### Read-Only Shared Agent

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"]
        }
      }
    ]
  }
}
```

### Public or Messaging-Only Agent

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          sessions: { visibility: "tree" },
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"]
        }
      }
    ]
  }
}
```

### Baseline Hardening

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" }
  },
  session: { dmScope: "per-channel-peer" },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false }
  }
}
```

Use `openclaw security audit`, `openclaw security audit --deep`, `openclaw security audit --fix`, and `openclaw security audit --json` during setup and after changing exposure.

## Sandbox Design

Agent sandbox config lives under `agents.defaults.sandbox` or `agents.list[].sandbox`:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        backend: "docker",
        scope: "agent",
        workspaceAccess: "none",
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          network: "none",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          capDrop: ["ALL"],
          memory: "1g",
          cpus: 1
        }
      }
    }
  }
}
```

Important choices:

- `mode`: `off`, `non-main`, or `all`.
- `backend`: `docker`, `ssh`, or `openshell`.
- `scope`: `session`, `agent`, or `shared`.
- `workspaceAccess`: `none`, `ro`, or `rw`.
- Docker defaults to no network; set bridge/custom network only when needed.
- `host` network and container namespace joins are blocked unless dangerous break-glass flags are set.

For shared or untrusted surfaces, prefer `mode: "all"`, `workspaceAccess: "none"` or `"ro"`, and a narrow tools allowlist.

## Channel Access and Trigger Policy

Decide who can trigger the agent before binding it to channels.

DM policy options:

- `pairing`: default; unknown senders receive pairing code and are ignored until approved.
- `allowlist`: unknown senders are blocked.
- `open`: public DMs; requires explicit wildcard allowlist.
- `disabled`: ignore DMs.

Group patterns:

- Prefer group allowlists.
- Require mentions in groups by default.
- Replying to a bot message should not bypass sender allowlists.
- Use `contextVisibility: "allowlist"` or `"allowlist_quote"` if quoted or historical context from non-allowlisted users should be filtered.

For public agents, do not combine open inbound access with filesystem, shell, browser, gateway, cron, or broad session tools.

## CLI and Validation Commands

Prefer using `openclaw config` or `openclaw agents` commands over direct file editing when possible.

Common workflow:

```bash
openclaw agents add docs --workspace ~/.openclaw/workspace-docs
openclaw agents list --bindings --json
openclaw config validate --json
openclaw agent --agent docs --message "Confirm your identity and list your visible skills" --json
openclaw doctor --lint --json
openclaw security audit --json
```

Routing workflow:

```bash
openclaw agents bind docs --channel slack --account work
openclaw agents list --bindings --json
openclaw channels status --probe --json
```

Schema/help fallback:

```bash
openclaw agents --help
openclaw agents add --help
openclaw config schema lookup agents.list
openclaw config schema lookup bindings
openclaw config schema lookup agents.defaults.sandbox
```

Use the `openclaw-cli` skill for exhaustive flags and command-specific troubleshooting.

## Creation Review Template

When reviewing a user's proposed agent, answer these questions:

1. What is the trust boundary?
2. Is this one agent or multiple agents?
3. What exact workspace and agentDir should be used?
4. Which bootstrap files define behavior?
5. Is the model explicit and authenticated?
6. Is runtime policy configured at provider/model scope?
7. What skills are visible?
8. What tools are allowed and denied?
9. Is sandboxing appropriate for this exposure?
10. Who can trigger the agent on each channel?
11. How are sessions isolated for multi-user DMs or groups?
12. What command proves the agent works before live exposure?
13. What `doctor` or `security audit` finding remains?

## Common Mistakes

- Treating an agent as only a model alias.
- Putting secrets in `AGENTS.md`, `SOUL.md`, workspace `.env`, or committed files.
- Using multiple agents for hostile multi-tenant isolation instead of separate Gateways.
- Forgetting that `agents.list[].skills` replaces defaults rather than merging.
- Setting legacy whole-agent runtime keys instead of provider/model `agentRuntime`.
- Enabling public DMs or group access before narrowing tools.
- Assuming prompt guardrails enforce security. They are advisory.
- Leaving `MEMORY.md` huge and relying on injected prompt context instead of memory tools.
- Binding channels before validating `openclaw agent --agent <id> --json`.
- Giving shared agents access to personal browser profiles or personal credentials.