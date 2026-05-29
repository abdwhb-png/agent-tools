---
name: openclaw-cli
description: Exhaustive OpenClaw CLI usage guide for installing, onboarding, configuring, diagnosing, securing, operating, and automating OpenClaw from the command line. Use this skill whenever the user mentions OpenClaw, openclaw commands, OpenClaw Gateway, OpenClaw agents, OpenClaw channels, OpenClaw models, OpenClaw infer, OpenClaw skills, OpenClaw browser control, sandboxing, approvals, secrets, diagnostics, backups, updates, uninstalling, or asks what OpenClaw CLI command or flags to run, even if they do not explicitly say "CLI".
---

# OpenClaw CLI

Use this skill to answer OpenClaw CLI questions with command-level precision and operational judgment. It is based on the OpenClaw CLI docs crawled from https://docs.openclaw.ai/cli and related pages on May 29, 2026.

Read [references/command-reference.md](references/command-reference.md) when the user needs exact commands, flags, examples, troubleshooting, or a broad command inventory.

## Core Mental Model

OpenClaw's CLI is organized around four broad jobs:

1. Set up and maintain the local or remote OpenClaw environment.
2. Run agent, model, media, web, browser, messaging, and automation workflows.
3. Inspect health, sessions, tasks, logs, usage, security, and secrets.
4. Manage runtime boundaries: agents, channels, gateways, nodes, sandboxes, approvals, and skills.

Choose commands by intent, not by keyword similarity:

| User intent                                    | Prefer                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| Fresh install                                  | Installer script, then `openclaw onboard --install-daemon` or `openclaw setup`    |
| Baseline config/workspace only                 | `openclaw setup`                                                                  |
| Full guided first run                          | `openclaw onboard`                                                                |
| Targeted reconfiguration                       | `openclaw configure --section <section>` or `openclaw config ...`                 |
| Channel account setup                          | `openclaw channels add`                                                           |
| Send one full agent turn                       | `openclaw agent ...`                                                              |
| Run a raw provider-backed model/media/web task | `openclaw infer ...`                                                              |
| Send outbound chat/channel actions             | `openclaw message ...`                                                            |
| Diagnose current state quickly                 | `openclaw status`, then `openclaw doctor`                                         |
| Scriptable health gate                         | `openclaw doctor --lint --json` or `openclaw gateway status --require-rpc --json` |
| Inspect or repair security posture             | `openclaw security audit`, `openclaw secrets audit`, `openclaw doctor`            |
| Manage isolated agents                         | `openclaw agents ...`                                                             |
| Manage skills                                  | `openclaw skills ...`                                                             |
| Browser automation through OpenClaw            | `openclaw browser ...`                                                            |
| Destructive reset/removal                      | `openclaw backup create` first, then `reset` or `uninstall`                       |

## Response Style

When answering OpenClaw CLI questions:

1. State the recommended command path first.
2. Explain why that command fits the intent and why adjacent commands do not.
3. Include exact commands in fenced shell blocks.
4. Use `--json` for automation, parsing, or CI examples.
5. Call out side effects: config writes, service changes, credential storage, workspace deletion, gateway restarts, live provider probes, token usage, or channel sends.
6. For risky operations, give a dry-run, backup, or read-only check first.
7. Avoid inventing flags. If the exact flag is not in this skill or the reference, say to run `openclaw <command> --help` or consult the docs.

## Safety Defaults

- Prefer read-only commands before mutating commands: `status`, `doctor --lint`, `security audit`, `secrets audit`, `config validate`, `backup create --dry-run`.
- Prefer `--dry-run` when available before config, backup, uninstall, message, or secrets changes.
- Prefer `--json` when another tool, script, or agent will parse output.
- Do not pass secrets inline when a safer path exists. Prefer environment variables, SecretRefs, stdin, or interactive prompts.
- For `models status --probe`, `infer ...`, `channels status --probe`, and live provider checks, warn that real requests may consume tokens, hit rate limits, or touch live services.
- Before `uninstall --state`, `uninstall --workspace`, `reset`, `sandbox recreate`, or broad `doctor --fix`, recommend a backup or dry-run.
- For gateway exposure, keep auth enabled. Binding beyond loopback without auth is blocked by OpenClaw and should not be recommended.
- For `exec-policy preset yolo` or approvals with `ask: off`, explain that this changes host execution approvals and should only be used in trusted automation.

## Setup Decision Rules

Use these exact distinctions:

- `openclaw setup`: creates baseline config and workspace. Plain setup does not walk full onboarding.
- `openclaw onboard`: full guided setup for model auth, workspace, gateway, channels, daemon, skills, and health.
- `openclaw configure`: targeted changes to an existing setup. Use `--section` for workspace, model, web, gateway, daemon, channels, plugins, skills, or health.
- `openclaw channels add`: channel-only account setup after baseline exists.
- `openclaw config`: non-interactive config get/set/patch/unset/file/schema/validate. Running `openclaw config` without a subcommand opens the configure flow.

Typical first-run answer:

```bash
openclaw --version
openclaw onboard --install-daemon
openclaw doctor
openclaw gateway status
```

