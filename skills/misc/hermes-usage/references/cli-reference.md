# Hermes CLI Reference

This reference summarizes the Hermes Agent terminal command docs crawled May 31, 2026. For installed-plugin additions and version-specific flags, use local `hermes --help` and `hermes <command> --help`.

## Global Entrypoint

```bash
hermes [global-options] <command> [subcommand/options]
```

Global options:

| Option                               | Purpose                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `--version`, `-V`                    | Show version and exit.                                                                         |
| `--profile <name>`, `-p <name>`      | Select Hermes profile for this invocation; overrides sticky default from `hermes profile use`. |
| `--resume <session>`, `-r <session>` | Resume a previous session by ID or title.                                                      |
| `--continue [name]`, `-c [name]`     | Resume the most recent session, or most recent session matching a title.                       |
| `--worktree`, `-w`                   | Start in an isolated git worktree for parallel-agent workflows.                                |
| `--yolo`                             | Bypass dangerous-command approval prompts. Treat as high risk.                                 |
| `--pass-session-id`                  | Include the session ID in the agent system prompt.                                             |
| `--ignore-user-config`               | Ignore `~/.hermes/config.yaml`; credentials in `.env` still load.                              |
| `--ignore-rules`                     | Skip auto-injection of `AGENTS.md`, `SOUL.md`, `.cursorrules`, memory, and preloaded skills.   |
| `--tui`                              | Launch TUI instead of classic CLI. Equivalent to `HERMES_TUI=1`.                               |
| `--dev`                              | With `--tui`, run TypeScript sources via `tsx` instead of prebuilt bundle. For contributors.   |

## Top-Level Commands

| Command                          | Purpose                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `hermes chat`                    | Interactive or one-shot chat with the agent.                                                 |
| `hermes model`                   | Provider/model/auth wizard. Adds providers, API keys, OAuth, custom endpoints.               |
| `hermes fallback`                | Manage fallback providers tried when primary model fails.                                    |
| `hermes gateway`                 | Run or manage the messaging gateway service.                                                 |
| `hermes proxy`                   | Local OpenAI-compatible proxy that attaches OAuth provider credentials.                      |
| `hermes lsp`                     | Manage Language Server Protocol integration for post-write diagnostics.                      |
| `hermes setup`                   | Setup wizard for all or part of the configuration.                                           |
| `hermes whatsapp`                | Configure and pair WhatsApp bridge.                                                          |
| `hermes slack`                   | Generate Slack app manifests.                                                                |
| `hermes auth`                    | Manage credential pools and OAuth flows.                                                     |
| `hermes login` / `hermes logout` | Deprecated; use `hermes auth`.                                                               |
| `hermes send`                    | Send one-shot message to a configured messaging platform; no agent loop, no LLM.             |
| `hermes secrets`                 | External secret source management; currently Bitwarden Secrets Manager.                      |
| `hermes migrate`                 | Diagnose and optionally rewrite `config.yaml` for retired models/deprecated settings.        |
| `hermes status`                  | Show agent, auth, and platform status.                                                       |
| `hermes cron`                    | Manage scheduled jobs.                                                                       |
| `hermes kanban`                  | Multi-profile collaboration board.                                                           |
| `hermes webhook`                 | Manage dynamic webhook subscriptions.                                                        |
| `hermes hooks`                   | Inspect, test, approve, or remove shell-script hooks from config.                            |
| `hermes doctor`                  | Diagnose config and dependency issues.                                                       |
| `hermes security audit`          | OSV.dev audit for venv, plugin requirements, and pinned MCP servers.                         |
| `hermes dump`                    | Shareable setup summary for support/debugging.                                               |
| `hermes prompt-size`             | Offline prompt/tool schema byte breakdown.                                                   |
| `hermes debug`                   | Upload or print logs/system info for support.                                                |
| `hermes backup`                  | Back up Hermes home directory to zip.                                                        |
| `hermes checkpoints`             | Inspect/prune/clear shadow git store used by `/rollback`.                                    |
| `hermes import`                  | Restore a Hermes backup zip.                                                                 |
| `hermes logs`                    | View, tail, and filter logs.                                                                 |
| `hermes config`                  | Show, edit, migrate, and query config files.                                                 |
| `hermes pairing`                 | Approve/revoke messaging pairing codes.                                                      |
| `hermes skills`                  | Browse, install, publish, audit, and configure skills.                                       |
| `hermes bundles`                 | Group skills under one slash command.                                                        |
| `hermes curator`                 | Background skill maintenance.                                                                |
| `hermes memory`                  | Configure external memory provider.                                                          |
| `hermes acp`                     | Run Hermes as an ACP stdio server for editor integration.                                    |
| `hermes mcp`                     | Manage MCP server configs and run Hermes as an MCP server.                                   |
| `hermes plugins`                 | Install, enable, disable, update, remove plugins.                                            |
| `hermes portal`                  | Nous Portal status, subscription link, and Tool Gateway routing.                             |
| `hermes tools`                   | Configure enabled tools per platform.                                                        |
| `hermes computer-use`            | Install/check cua-driver backend on macOS.                                                   |
| `hermes sessions`                | Browse, export, prune, rename, delete sessions.                                              |
| `hermes insights`                | Token/cost/activity analytics.                                                               |
| `hermes claw`                    | OpenClaw migration helpers.                                                                  |
| `hermes dashboard`               | Web dashboard for config, API keys, and sessions.                                            |
| `hermes profile`                 | Manage isolated Hermes instances, descriptions, aliases, exports, and profile distributions. |
| `hermes completion`              | Print shell completion scripts.                                                              |
| `hermes version`                 | Show version information.                                                                    |
| `hermes update`                  | Update git or pip installs.                                                                  |
| `hermes uninstall`               | Remove Hermes from the system.                                                               |

