# Mapping And Gaps

Use this reference to explain what `hermes claw migrate` imports automatically, what it archives, and what the user must rebuild manually.

## Source Detection

Default source:

```text
~/.openclaw/
```

Legacy directories detected automatically:

```text
~/.clawdbot/
~/.moltbot/
```

Legacy config filenames detected automatically:

```text
clawdbot.json
moltbot.json
```

Non-default source:

```bash
hermes claw migrate --source /path/to/openclaw --dry-run
```

## Persona, Memory, Instructions

| OpenClaw source         | Hermes destination                  | Notes                                                         |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `workspace/SOUL.md`     | `~/.hermes/SOUL.md`                 | Direct copy.                                                  |
| `workspace/AGENTS.md`   | `AGENTS.md` in `--workspace-target` | Requires `--workspace-target`; otherwise archive/manual copy. |
| `workspace/MEMORY.md`   | `~/.hermes/memories/MEMORY.md`      | Parsed into entries, merged, deduped.                         |
| `workspace/USER.md`     | `~/.hermes/memories/USER.md`        | Same entry merge logic.                                       |
| `workspace/memory/*.md` | `~/.hermes/memories/MEMORY.md`      | Daily files merged into main memory.                          |

Fallback workspace paths checked by migration include `workspace.default/`, `workspace-main/`, and `workspace-<agentId>/` patterns.

Manual concern from field reports: memory migration is not the same as operational recall. After migration, verify concrete facts and deployed service locations; do not assume external memory providers or merged markdown will keep every workflow front-and-center.

## Skills

Sources:

| Source                 | OpenClaw location           | Hermes destination                   |
| ---------------------- | --------------------------- | ------------------------------------ |
| Workspace skills       | `workspace/skills/`         | `~/.hermes/skills/openclaw-imports/` |
| Managed/shared skills  | `~/.openclaw/skills/`       | `~/.hermes/skills/openclaw-imports/` |
| Personal cross-project | `~/.agents/skills/`         | `~/.hermes/skills/openclaw-imports/` |
| Project-level shared   | `workspace/.agents/skills/` | `~/.hermes/skills/openclaw-imports/` |

Conflict modes:

| Mode        | Behavior                                   | Use when                                                 |
| ----------- | ------------------------------------------ | -------------------------------------------------------- |
| `skip`      | Keep existing Hermes skill.                | You trust Hermes built-in or want baseline first.        |
| `overwrite` | Replace Hermes skill with OpenClaw import. | You intentionally prefer your customized OpenClaw skill. |
| `rename`    | Import as a renamed copy.                  | Safest default for custom skills.                        |

Real migration concern: many skills are more OpenClaw-specific than they look. They may reference OpenClaw tool names, OpenClaw CLI commands, `~/.openclaw`, old gateway behavior, or overlapping built-ins. For core workflows, audit each imported skill before cutover.

Skill triage pattern:

```bash
find ~/.hermes/skills/openclaw-imports -maxdepth 2 -name SKILL.md -print
grep -R "openclaw\|~/.openclaw\|OpenClaw" ~/.hermes/skills/openclaw-imports || true
```

Then classify each skill:

| Class                              | Action                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| Still generic                      | Keep and test.                                                   |
| Better replaced by Hermes built-in | Disable/import skip or remove from active flow.                  |
| OpenClaw-specific but important    | Rewrite for Hermes tools/config.                                 |
| Complex pipeline skill             | Rebuild as a Hermes-native workflow with small validation tests. |

## Model And Provider Config

| OpenClaw path               | Hermes destination                  | Notes                             |
| --------------------------- | ----------------------------------- | --------------------------------- |
| `agents.defaults.model`     | `config.yaml` -> `model`            | String or `{primary, fallbacks}`. |
| `models.providers.*`        | `config.yaml` -> `custom_providers` | Maps `baseUrl`, `apiType`/`api`.  |
| `models.providers.*.apiKey` | `~/.hermes/.env`                    | Requires `--migrate-secrets`.     |

Supported API key targets from the docs include:

```text
OPENROUTER_API_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
DEEPSEEK_API_KEY
GEMINI_API_KEY
ZAI_API_KEY
MINIMAX_API_KEY
ELEVENLABS_API_KEY
TELEGRAM_BOT_TOKEN
VOICE_TOOLS_OPENAI_KEY
```

Keys outside the allowlist are not copied automatically.

API key resolution order when `--migrate-secrets` is enabled:

1. Config values such as `models.providers.*.apiKey` and TTS provider keys.
2. `~/.openclaw/.env`.
3. `openclaw.json` `env` or `env.vars` sub-object.
4. `~/.openclaw/agents/main/agent/auth-profiles.json`.

