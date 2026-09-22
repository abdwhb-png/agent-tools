# OpenClaw CLI Command Reference

This reference summarizes the OpenClaw CLI docs at https://docs.openclaw.ai/cli and related pages crawled on May 29, 2026. Use local `openclaw <command> --help` for installed-plugin additions and version-specific flags.

## Global Flags and Output Modes

Global flags:

| Flag                    | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `--dev`                 | Isolate state under `~/.openclaw-dev` and shift default ports. |
| `--profile <name>`      | Isolate state under `~/.openclaw-<name>`.                      |
| `--container <name>`    | Target a named container for execution.                        |
| `--no-color`            | Disable ANSI colors. `NO_COLOR=1` is also respected.           |
| `--update`              | Shorthand for `openclaw update` on source installs.            |
| `-V`, `--version`, `-v` | Print version and exit.                                        |

Output rules:

- TTY sessions get colors and progress indicators.
- OSC-8 hyperlinks render when supported, otherwise plain URLs are printed.
- Use `--json` for machine-readable output. Use `--plain` where the command supports it.
- Long-running commands may show progress indicators.

## Install and Verify

Requirements:

- Node 24 recommended, or Node 22.19+.
- macOS, Linux, native Windows, or WSL2. WSL2 is more stable on Windows.
- `pnpm` is only needed to build from source.

Recommended install:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Windows PowerShell:

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

Skip onboarding:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
```

Alternative package installs:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon

pnpm add -g openclaw@latest
pnpm approve-builds -g
openclaw onboard --install-daemon

bun add -g openclaw@latest
openclaw onboard --install-daemon
```

Verify:

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

If `openclaw` is not found, inspect Node/global package paths:

```bash
node -v
npm prefix -g
echo "$PATH"
```

## Setup and Onboarding

### `openclaw setup`

Initializes baseline config and workspace. Plain `setup` does not run full onboarding.

Options:

| Flag                       | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `--workspace <dir>`        | Agent workspace directory, default `~/.openclaw/workspace`. |
| `--wizard`                 | Run interactive onboarding.                                 |
| `--non-interactive`        | Run onboarding without prompts.                             |
| `--mode <local             | remote>`                                                    | Onboarding mode. |
| `--import-from <provider>` | Migration provider during onboarding.                       |
| `--import-source <path>`   | Source agent home for migration.                            |
| `--import-secrets`         | Import supported secrets.                                   |
| `--remote-url <url>`       | Remote Gateway WebSocket URL.                               |
| `--remote-token <token>`   | Remote Gateway token.                                       |

Any onboarding flag auto-triggers the wizard path.

Examples:

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token "$OPENCLAW_GATEWAY_TOKEN"
```

### `openclaw onboard`

Full guided setup for local or remote Gateway setup.

Examples:

```bash
openclaw onboard
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

Local mode covers model/auth setup, workspace, Gateway settings, channels, daemon install, health check, and skills. Remote mode only writes connection info for a remote Gateway and does not modify the remote host.

Important onboarding flags and concepts:

- `--flow quickstart`: minimal prompts and auto-generated gateway token.
- `--flow manual` or `advanced`: full port, bind, and auth prompts.
- `--flow import`: plugin-owned migration against a fresh setup.
- `--secret-input-mode ref`: write environment-backed or provider-backed SecretRefs instead of plaintext keys.
- `--gateway-token-ref-env <ENV_VAR>`: store gateway token as an env SecretRef. Requires a non-empty env var and cannot combine with `--gateway-token`.
- `--skip-health`: skip local Gateway health wait in automation.
- `--skip-bootstrap`: skip workspace bootstrap files.
- `OPENCLAW_LOCALE`: sets wizard locale. Supported wizard locales include `en`, `zh-CN`, and `zh-TW`.

Non-interactive custom provider:

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

SecretRef gateway token example:

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

### `openclaw configure`

Interactive targeted changes to an existing setup.