## `hermes chat`

```bash
hermes chat [options]
```

Common options:

| Option                                    | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-q`, `--query "..."`                     | One-shot non-interactive prompt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `-m`, `--model <model>`                   | Override model for this run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `-t`, `--toolsets <csv>`                  | Enable comma-separated toolsets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `--provider <provider>`                   | Force provider. Supported docs list includes `auto`, `openrouter`, `nous`, `openai-codex`, `copilot-acp`, `copilot`, `anthropic`, `gemini`, `google-gemini-cli`, `huggingface`, `novita`, `zai`, `kimi-coding`, `kimi-coding-cn`, `minimax`, `minimax-cn`, `minimax-oauth`, `kilocode`, `xiaomi`, `arcee`, `gmi`, `alibaba`, `alibaba-coding-plan` alias `alibaba_coding`, `deepseek`, `nvidia`, `ollama-cloud`, `xai` alias `grok`, `xai-oauth` alias `grok-oauth`, `qwen-oauth`, `bedrock`, `opencode-zen`, `opencode-go`, `azure-foundry`, `lmstudio`, `stepfun`, `tencent-tokenhub` aliases `tencent` and `tokenhub`. |
| `-s`, `--skills <name>`                   | Preload skills; repeat or comma-separate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `-v`, `--verbose`                         | Verbose output.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `-Q`, `--quiet`                           | Programmatic mode: suppress banner/spinner/tool previews.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `--image <path>`                          | Attach a local image to a single query.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `--resume <session>`, `--continue [name]` | Resume a session.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `--worktree`                              | Isolated git worktree for this run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--checkpoints`                           | Enable filesystem checkpoints before destructive file changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `--yolo`                                  | Skip approval prompts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `--pass-session-id`                       | Pass session ID into system prompt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--ignore-user-config`                    | Ignore `~/.hermes/config.yaml`; `.env` still loads.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--ignore-rules`                          | Skip rules/memory/preloaded skills.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--source <tag>`                          | Session source tag, default `cli`; use `tool` for third-party integrations hidden from user session lists.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--max-turns <N>`                         | Maximum tool-calling iterations; default 90 or `agent.max_turns`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Examples:

```bash
hermes
hermes chat -q "Summarize the latest PRs"
hermes chat --provider openrouter --model anthropic/claude-sonnet-4.6
hermes chat --toolsets web,terminal,skills
hermes chat --quiet -q "Return only JSON"
hermes chat --worktree -q "Review this repo and open a PR"
hermes chat --ignore-user-config --ignore-rules -q "Repro without my personal setup"
```

## `hermes -z`

Use `hermes -z` for scripts that need only final response text on stdout/stderr. It suppresses banner, spinner, tool previews, and `Session:` line.

```bash
hermes -z "What's the capital of France?"
answer=$(hermes -z "summarize this" < /path/to/file.txt)
hermes -z "..." --provider openrouter --model openai/gpt-5.5
HERMES_INFERENCE_MODEL=anthropic/claude-sonnet-4.6 hermes -z "..."
```

Use `hermes chat -q` instead when the user needs tool output or a normal transcript.

## `hermes model` And `/model`

`hermes model` runs in the terminal outside a chat session. Use it to add providers, run OAuth flows, enter/update API keys, select provider-specific model lists, configure custom/self-hosted endpoints, and save defaults to `config.yaml`.

```bash
hermes model
```

In-session `/model` only switches among already configured providers/models:

```text
/model
/model claude-sonnet-4
/model zai:glm-5
/model custom:qwen-2.5
/model custom
/model custom:local:qwen-2.5
/model openrouter:anthropic/claude-sonnet-4
/model claude-sonnet-4 --global
```

By default `/model` applies to the current session only. `--global` persists to `config.yaml`.

## `hermes setup`

```bash
hermes setup [model|tts|terminal|gateway|tools|agent] [--non-interactive] [--reset] [--quick] [--reconfigure] [--portal]
```

Sections:

| Section    | Purpose                             |
| ---------- | ----------------------------------- |
| `model`    | Provider and model setup.           |
| `terminal` | Terminal backend and sandbox setup. |
| `gateway`  | Messaging platform setup.           |
| `tools`    | Enable/disable tools per platform.  |
| `agent`    | Agent behavior settings.            |

Options:

| Option              | Purpose                                                                                |
| ------------------- | -------------------------------------------------------------------------------------- |
| `--quick`           | Returning-user mode: prompt only for missing/unset items.                              |
| `--non-interactive` | Use defaults and environment values without prompts.                                   |
| `--reset`           | Reset config to defaults before setup.                                                 |
| `--reconfigure`     | Back-compat alias; bare setup on existing install now reconfigures.                    |
| `--portal`          | OAuth into Nous Portal, set Nous provider, opt into Tool Gateway, skip rest of wizard. |

## `hermes gateway`

```bash
hermes gateway <subcommand>
```

Subcommands:

| Subcommand  | Purpose                                                      |
| ----------- | ------------------------------------------------------------ |
| `run`       | Run gateway foreground; recommended for WSL, Docker, Termux. |
| `start`     | Start installed systemd/launchd service.                     |
| `stop`      | Stop service or foreground process.                          |
| `restart`   | Restart service.                                             |
| `status`    | Show service status.                                         |
| `list`      | List all profiles and whether each gateway is running.       |
| `install`   | Install systemd or launchd service.                          |
| `uninstall` | Remove installed service.                                    |
| `setup`     | Interactive messaging-platform setup.                        |

Options:

| Option           | Applies to                 | Purpose                                                                                                 |
| ---------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `--all`          | `start`, `restart`, `stop` | Act on every profile's gateway. Useful after update.                                                    |
| `--no-supervise` | `run`                      | In s6-overlay Docker image, opt out of auto-supervision. Equivalent to `HERMES_GATEWAY_NO_SUPERVISE=1`. |

WSL pattern:

```bash
tmux new -s hermes 'hermes gateway run'
```

## `hermes portal`

```bash
hermes portal [status|open|tools]
```

| Subcommand | Purpose                                                      |
| ---------- | ------------------------------------------------------------ |
| `status`   | Default. Portal auth state and Tool Gateway routing summary. |
| `open`     | Open subscription page in browser.                           |
| `tools`    | List Tool Gateway partners and routing state.                |