Secret formats resolved automatically:

```json
"plain-token"
"${TELEGRAM_BOT_TOKEN}"
{ "source": "env", "id": "TELEGRAM_BOT_TOKEN" }
```

SecretRefs with `source: "file"` or `source: "exec"` are not automatically resolved; add them manually with `hermes config set` or an appropriate Hermes secrets flow.

## Agent Behavior

| OpenClaw path                          | Hermes path                 | Mapping                                |
| -------------------------------------- | --------------------------- | -------------------------------------- |
| `agents.defaults.timeoutSeconds`       | `agent.max_turns`           | `timeoutSeconds / 10`, capped at 200.  |
| `agents.defaults.verboseDefault`       | `agent.verbose`             | `off`, `on`, `full`.                   |
| `agents.defaults.thinkingDefault`      | `agent.reasoning_effort`    | high/medium/low mapping.               |
| `agents.defaults.compaction.mode`      | `compression.enabled`       | `off` -> false; anything else -> true. |
| `agents.defaults.compaction.model`     | `compression.summary_model` | Direct string copy.                    |
| `agents.defaults.humanDelay.*`         | `human_delay.*`             | Direct copy.                           |
| `agents.defaults.userTimezone`         | `timezone`                  | Direct copy.                           |
| `tools.exec.timeoutSec`                | `terminal.timeout`          | Direct copy.                           |
| `agents.defaults.sandbox.backend`      | `terminal.backend`          | `docker` -> `docker`.                  |
| `agents.defaults.sandbox.docker.image` | `terminal.docker_image`     | Direct copy.                           |

## Session Reset

| OpenClaw path               | Hermes path                  | Notes                                        |
| --------------------------- | ---------------------------- | -------------------------------------------- |
| `session.reset.mode`        | `session_reset.mode`         | `daily`, `idle`, or both.                    |
| `session.reset.atHour`      | `session_reset.at_hour`      | 0-23.                                        |
| `session.reset.idleMinutes` | `session_reset.idle_minutes` | Minutes.                                     |
| `session.resetTriggers`     | inferred `session_reset`     | Used when structured reset object is absent. |

## MCP Servers

| OpenClaw field                | Hermes field                  |
| ----------------------------- | ----------------------------- |
| `mcp.servers.*.command`       | `mcp_servers.*.command`       |
| `mcp.servers.*.args`          | `mcp_servers.*.args`          |
| `mcp.servers.*.env`           | `mcp_servers.*.env`           |
| `mcp.servers.*.cwd`           | `mcp_servers.*.cwd`           |
| `mcp.servers.*.url`           | `mcp_servers.*.url`           |
| `mcp.servers.*.tools.include` | `mcp_servers.*.tools.include` |
| `mcp.servers.*.tools.exclude` | `mcp_servers.*.tools.exclude` |

After migration:

```bash
hermes mcp list
hermes mcp test <server-name>
hermes mcp configure <server-name>
```

## TTS

TTS source priority:

1. `messages.tts.providers.{provider}.*`
2. `talk.providers.{provider}.*`
3. `messages.tts.{provider}.*`

Destinations include `tts.provider`, `tts.elevenlabs.voice_id`, `tts.elevenlabs.model_id`, `tts.openai.model`, `tts.openai.voice`, `tts.edge.voice`, and `~/.hermes/tts/` assets.

## Messaging Platforms

Examples:

| Platform   | OpenClaw source                               | Hermes `.env` target                                        | Notes                                                               |
| ---------- | --------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Telegram   | `channels.telegram.botToken` or account token | `TELEGRAM_BOT_TOKEN`                                        | `TELEGRAM_ALLOWED_USERS` from allow list.                           |
| Discord    | `channels.discord.token` or account token     | `DISCORD_BOT_TOKEN`                                         | Allowed users migrate. Multi-account routing still needs review.    |
| Slack      | bot/app tokens                                | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`                        | Allowed users migrate.                                              |
| WhatsApp   | allow list                                    | `WHATSAPP_ALLOWED_USERS`                                    | Auth uses QR pairing; re-pair with `hermes whatsapp`.               |
| Signal     | account/httpUrl/allowFrom                     | `SIGNAL_ACCOUNT`, `SIGNAL_HTTP_URL`, `SIGNAL_ALLOWED_USERS` | Verify daemon endpoint.                                             |
| Matrix     | access token                                  | `MATRIX_ACCESS_TOKEN`                                       | Uses `accessToken`, not `botToken`.                                 |
| Mattermost | bot token                                     | `MATTERMOST_BOT_TOKEN`                                      | Verify actual Hermes env name for installed version if docs differ. |

Manual concern: gateways can conflict if old and new bots use the same token or webhook. Cut over one platform at a time.

## Other Mappings

| OpenClaw path/file              | Hermes destination     | Notes                                                      |
| ------------------------------- | ---------------------- | ---------------------------------------------------------- |
| `approvals.exec.mode`           | `approvals.mode`       | `auto` -> `off`, `always` -> `manual`, `smart` -> `smart`. |
| `exec-approvals.json`           | `command_allowlist`    | Merged and deduped.                                        |
| `browser.cdpUrl`                | `browser.cdp_url`      | Direct.                                                    |
| `browser.headless`              | `browser.headless`     | Direct.                                                    |
| `tools.web.search.brave.apiKey` | `BRAVE_API_KEY`        | Requires `--migrate-secrets`.                              |
| `gateway.auth.token`            | `HERMES_GATEWAY_TOKEN` | Requires `--migrate-secrets`.                              |
| `agents.defaults.workspace`     | `terminal.cwd`         | Legacy migration may emit `MESSAGING_CWD` fallback.        |

## Archived: Manual Rebuild Required

These are saved under `~/.hermes/migration/openclaw/<timestamp>/archive/`:

| Archived item              | Rebuild path in Hermes                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| `IDENTITY.md`              | Merge useful identity into `SOUL.md` or profile description.              |
| `TOOLS.md`                 | Translate into Hermes tool config or skill instructions.                  |
| `HEARTBEAT.md`             | Recreate with cron jobs or gateway/background behavior.                   |
| `BOOTSTRAP.md`             | Move into project context files or a skill.                               |
| Cron jobs                  | Recreate with `hermes cron create`.                                       |
| Plugins                    | Reinstall/rewrite with `hermes plugins`.                                  |
| Hooks/webhooks             | Recreate with `hermes hooks`/`hermes webhook`.                            |
| Memory backend             | Configure `hermes memory setup` or provider-specific command.             |
| Skills registry config     | Use `hermes skills config`, taps, or explicit installs.                   |
| UI/identity                | Recreate with skins/profile settings.                                     |
| Logging/diagnostics config | Reconfigure in Hermes `config.yaml`.                                      |
| Multi-agent list           | Use Hermes profiles or separate installs; do not assume automatic parity. |
| Channel bindings           | Rebuild manually per platform/gateway.                                    |
| Complex channels           | Manual platform config.                                                   |

## OpenClaw Agent Workspace To Hermes Profile Mapping

For OpenClaw multi-agent setups, treat the automatic migration as a baseline import plus archive report. Fully preserving an individual agent's workspace usually requires manual profile creation.

| OpenClaw agent/workspace item | Hermes profile equivalent                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Agent ID/name                 | Profile name and `hermes profile describe` text.                                                  |
| Agent workspace directory     | Copied project/workspace directory plus per-profile `terminal.cwd`.                               |
| Agent runtime directory       | Hermes profile home at `~/.hermes/profiles/<name>`; do not copy OpenClaw runtime state wholesale. |
| Agent `SOUL.md`/`IDENTITY.md` | Profile `SOUL.md`, merged deliberately.                                                           |
| Agent `AGENTS.md`             | Workspace/project `AGENTS.md`, usually in the directory set as `terminal.cwd`.                    |
| Agent `USER.md`/`MEMORY.md`   | Profile memory files under `~/.hermes/profiles/<name>/memories/`.                                 |
| Workspace skills              | Profile skills, commonly under `~/.hermes/profiles/<name>/skills/openclaw-imports/`.              |
| Agent bindings                | Per-profile gateway tokens and manual platform/channel cutover.                                   |
| Agent cron/triggers           | Per-profile `hermes cron` jobs.                                                                   |
| Agent sandbox/tool policy     | Per-profile tool config plus terminal backend/OS/container isolation.                             |

Hermes profiles isolate Hermes state; they do not sandbox local filesystem access. Use `terminal.cwd` for the workspace start directory and a terminal backend/container/host boundary for real access isolation.

## Practical Gap Checklist

After migration, ask:

- Which OpenClaw skills were critical enough to test first?
- Which cron jobs or triggers existed?
- Which channels routed to which agent/persona?
- Which OpenClaw agent workspaces should become separate Hermes profiles?
- Which external memory provider was active?
- Which deployed services, wikis, dashboards, or project URLs should Hermes know?
- Which old paths or commands appear inside imported skills?
- Which provider credentials were intentionally not migrated?
- Which messaging platforms require re-pairing or webhooks?