Sections: `workspace`, `model`, `web`, `gateway`, `daemon`, `channels`, `plugins`, `skills`, `health`.

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```

## Config Helpers

`openclaw config` supports non-interactive edits to `openclaw.json`. Without a subcommand it opens the configure wizard.

Common commands:

```bash
openclaw config file
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config validate
openclaw config validate --json
```

Path rules:

- Dot or bracket notation works.
- Quote bracket paths so shells do not expand them.
- Values parse as JSON5 when possible; otherwise strings.
- `--strict-json` requires JSON5 parsing.
- `--merge` merges into maps; `--replace` replaces the target value.

Assignment modes:

- Value mode: `openclaw config set <path> <value>`.
- SecretRef builder: `--ref-provider`, `--ref-source`, `--ref-id`.
- Provider builder for `secrets.providers.<alias>`.
- Batch mode with `--batch-json` or `--batch-file`.

Dry-run behavior:

- `--dry-run` validates changes without writing.
- `--dry-run --json` reports `ok`, operations, checks, refs checked, skipped exec refs, and structured errors.
- Exec SecretRef checks are skipped unless `--allow-exec` is passed.

Write safety:

- OpenClaw config writers validate the full post-change config before writing.
- Rejected payloads are saved beside the config as `openclaw.json.rejected.*`.
- Direct editor writes are allowed but treated as untrusted until validation passes.

## Gateway

Run foreground:

```bash
openclaw gateway
openclaw gateway run
```

Gateway startup rules:

- Gateway refuses to start unless `gateway.mode=local` is set, unless `--allow-unconfigured` is used for ad-hoc/dev runs.
- Binding beyond loopback without auth is blocked.
- Missing `gateway.mode` in an existing config is suspicious config damage; repair it rather than assuming local mode.

Service lifecycle:

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway restart --safe
openclaw gateway restart --safe --skip-deferral
openclaw gateway restart --force
openclaw gateway uninstall
```

Lifecycle options:

- `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`.
- `gateway restart`: `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`.
- `gateway stop`: `--disable`, `--json`.

Queries:

```bash
openclaw gateway health --url ws://127.0.0.1:18789
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc --json
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
openclaw gateway usage-cost --days 7 --json
openclaw gateway diagnostics export --output openclaw-diagnostics.zip --json
openclaw gateway discover --json
```

Use `gateway restart --safe` for normal operator restarts. Use `--force` only after inspecting blockers.

## Models

Common commands:

```bash
openclaw models status
openclaw models status --json
openclaw models status --probe
openclaw models list
openclaw models list --all --provider openai
openclaw models set <provider/model-or-alias>
openclaw models scan
```

Model status options include `--json`, `--plain`, `--check`, `--probe`, `--probe-provider`, `--probe-profile`, `--probe-timeout`, `--probe-concurrency`, `--probe-max-tokens`, and `--agent`.

Auth profile commands:

```bash
openclaw models auth add
openclaw models auth list --provider openai --json
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai-codex
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token --provider <id>
openclaw models auth login-github-copilot
```

Notes:

- `models set` accepts `provider/model` or aliases.
- `models list` is read-only and does not rewrite `models.json`.
- `models status --probe` runs real provider probes and may consume tokens or hit rate limits.
- For model IDs containing `/`, include the provider prefix, for example `openrouter/moonshotai/kimi-k2`.
- Pipe API keys or tokens on stdin in automation instead of passing secret values as arguments.

## Infer

`openclaw infer` is the canonical headless surface for provider-backed model, image, audio, TTS, video, web, and embedding workflows. `openclaw capability` is an alias.

Command tree highlights:

- `infer list`, `infer inspect`
- `infer model run|list|inspect|providers|auth login|auth logout|auth status`
- `infer image generate|edit|describe|describe-many|providers`
- `infer audio transcribe|providers`
- `infer tts convert|voices|providers|status|enable|disable|set-provider`
- `infer video generate|describe|providers`
- `infer web search|fetch|providers`
- `infer embedding create|providers`