## `hermes send`

Use for direct platform sends with no agent loop and no LLM.

```bash
hermes send --to <target> "message text"
hermes send --to <target> --file <path>
echo "message" | hermes send --to <target>
hermes send --list [platform]
```

Options:

| Option                    | Purpose                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `-t`, `--to <TARGET>`     | Target: `platform`, `platform:chat_id`, `platform:chat_id:thread_id`, or `platform:#channel-name`. |
| `-f`, `--file <PATH>`     | Read body from file. Pass `-` for stdin.                                                           |
| `-s`, `--subject <LINE>`  | Prepend subject/header line.                                                                       |
| `-l`, `--list [platform]` | List configured targets.                                                                           |
| `-q`, `--quiet`           | Suppress stdout on success; rely on exit code.                                                     |
| `--json`                  | Emit raw JSON result.                                                                              |

Exit codes: `0` success, `1` delivery/backend failure, `2` usage error.

Examples:

```bash
hermes send --to telegram "deploy finished"
echo "RAM 92%" | hermes send --to telegram:-1001234567890
hermes send --to discord:#ops --file /tmp/report.md
hermes send --to slack:#eng --subject "[CI]" --file build.log
hermes send --list
hermes send --list telegram
```

## `hermes auth`

Credential pools and OAuth:

```bash
hermes auth
hermes auth list
hermes auth list openrouter
hermes auth add openrouter --api-key sk-or-v1-xxx
hermes auth add anthropic --type oauth
hermes auth remove openrouter 2
hermes auth reset openrouter
hermes auth status anthropic
hermes auth logout anthropic
hermes auth spotify
```

Subcommands: `add`, `list`, `remove`, `reset`, `status`, `logout`, `spotify`. No subcommand launches interactive wizard.

## `hermes secrets`

External secret sources instead of storing API keys in `~/.hermes/.env`. Currently Bitwarden Secrets Manager.

```bash
hermes secrets bitwarden <subcommand>
hermes secrets bw <subcommand>
```

Subcommands:

| Subcommand | Purpose                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `setup`    | Install pinned `bws`, store access token, choose project. Supports `--project-id`, `--access-token`, `--server-url`. |
| `status`   | Show config, binary path/version, last fetch info.                                                                   |
| `sync`     | Fetch secrets and report changes. Add `--apply` to export into current shell env; default dry-run.                   |
| `install`  | Download and verify pinned `bws`; `--force` re-downloads.                                                            |
| `disable`  | Turn off Bitwarden integration.                                                                                      |

## `hermes config`

```bash
hermes config <subcommand>
```

Subcommands:

| Subcommand          | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `show`              | Show current config values.                      |
| `edit`              | Open `config.yaml` in editor.                    |
| `set <key> <value>` | Set a config value or env var in the right file. |
| `path`              | Print config file path.                          |
| `env-path`          | Print `.env` file path.                          |
| `check`             | Check for missing or stale config.               |
| `migrate`           | Add newly introduced options interactively.      |

## `hermes status`, `doctor`, `dump`, `debug`, `logs`

```bash
hermes status [--all] [--deep]
hermes doctor [--fix]
hermes dump [--show-keys]
hermes debug share [--lines N] [--expire days] [--local]
hermes logs [log_name] [options]
```

Status options:

| Option   | Purpose                                        |
| -------- | ---------------------------------------------- |
| `--all`  | Show all details in shareable redacted format. |
| `--deep` | Run deeper checks.                             |

Doctor:

| Option  | Purpose                                                |
| ------- | ------------------------------------------------------ |
| `--fix` | Attempt automatic repairs. Review first when possible. |

Dump:

| Option        | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| `--show-keys` | Show redacted API key prefixes instead of only set/not set. |

Logs:

