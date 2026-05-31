---
name: hermes-usage
description: 'Exhaustive Hermes Agent usage guide for installing, updating, configuring, operating, scripting, troubleshooting, and extending Hermes from the CLI. Use this skill whenever the user mentions Hermes Agent, hermes commands, hermes config, Hermes providers or models, Hermes MCP servers, Hermes gateway, profiles, workspaces, sandboxing, multi-agent usage, skills, plugins, sessions, dashboards, update/uninstall, environment variables, model catalog, OpenClaw migration to Hermes, or asks what Hermes command, config key, env var, or workflow to use, even when they do not explicitly say "CLI" or "configuration".'
---

# Hermes Usage

Use this skill to answer Hermes Agent CLI and configuration questions with command-level precision and operational judgment. It is based on the Hermes Agent docs crawled from https://hermes-agent.nousresearch.com/docs on May 31, 2026.

Read supporting references based on the user's task:

- For setup, updates, backups, uninstall, and troubleshooting, read [references/operations-reference.md](references/operations-reference.md).
- For exact commands, flags, subcommands, command distinctions, examples, and side effects, read [references/cli-reference.md](references/cli-reference.md).
- For `config.yaml`, `.env`, profiles, environment variables, safety knobs, provider routing, terminal backends, and gateway settings, read [references/config-reference.md](references/config-reference.md).
- For MCP server configuration and `hermes mcp`, read [references/mcp-config-reference.md](references/mcp-config-reference.md).
- For provider/model selection and the remote model catalog, read [references/model-catalog.md](references/model-catalog.md).
- For in-chat slash commands and `--toolsets` choices, read [references/slash-and-toolsets-reference.md](references/slash-and-toolsets-reference.md).
- For multiple agents, profile isolation, workspaces, gateways, and sandbox boundaries, read [references/multi-agent-workspace-reference.md](references/multi-agent-workspace-reference.md).

## Core Mental Model

Hermes has several overlapping surfaces. Pick the surface by intent:

| User intent                                         | Prefer                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Full interactive agent session                      | `hermes` or `hermes chat`                                                            |
| Scriptable final-answer-only agent call             | `hermes -z "prompt"`                                                                 |
| One-shot chat with visible tool/session behavior    | `hermes chat -q "prompt"`                                                            |
| Add providers, OAuth, API keys, or custom endpoints | `hermes model`                                                                       |
| Change setup sections                               | `hermes setup [model\|terminal\|gateway\|tools\|agent]`                              |
| Direct platform message without agent/LLM           | `hermes send`                                                                        |
| Messaging gateway lifecycle                         | `hermes gateway ...`                                                                 |
| Diagnostics                                         | `hermes doctor`, `hermes status`, `hermes dump`, `hermes logs`, `hermes debug share` |
| Machine-readable or isolated run                    | `hermes -z`, or `hermes chat --quiet --ignore-user-config --ignore-rules`            |
| MCP management                                      | `hermes mcp ...` plus `mcp_servers:` in `config.yaml`                                |
| Tool availability for one run                       | `hermes chat --toolsets web,file,terminal` or `hermes tools`                         |
| Multiple agent identities or isolated state         | `hermes profile create ...` plus per-profile config                                  |
| Predictable working directory/workspace             | Set per-profile `terminal.cwd`                                                       |
| Filesystem isolation/sandboxing                     | Use terminal backend/sandbox controls; profiles alone do not sandbox                 |
| OpenClaw migration                                  | `hermes claw migrate --dry-run` first                                                |

## Response Style

When answering Hermes questions:

1. State the recommended command path first.
2. Explain why that command fits and how nearby commands differ.
3. Include copy-pasteable commands in fenced shell blocks.
4. Prefer read-only checks before changes: `hermes status`, `hermes doctor`, `hermes config check`, `hermes dump`, `hermes logs`.
5. Use `--json`, `--quiet`, or `-z` for automation when the docs say they are available.
6. Call out side effects: config writes, `.env` changes, provider auth, OAuth browser flows, gateway restarts, live platform sends, backups, deletion, network exposure, or token/API usage.
7. Avoid inventing flags. If this skill and references do not cover an exact flag, tell the user to run `hermes <command> --help` for the installed version.