Common examples:

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --prompt "Describe this image" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image edit --file ./logo.png --prompt "remove the background" --output-format png --background transparent --json
openclaw infer image describe --file ./receipt.jpg --prompt "Extract merchant, date, and total" --json
openclaw infer audio transcribe --file ./memo.m4a --language en --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --json
```

Behavior:

- Use `--json` for scripts.
- Use `--provider` or `--model provider/model` to force a backend.
- Stateless execution defaults to local. Gateway-managed state commands default to gateway.
- Local `model run` is a lean provider completion, not a full agent turn.
- `model run --file` accepts image files only; use audio/video infer commands for audio/video.
- `model run --gateway --model <provider/model>` requires trusted operator gateway credentials.
- JSON output has stable top-level fields: `ok`, `capability`, `transport`, `provider`, `model`, `attempts`, `outputs`, `error`.

## Agent Runs and Agents

### `openclaw agent`

Runs one agent turn through the Gateway, or embedded with `--local`.

At least one selector is needed: `--to`, `--session-key`, `--session-id`, or `--agent`.

Options include `--message`, `--to`, `--session-key`, `--session-id`, `--agent`, `--model`, `--thinking`, `--verbose`, `--channel`, `--reply-to`, `--reply-channel`, `--reply-account`, `--local`, `--deliver`, `--timeout`, and `--json`.

Examples:

```bash
openclaw agent --agent ops --message "Summarize logs" --json
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

Notes:

- Gateway mode falls back to embedded agent when the Gateway request fails.
- `--local` forces embedded execution up front and still preloads the plugin registry.
- `--json` keeps stdout parseable; diagnostics go to stderr.
- `--deliver` may include a `deliveryStatus` object with `sent`, `suppressed`, `partial_failed`, or `failed`.

### `openclaw agents`

Manages isolated agents, workspaces, auth, routing bindings, and identity.

Examples:

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents bindings --json
openclaw agents bind --agent work --bind telegram:* --bind discord:guild-a
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

Binding formats:

| Format                | Meaning                                               |
| --------------------- | ----------------------------------------------------- |
| `<channel>:*`         | All accounts on a channel.                            |
| `<channel>:<account>` | One account.                                          |
| `<channel>`           | Default account unless safely resolved by the plugin. |

Notes:

- `main` is reserved and cannot be added or deleted.
- Non-interactive `agents add` requires name and `--workspace`.
- `delete` moves workspace/state/session directories to Trash unless shared with another agent.
- Use config `agents.defaults.skills` and `agents.list[].skills` for per-agent skill visibility.

## Channels and Messages

### `openclaw channels`

Manages channel accounts and runtime status.

Common commands:

```bash
openclaw channels list
openclaw channels list --all
openclaw channels status
openclaw channels status --probe --json
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane" --json
openclaw channels logs --channel all --lines 100 --json
openclaw channels add --channel telegram --token "$TELEGRAM_BOT_TOKEN"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

Notes:

- `channels list` shows chat channels and account configured/enabled state.
- `channels status --probe` runs live Gateway probes when reachable.
- Do not use `openclaw sessions` as a channel socket-health signal.
- `channels add` without flags opens guided setup and can optionally write agent routing bindings.
- `channels login` should be run from a terminal on the Gateway host; agent exec blocks interactive login flows.

### `openclaw message`

Outbound messages and channel actions.

Common flags: `--channel`, `--account`, `--target`, `--targets`, `--json`, `--dry-run`, `--verbose`.

Core actions:

- `send`, `broadcast`, `poll`, `react`, `reactions`, `read`, `edit`, `delete`, `pin`, `unpin`, `pins`, `permissions`, `search`
- `thread create|list|reply`
- `emoji list|upload`, `sticker send|upload`
- Discord role/channel/member/voice/event/moderation helpers

Examples:

```bash
openclaw message send --channel discord --target channel:123 --message "hi" --reply-to 456
openclaw message send --channel slack --target C123 --message "Deploy complete" --json
openclaw message poll --channel telegram --target @mychat --poll-question "Lunch?" --poll-option Pizza --poll-option Sushi --poll-duration-seconds 120 --silent
openclaw message react --channel slack --target C123 --message-id 456 --emoji "+1"
openclaw message broadcast --channel all --targets channel:C123 --message "Maintenance starts now" --dry-run
```

Target formats vary by provider. Examples include E.164 for WhatsApp/Signal, `channel:<id>` or `user:<id>` for Discord/Slack, `spaces/<id>` for Google Chat, Matrix room/user ids, Telegram chat ids/usernames/topic targets, and Teams conversation ids.

## Status, Health, Sessions, Tasks, Logs

Status:

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

Notes:

- Plain `status` is fast and read-only.
- `--deep` runs live probes for supported channels.
- `--usage` prints normalized provider usage windows as percent left.
- `status --json --all` includes deeper memory/plugin detail.

Tasks:

```bash
openclaw tasks list --runtime acp --status running --json
openclaw tasks show <lookup> --json
openclaw tasks notify <lookup> state_changes
openclaw tasks cancel <lookup>
openclaw tasks audit --json
openclaw tasks maintenance --json
openclaw tasks maintenance --apply --json
openclaw tasks flow list --json
openclaw tasks flow show <lookup> --json
openclaw tasks flow cancel <lookup>
```

Task status filters: `queued`, `running`, `succeeded`, `failed`, `timed_out`, `cancelled`, `lost`. Runtime filters: `subagent`, `acp`, `cron`, `cli`.

Doctor:

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --lint --json
openclaw doctor --lint --severity-min warning
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
```