| Option               | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `log_name`           | `agent` default, `errors`, `gateway`, or `list`. |
| `-n`, `--lines <N>`  | Lines to show; default 50.                       |
| `-f`, `--follow`     | Follow in real time.                             |
| `--level <LEVEL>`    | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. |
| `--session <ID>`     | Filter by session substring.                     |
| `--since <TIME>`     | Relative time: `30m`, `1h`, `2d`.                |
| `--component <NAME>` | `gateway`, `agent`, `tools`, `cli`, `cron`.      |

Examples:

```bash
hermes logs
hermes logs -f
hermes logs gateway -n 100
hermes logs --level WARNING --since 1h
hermes logs --session abc123
hermes logs errors --since 30m -f
hermes logs list
```

## `hermes prompt-size`

```bash
hermes prompt-size [--platform <name>] [--json]
```

Reports offline byte breakdown of system prompt, skills index, memory/profile, prompt tiers, and tool schemas. Use it when prompt budget or fixed payload size matters.

## `hermes lsp`

```bash
hermes lsp <subcommand>
```

Subcommands:

| Subcommand     | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `status`       | Service state, configured servers, install status.         |
| `list`         | Registry of supported servers; `--installed-only` filters. |
| `install <id>` | Install one server binary.                                 |
| `install-all`  | Install all known auto-install servers.                    |
| `restart`      | Tear down running clients; next edit respawns.             |
| `which <id>`   | Print resolved binary path.                                |

LSP is gated on git workspace detection and feeds diagnostics into post-write checks for `write_file` and `patch`.

## `hermes security audit`

```bash
hermes security audit [--json] [--fail-on <level>] [--skip-venv] [--skip-plugins] [--skip-mcp]
```

Scans Hermes venv packages, plugin requirements, and pinned `npx`/`uvx` MCP servers in `config.yaml`. It does not scan global packages or editor/browser extensions.

## `hermes proxy`

```bash
hermes proxy <subcommand>
```

| Subcommand  | Purpose                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `start`     | Foreground local OpenAI-compatible proxy. Flags include `--provider <nous | xai>`, `--host <addr>`, `--port <int>`. Defaults: provider `nous`, host `127.0.0.1`, port `8645`. |
| `status`    | Show upstream readiness.                                                  |
| `providers` | List proxy upstream providers.                                            |

Warn before binding proxy to `0.0.0.0`.

## `hermes slack`

```bash
hermes slack manifest
hermes slack manifest --write
hermes slack manifest --slashes-only
```

Flags:

| Flag                 | Default       | Purpose                                                                           |
| -------------------- | ------------- | --------------------------------------------------------------------------------- |
| `--write [PATH]`     | stdout        | Write manifest to file; bare `--write` writes `$HERMES_HOME/slack-manifest.json`. |
| `--name NAME`        | `Hermes`      | Bot display name.                                                                 |
| `--description DESC` | default blurb | App directory description.                                                        |
| `--slashes-only`     | off           | Emit only `features.slash_commands`.                                              |

Run again after `hermes update` to pick up new gateway commands.