Scripted remote setup pattern:

```bash
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token "$OPENCLAW_GATEWAY_TOKEN"
openclaw gateway status --require-rpc --json
```

## Command Selection Patterns

### Agent vs Infer vs Message

- Use `openclaw agent` for a full agent turn with session routing, model override, thinking level, delivery metadata, and optional Gateway or local embedded execution.
- Use `openclaw infer` for raw provider-backed capabilities: model run, image generation/edit/description, audio transcription, TTS, video, web search/fetch, and embeddings. This is the right smoke-test surface for providers because it does not load the full agent tool/session context.
- Use `openclaw message` for outbound channel actions: send, broadcast, poll, react, read, edit, delete, pin, thread, emoji, sticker, role, channel, member, voice, event, and moderation commands.

Examples:

```bash
openclaw agent --agent ops --message "Summarize the incident log" --json
openclaw infer model run --prompt "Reply with exactly: pong" --model openai/gpt-5.5 --json
openclaw message send --channel slack --target channel:C123 --message "Deploy complete" --json
```

### Status, Doctor, Security, Secrets

- `openclaw status`: fast diagnostics for channels, sessions, usage, Gateway overview, and provider quota snapshots.
- `openclaw status --deep`: live probes for supported channels.
- `openclaw doctor`: health checks and guided repair prompts.
- `openclaw doctor --lint --json`: read-only CI/preflight diagnostics with stable findings and exit codes.
- `openclaw security audit --json`: security posture and policy findings.
- `openclaw secrets audit --check`: plaintext, unresolved refs, shadowed refs, and legacy residue gate.

Automation gate example:

```bash
openclaw config validate --json
openclaw doctor --lint --severity-min warning --json
openclaw security audit --json
openclaw secrets audit --check --json
```

### Config and SecretRef Edits

Prefer `openclaw config set` and `openclaw config patch` over editing `openclaw.json` directly. They validate the post-change config and leave the active config untouched if validation fails.

Use dot or bracket paths, quoting bracket paths in shells:

```bash
openclaw config get agents.defaults.workspace
openclaw config get 'agents.list[0].id'
openclaw config set gateway.port 19001 --strict-json --dry-run
openclaw config set gateway.port 19001 --strict-json
openclaw config validate
```

Use SecretRef builder flags for supported credential surfaces:

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run
```

Use `--allow-exec` only when intentionally allowing dry-run or audit commands to execute configured exec SecretRefs.

### Gateway Operations

- `openclaw gateway` and `openclaw gateway run`: foreground local Gateway.
- `openclaw gateway install/start/stop/restart/uninstall`: managed service lifecycle.
- `openclaw gateway status --require-rpc --json`: prove service plus read-scope RPC health.
- `openclaw gateway probe --json`: debug explicit, configured remote, and local loopback targets.
- `openclaw gateway restart --safe`: coordinated restart after active work drains.
- `openclaw gateway restart --force`: immediate operator override.

Do not recommend stop plus start as a restart substitute. Use `gateway restart`.

### Browser Automation

Use `openclaw browser` when OpenClaw's Gateway-backed browser control surface is the task target. Prefer stable tab labels or `suggestedTargetId` over raw target IDs.

Basic sequence:

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com --label docs
openclaw browser --browser-profile openclaw snapshot --urls
```

If `start` fails with not reachable after start, investigate CDP readiness. If `start` and `tabs` work but navigation fails, suspect navigation SSRF policy.

## Troubleshooting Flow

Use this order unless the user gives a more specific symptom:

1. Verify CLI availability: `openclaw --version`.
2. Validate config: `openclaw config validate`.
3. Check Gateway service and RPC: `openclaw gateway status --require-rpc --json`.
4. Check broad health: `openclaw status`, then `openclaw status --deep` if live probes are needed.
5. Run doctor read-only: `openclaw doctor --lint --json`.
6. Run targeted diagnostics: `channels status --probe`, `models status --probe`, `browser doctor --deep`, `tasks audit`, or `security audit`.
7. Apply repairs only after reviewing findings: `doctor --fix`, `security audit --fix`, `secrets apply`, `sandbox recreate`, or service reinstall.

## Output Contract For Answers

For setup or troubleshooting requests, structure answers as:

1. **Recommended path**: the command group and mode.
2. **Commands**: copy-pasteable shell block.
3. **Why**: one short explanation that distinguishes alternatives.
4. **Side effects and risks**: config writes, service changes, credential handling, token use, channel sends, or deletion.
5. **Verification**: the command that proves it worked.

For command reference requests, include a concise table and point to [references/command-reference.md](references/command-reference.md) for the full inventory.

## Documentation Gaps To Be Honest About

- The CLI index lists many command groups whose per-command details are on separate pages; if a rare subcommand is not covered in this skill, consult `openclaw <group> --help` or the linked docs page.
- Plugin-owned commands can add additional top-level or nested commands. Treat the local `openclaw --help` output as authoritative for installed plugins.
- Some docs examples were rendered without line breaks by the docs site; preserve command semantics but format examples cleanly when answering.