Doctor postures:

| Posture | Command         | Behavior                                      |
| ------- | --------------- | --------------------------------------------- |
| Inspect | `doctor`        | Human checks and guided prompts.              |
| Repair  | `doctor --fix`  | Applies supported repairs.                    |
| Lint    | `doctor --lint` | Read-only structured findings for automation. |

Lint exit codes: `0` no findings at threshold, `1` findings, `2` command/runtime failure.

## Skills

`openclaw skills` inspects local skills, searches ClawHub, installs from ClawHub/Git/local directories, verifies ClawHub skills, and updates ClawHub-tracked installs.

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills install <slug> --global
openclaw skills update <slug>
openclaw skills update --all
openclaw skills verify <slug>
openclaw skills verify <slug> --card
openclaw skills list --eligible --json
openclaw skills info <name> --json
openclaw skills check --agent <id> --json
```

Notes:

- Git/local installs require `SKILL.md` at the source root.
- ClawHub installs support `--version`; Git/local installs do not.
- `--global` targets the shared managed skills directory and cannot combine with `--agent`.
- `update` only updates ClawHub-tracked installs.
- `verify` defaults to JSON and exits non-zero on fail decisions.

## Browser

Lifecycle:

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw start --headless
openclaw browser --browser-profile openclaw stop
openclaw browser --browser-profile openclaw reset-profile
```

Profiles:

```bash
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

Tabs and navigation:

```bash
openclaw browser tabs
openclaw browser tab new --label docs
openclaw browser open https://docs.openclaw.ai --label docs
openclaw browser focus docs
openclaw browser navigate https://example.com
openclaw browser snapshot --urls
openclaw browser screenshot --full-page
```

Actions:

```bash
openclaw browser click <ref>
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
```

State and debugging:

```bash
openclaw browser resize 1280 720
openclaw browser set device "iPhone 14"
openclaw browser cookies
openclaw browser storage local get
openclaw browser console --level error
openclaw browser requests --filter api
openclaw browser trace start
openclaw browser trace stop --out trace.zip
```

Prefer stable `suggestedTargetId`, tab ids, or labels over raw target ids.

## Sandbox, Approvals, Exec Policy

Sandbox commands:

```bash
openclaw sandbox explain
openclaw sandbox explain --agent work --json
openclaw sandbox list --json
openclaw sandbox list --browser
openclaw sandbox recreate --all
openclaw sandbox recreate --agent mybot
openclaw sandbox recreate --session main
openclaw sandbox recreate --browser
openclaw sandbox recreate --all --force
```

Use `sandbox recreate` after changing Docker images, sandbox config, SSH target/auth material, OpenShell source/policy/mode, or setup commands. For SSH and OpenShell remote mode, recreate deletes the canonical remote workspace for the selected scope; the next use seeds it again from the local workspace.

Approvals and exec policy:

```bash
openclaw approvals get
openclaw approvals get --gateway
openclaw approvals get --node <id|name|ip>
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --gateway --stdin < ./exec-approvals.json5
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist remove "~/Projects/**/bin/rg"
openclaw exec-policy show --json
openclaw exec-policy preset cautious --json
openclaw exec-policy preset yolo
openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

Notes:

- `approvals` targets local by default; `--gateway` and `--node` target remote host approvals.
- Host approvals files are the enforceable source of truth.
- `exec-policy` is local-only and updates local config plus local approvals together.
- `exec-policy preset yolo` means no approval prompts for trusted local automation; call out the risk.