## `hermes cron`

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|tick>
```

Subcommands:

| Subcommand       | Purpose                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `list`           | Show jobs.                                                                                                                 |
| `create` / `add` | Create scheduled job from prompt; repeat `--skill` to attach skills.                                                       |
| `edit`           | Update schedule, prompt, name, delivery, repeat count, skills; supports `--clear-skills`, `--add-skill`, `--remove-skill`. |
| `pause`          | Pause without deleting.                                                                                                    |
| `resume`         | Resume and compute next future run.                                                                                        |
| `run`            | Trigger on next scheduler tick.                                                                                            |
| `remove`         | Delete job.                                                                                                                |
| `status`         | Check scheduler.                                                                                                           |
| `tick`           | Run due jobs once and exit.                                                                                                |

## `hermes kanban`

```bash
hermes kanban [--board <slug>] <action> [options]
```

Global flag:

| Flag             | Purpose                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `--board <slug>` | Operate on a board. Resolution order: flag, `HERMES_KANBAN_BOARD`, current file, `default`. |

Common actions include `init`, `boards list/create/switch/show/rename/rm`, `create`, `list`, `show`, `assign`, `link`, `unlink`, `claim`, `comment`, `complete`, `block`, `schedule`, `unblock`, `archive`, `tail`, `dispatch`, `context`, `specify`, `decompose`, and `gc`.

Example:

```bash
hermes kanban boards create atm10-server --name "ATM10 Server"
hermes kanban --board atm10-server create "Restart server" --assignee ops
hermes kanban boards switch atm10-server
hermes kanban list
```

## `hermes webhook`

```bash
hermes webhook <subscribe|list|remove|test>
```

`subscribe` aliases `add`, `list` aliases `ls`, `remove` aliases `rm`.

```bash
hermes webhook subscribe <name> [options]
```

Subscribe options:

| Option              | Purpose                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `--prompt`          | Prompt template using `{dot.notation}` payload references.                       |
| `--events`          | Comma-separated accepted event types; empty means all.                           |
| `--description`     | Human-readable description.                                                      |
| `--skills`          | Comma-separated skill names to load.                                             |
| `--deliver`         | `log`, `telegram`, `discord`, `slack`, `github_comment`.                         |
| `--deliver-chat-id` | Delivery chat/channel ID.                                                        |
| `--secret`          | HMAC secret; generated if omitted.                                               |
| `--deliver-only`    | Skip agent and deliver rendered prompt literally; requires real delivery target. |

Subscriptions persist to `~/.hermes/webhook_subscriptions.json` and hot-reload without gateway restart.

## `hermes skills`

```bash
hermes skills <subcommand>
```

Subcommands:

| Subcommand  | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| `browse`    | Paginated registry browser.                                          |
| `search`    | Search registries.                                                   |
| `install`   | Install a skill.                                                     |
| `inspect`   | Preview before install.                                              |
| `list`      | List installed skills.                                               |
| `check`     | Check installed hub skills for upstream updates.                     |
| `update`    | Reinstall updated hub skills.                                        |
| `audit`     | Re-scan installed hub skills.                                        |
| `uninstall` | Remove hub-installed skill.                                          |
| `reset`     | Clear bundled skill `user_modified`; `--restore` replaces user copy. |
| `publish`   | Publish to registry.                                                 |
| `snapshot`  | Export/import skill configuration.                                   |
| `tap`       | Manage custom skill sources.                                         |
| `config`    | Interactive per-platform enable/disable.                             |

Examples:

```bash
hermes skills browse
hermes skills browse --source official
hermes skills search react --source skills-sh
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect official/security/1password
hermes skills install official/migration/openclaw-migration
hermes skills install skills-sh/anthropics/skills/pdf --force
hermes skills install https://sharethis.chat/SKILL.md
hermes skills install https://example.com/SKILL.md --name my-skill
hermes skills check
hermes skills update
hermes skills config
hermes skills reset google-workspace --restore --yes
```

Notes:

- `--force` can override non-dangerous policy blocks for third-party/community skills.
- `--force` does not override a `dangerous` scan verdict.
- `--source skills-sh`, `--source well-known`, and `--source browse-sh` cover public catalogs and site-provided indexes.

## `hermes bundles`

```bash
hermes bundles <subcommand>
```

Subcommands: `list`, `show <name>`, `create <name>`, `delete <name>`, `reload`.

Example:

```bash
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  -d "Backend feature work"
```

Bundles live under `~/.hermes/skill-bundles/<slug>.yaml` and become slash commands in chat.

## `hermes curator`

```bash
hermes curator <subcommand>
```

Subcommands include `status`, `run`, `run --background`, `run --dry-run`, `backup`, `rollback`, `rollback --list`, `pause`, `resume`, `pin`, `unpin`, `restore`, `archive`, `prune`, and `list-archived`.

Curator never touches bundled or hub-installed skills. Archives are recoverable; auto-deletion does not happen.

## `hermes fallback`

```bash
hermes fallback <subcommand>
```

Subcommands:

| Subcommand      | Purpose                                      |
| --------------- | -------------------------------------------- |
| `list` / `ls`   | Show fallback chain. Default when omitted.   |
| `add`           | Pick provider and model and append to chain. |
| `remove` / `rm` | Delete an entry.                             |
| `clear`         | Remove all fallback entries.                 |

## `hermes hooks`

```bash
hermes hooks <subcommand>
```

Subcommands: `list`/`ls`, `test <event>`, `revoke`/`remove`/`rm`, `doctor`.

Hooks are shell scripts declared in `~/.hermes/config.yaml`; first-use consent is stored in `~/.hermes/shell-hooks-allowlist.json`.

## `hermes memory`

```bash
hermes memory <subcommand>
```

Subcommands: `setup`, `status`, `off`.

Providers documented: honcho, openviking, mem0, hindsight, holographic, retaindb, byterover, supermemory. Only one external provider can be active at a time; built-in memory files remain active.

## `hermes acp`

```bash
hermes acp
hermes-acp
python -m acp_adapter
```

Starts Hermes as an ACP stdio server for editor integration. Install support first when needed:

```bash
pip install -e '.[acp]'
```

## `hermes mcp`

See [mcp-config-reference.md](mcp-config-reference.md).

## `hermes plugins`

```bash
hermes plugins [subcommand]
```

Subcommands:

| Subcommand                       | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| none                             | Composite interactive UI for general plugins and provider plugins. |
| `install <identifier> [--force]` | Install plugin from Git URL or `owner/repo`.                       |
| `update <name>`                  | Pull latest for installed plugin.                                  |
| `remove` / `rm` / `uninstall`    | Remove plugin.                                                     |
| `enable <name>`                  | Enable disabled plugin.                                            |
| `disable <name>`                 | Disable without removing.                                          |
| `list` / `ls`                    | List installed plugins.                                            |

Provider selections write to `config.yaml`: `memory.provider`, `context.engine`; disabled general plugins go under `plugins.disabled`.

## `hermes tools`

```bash
hermes tools [--summary]
```

Without `--summary`, opens interactive per-platform tool configuration UI.

## `hermes computer-use`

```bash
hermes computer-use <subcommand>
```

Subcommands:

| Subcommand          | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `install`           | Run upstream `cua-driver` installer on macOS.      |
| `install --upgrade` | Re-run installer even if already present.          |
| `status`            | Print whether `cua-driver` is on PATH and version. |

`hermes update` automatically re-runs installer if `cua-driver` is on PATH.

## `hermes sessions`

```bash
hermes sessions <subcommand>
```

Subcommands: `list`, `browse`, `export <output> [--session-id ID]`, `delete <session-id>`, `prune`, `stats`, `rename <session-id> <title>`.

## `hermes insights`

```bash
hermes insights [--days N] [--source platform]
```

Options: `--days <n>` default 30, `--source <platform>` such as `cli`, `telegram`, or `discord`.

## `hermes claw migrate`

OpenClaw migration helper. Preview first:

```bash
hermes claw migrate --dry-run
```

Options:

| Option                      | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `--dry-run`                 | Preview without writes.                                             |
| `--preset <name>`           | `full` or `user-data`. Secrets excluded unless `--migrate-secrets`. |
| `--overwrite`               | Overwrite existing Hermes files on conflicts.                       |
| `--migrate-secrets`         | Include API keys. Required even for `--preset full`.                |
| `--no-backup`               | Skip pre-migration zip snapshot of `~/.hermes/`.                    |
| `--source <path>`           | Source OpenClaw dir; default `~/.openclaw`.                         |
| `--workspace-target <path>` | Target for workspace instructions.                                  |
| `--skill-conflict <mode>`   | `skip`, `overwrite`, or `rename`.                                   |
| `--yes`                     | Skip confirmation.                                                  |

Examples:

```bash
hermes claw migrate --dry-run
hermes claw migrate --preset full
hermes claw migrate --preset full --migrate-secrets
hermes claw migrate --preset user-data --overwrite
hermes claw migrate --source /home/user/old-openclaw
```

## `hermes dashboard`

```bash
hermes dashboard [options]
```

Requires `pip install hermes-agent[web]`. Browser Chat tab requires `--tui` plus `pty` extra and a POSIX PTY environment such as Linux, macOS, or WSL2.

| Option       | Default     | Purpose                                                             |
| ------------ | ----------- | ------------------------------------------------------------------- |
| `--port`     | `9119`      | Web server port.                                                    |
| `--host`     | `127.0.0.1` | Bind address.                                                       |
| `--no-open`  | off         | Do not auto-open browser.                                           |
| `--tui`      | off         | Enable browser Chat tab behind PTY/WebSocket bridge.                |
| `--insecure` | off         | Allow non-localhost bind. Exposes dashboard credentials on network. |
| `--stop`     | off         | Stop running dashboard processes.                                   |
| `--status`   | off         | List dashboard processes.                                           |

Examples:

```bash
hermes dashboard
hermes dashboard --port 8080 --no-open
hermes dashboard --tui
```

## `hermes profile`

```bash
hermes profile <subcommand>
```

Subcommands:

| Subcommand                                                                                                        | Purpose                                           |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `list`                                                                                                            | List profiles.                                    |
| `use <name>`                                                                                                      | Set sticky default.                               |
| `create <name> [--clone] [--clone-all] [--clone-from <source>] [--no-alias] [--description "text"] [--no-skills]` | Create profile.                                   |
| `describe [<name>] [--text "text"] [--auto] [--overwrite] [--all]`                                                | Read, set, or auto-generate profile descriptions. |
| `delete <name> [-y]`                                                                                              | Delete profile.                                   |
| `show <name>`                                                                                                     | Details.                                          |
| `alias <name> [--remove] [--name NAME]`                                                                           | Wrapper scripts.                                  |
| `rename <old> <new>`                                                                                              | Rename profile.                                   |
| `export <name> [-o FILE]`                                                                                         | Export to `.tar.gz`.                              |
| `import <archive> [--name NAME]`                                                                                  | Import archive.                                   |
| `install <source> [--name N] [--alias] [--force] [-y]`                                                            | Install profile distribution.                     |
| `update <name> [--force-config] [-y]`                                                                             | Re-pull distribution while preserving user data.  |
| `info <name>`                                                                                                     | Distribution manifest.                            |

Examples:

```bash
hermes profile list
hermes profile create work --clone
hermes profile describe work --text "Work Slack profile with limited tools."
hermes profile describe --all --auto
hermes profile use work
hermes profile alias work --name h-work
hermes profile export work -o work-backup.tar.gz
hermes profile import work-backup.tar.gz --name restored
hermes profile install github.com/user/my-distro --alias
hermes profile update work
hermes -p work chat -q "Hello from work profile"
```

## `hermes completion`

```bash
hermes completion [bash|zsh|fish]
```

Examples:

```bash
hermes completion bash >> ~/.bashrc
hermes completion zsh >> ~/.zshrc
hermes completion fish > ~/.config/fish/completions/hermes.fish
```

## `hermes update`

```bash
hermes update [--gateway] [--check] [--no-backup] [--backup] [--yes]
```

Options:

| Option        | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `--gateway`   | Internal mode used by messaging `/update`; not a gateway restart flag. |
| `--check`     | Preview without pulling/installing/restarting.                         |
| `--no-backup` | Skip configured pre-update backup for this run.                        |
| `--backup`    | Create labeled `HERMES_HOME` snapshot before pulling. Default off.     |
| `--yes`, `-y` | Assume yes for prompts; API-key entry skipped.                         |

Exit codes: `0` success, `1` pull/install/post-install errors, `2` unexpected working-tree changes blocking `git pull`.

## Maintenance Commands

| Command                             | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `hermes version`                    | Print version information.                                    |
| `hermes update`                     | Update code/dependencies.                                     |
| `hermes postinstall`                | Bootstrap non-Python deps and setup after pip install/update. |
| `hermes uninstall [--full] [--yes]` | Remove Hermes; `--full` deletes config/data.                  |