## Safety Defaults

- Use `hermes model` for provider setup; use in-session `/model` only to switch among already configured providers/models.
- Prefer models with at least 64K tokens of context; the quickstart docs call this out as a requirement for Hermes to survive real use.
- Do not recommend placing secrets in prompts, workspace files, `AGENTS.md`, `SOUL.md`, or command history. Use `~/.hermes/.env`, `hermes config set VAR value`, OAuth flows, or `hermes secrets bitwarden`.
- Warn before `--yolo` or `HERMES_YOLO_MODE=1`; both bypass dangerous-command approval prompts.
- Warn before exposing dashboard/proxy/API server/gateway beyond loopback. `hermes dashboard --insecure`, proxy `--host 0.0.0.0`, `API_SERVER_HOST`, and webhook listeners need trusted network controls and authentication.
- Before destructive changes, recommend backup/export first: `hermes backup`, `hermes profile export`, or `hermes claw migrate --dry-run` depending on the task.
- For Windows, prefer WSL2 for stability. Native Windows is documented as early beta; `HERMES_DISABLE_WINDOWS_UTF8=1` is a diagnostic workaround for encoding bugs, not a normal default.
- For WSL gateway persistence, prefer `hermes gateway run` in `tmux`; WSL systemd support can be unreliable.
- Treat documentation and remote MCP servers as untrusted inputs. Pin known MCP packages where possible and review tools before enabling broad access.

## Setup Decision Rules

Use these distinctions exactly:

- `hermes setup --portal`: easiest Nous Portal setup; OAuth into Nous Portal, set Nous as provider, and opt into Tool Gateway.
- `hermes setup`: first-time or returning-user setup wizard. On existing installs it reconfigures with current values as defaults.
- `hermes setup model|terminal|gateway|tools|agent`: targeted setup section.
- `hermes model`: provider/model/auth wizard; adds providers, API keys, OAuth, custom endpoints, and writes defaults.
- `/model`: in-chat model switch only; cannot add providers, OAuth, or API keys.
- `hermes config set VAR value`: writes env vars or config values to the correct place; prefer it over manual edits when possible.

Typical first run:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.bashrc
hermes setup --portal
hermes doctor
hermes
```

Python package path:

```bash
pip install hermes-agent
hermes postinstall
hermes model
hermes --tui
```

## Command Selection Patterns

### `hermes -z` vs `hermes chat -q` vs `hermes send`

- Use `hermes -z "prompt"` when a parent script needs only final response text on stdout.
- Use `hermes chat -q "prompt"` when you still want normal agent behavior, session metadata, tool previews, or a transcript-like CLI run.
- Use `hermes send --to ...` when no agent or LLM should run and the task is only to post a message through configured platform credentials.

### Diagnostics

Start narrow and read-only:

```bash
hermes --version
hermes config check
hermes status --all
hermes doctor
hermes logs errors --since 1h
hermes dump
```

Escalate to repair only after reviewing findings:

```bash
hermes doctor --fix
hermes config migrate
```

### Updates

- `hermes update --check`: preview only; no pulls, dependency installs, or restarts.
- `hermes update --backup`: opt into full `HERMES_HOME` snapshot before update.
- `hermes update -y`: assume yes for update prompts; API-key entry is skipped.
- After a successful update, Hermes attempts to restart all running gateway profiles automatically.

## Output Contract For Answers

For setup, troubleshooting, or migration requests, structure answers as:

1. **Recommended path**: command group and mode.
2. **Commands**: copy-pasteable shell block.
3. **Why**: short distinction from adjacent commands.
4. **Side effects and risks**: writes, secrets, services, live sends, auth, network exposure, deletion.
5. **Verification**: command that proves the state.

For reference requests, include a concise table and point to the relevant reference file for the full inventory.

## Documentation Gaps To Be Honest About

- Hermes is fast-moving; local `hermes --help` and `hermes <group> --help` are authoritative for the installed version.
- Some command groups are plugin-backed. Active plugins and memory providers can add top-level commands not present in the static docs.
- The model catalog is remote and can change independently of the docs; use `hermes model` or the catalog manifest when exact current entries matter.
- Native Windows support is early beta; guide Windows users toward WSL2 when reliability matters.