## Security and Secrets

Security audit:

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw security audit --fix
openclaw security audit --json
```

Plain audit is cold config/filesystem/read-only. `--deep` includes live Gateway probes and plugin-owned collectors. `--fix` applies safe deterministic remediations such as tightening group policy, enabling sensitive log redaction, and tightening file permissions. It does not rotate secrets, disable tools, change gateway exposure, or remove plugins/skills.

Secrets loop:

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

Secret commands:

- `reload`: Gateway RPC that re-resolves refs and swaps runtime snapshot only on full success.
- `audit`: read-only scan for plaintext, unresolved refs, shadowed refs, generated-model residues, and legacy residues.
- `configure`: interactive planner for providers and target mappings.
- `apply`: execute a saved plan; dry-run validates only.

Exit codes for `secrets audit --check`: `1` on findings, `2` on unresolved refs.

Exec refs are skipped by default in dry-run/audit; pass `--allow-exec` only when execution is intentional.

## Backup and Uninstall

Backup:

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T08-00-00.000+08-00-openclaw-backup.tar.gz
```

Backups include state, config, credentials directory when external, auth profiles under agent state, sessions where valuable, and discovered workspaces unless excluded. Volatile live mutation files and nested plugin `node_modules` are skipped.

Uninstall:

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --service --yes --non-interactive
openclaw uninstall --state --workspace --yes --non-interactive
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

Options:

- `--service`: remove gateway service.
- `--state`: remove state and config.
- `--workspace`: remove workspace directories.
- `--app`: remove macOS app.
- `--all`: service, state, workspace, and app.
- `--yes`: skip confirmation.
- `--non-interactive`: disable prompts; requires `--yes`.
- `--dry-run`: print actions without removing files.

Always recommend `backup create` before removing state or workspaces.

## Other Command Groups From The CLI Index

The CLI index also lists:

- Setup/onboarding: `crestodian`, `completion`, `dashboard`.
- Reset/update: `reset`, `update`.
- Protocols: `acp`, `mcp`.
- Health/session: `health`, `sessions`.
- Gateway/logs/system: `logs`, `system`.
- Model/context: `memory`, `commitments`, `wiki`.
- Network/nodes: `directory`, `nodes`, `devices`, `node`.
- Runtime/TUI: `tui`, `chat`, `terminal`.
- Automation: `cron`, `hooks`, `webhooks`, `transcripts`.
- Discovery/docs: `dns`, `docs`.
- Pairing: `pairing`, `qr`.
- Plugins/proxy: `plugins`, `proxy`.
- Migration: `migrate`.
- Legacy aliases: `daemon`, `clawbot`.
- Optional plugin commands: `path`, `policy`, `voicecall`, and plugin-provided nested commands.

When details for these groups are needed and not already present here, use the local CLI help or the corresponding page under `https://docs.openclaw.ai/cli/<command>`.

## Common Troubleshooting Recipes

### Gateway will not start

```bash
openclaw config validate
openclaw config get gateway.mode
openclaw doctor --lint --json
openclaw gateway status --deep --json
```

If `gateway.mode` is missing, set it intentionally after validation:

```bash
openclaw config set gateway.mode local --dry-run
openclaw config set gateway.mode local
openclaw gateway restart --safe
```

### Channel looks disconnected

```bash
openclaw channels list
openclaw channels status --probe --json
openclaw channels capabilities --channel discord --target channel:<channel-id> --json
openclaw status --deep
openclaw doctor
```

Do not use sessions as socket health.

### Provider auth or model routing problem

```bash
openclaw models status --json
openclaw models auth list --provider openai --json
openclaw config get agents.defaults.model --json
openclaw infer model run --local --model openai/gpt-5.5 --prompt "Reply with exactly: pong" --json
```

Use `models status --probe` only when a live provider request is acceptable.

### SecretRef or plaintext secret cleanup

```bash
openclaw secrets audit --check --json
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
openclaw secrets reload --json
```

### Browser control failure

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

If start fails with reachability, debug CDP readiness. If tabs works but open/navigate fails, inspect navigation SSRF policy.