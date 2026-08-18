# Hermes Configuration Reference

Hermes configuration is split mainly between `~/.hermes/config.yaml` and `~/.hermes/.env`. Profiles can isolate this state into separate Hermes homes.

## File Locations And Editing

| Item                  | Location / command                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Config file           | `~/.hermes/config.yaml`; print with `hermes config path`.                                  |
| Environment file      | `~/.hermes/.env`; print with `hermes config env-path`.                                     |
| Logs                  | `~/.hermes/logs/`, or `<profile>/logs/` for non-default profiles.                          |
| Model catalog cache   | `~/.hermes/cache/model_catalog.json`.                                                      |
| Kanban default DB     | `~/.hermes/kanban.db`; additional boards under `~/.hermes/kanban/boards/<slug>/kanban.db`. |
| Webhook subscriptions | `~/.hermes/webhook_subscriptions.json`.                                                    |
| Shell hook allowlist  | `~/.hermes/shell-hooks-allowlist.json`.                                                    |
| Skill bundles         | `~/.hermes/skill-bundles/<slug>.yaml`.                                                     |
| Checkpoints           | `~/.hermes/checkpoints/`.                                                                  |

Prefer CLI helpers when possible:

```bash
hermes config path
hermes config env-path
hermes config show
hermes config edit
hermes config set <key> <value>
hermes config check
hermes config migrate
```

Docs tip: `hermes config set` automatically saves env vars to `.env` and config values to `config.yaml`.

## Profile Isolation

Profiles are multiple isolated Hermes instances with their own config, sessions, skills, cron jobs, gateway state, `.env`, `SOUL.md`, memories, logs, and home directory.

Use:

```bash
hermes profile create work --clone
hermes profile use work
hermes -p work chat -q "Hello from work profile"
```

Use profiles when work/personal state, credentials, model defaults, skill sets, memories, cron jobs, or gateways should be separated. Profiles are organization and state-isolation boundaries for Hermes; they are not filesystem sandboxes. Set `terminal.cwd` for the profile's working directory, and use terminal backend, OS user, container, or host isolation when filesystem access must be technically constrained. See [multi-agent-workspace-reference.md](multi-agent-workspace-reference.md).

## Environment Variable Rules

- All documented env vars can go in `~/.hermes/.env`.
- You can set them with `hermes config set VAR value`.
- You can reference environment variables in `config.yaml` with `${VAR_NAME}` syntax.
- If a referenced variable is not set, the placeholder remains verbatim in the config.
- Do not put secrets in workspace files, prompts, rules files, or shell history when avoidable.
- Some settings are config-only and have no environment variable; see the config-only sections below.

Example:

```yaml
auxiliary:
  vision:
    api_key: ${GOOGLE_API_KEY}
    base_url: ${CUSTOM_VISION_URL}
```

Terminal example:

```yaml
terminal:
  backend: local
  cwd: "."
  timeout: 180
```

## LLM Provider Environment Variables

Common provider variables:

| Variable                                                                              | Purpose                                                                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`                                                                  | OpenRouter key; recommended for flexibility.                                                                                    |
| `OPENROUTER_BASE_URL`                                                                 | Override OpenRouter-compatible base URL.                                                                                        |
| `HERMES_OPENROUTER_CACHE`                                                             | Enable OpenRouter response caching: `1`, `true`, `yes`, `on`. Overrides `openrouter.response_cache`.                            |
| `HERMES_OPENROUTER_CACHE_TTL`                                                         | Cache TTL seconds, 1-86400. Overrides `openrouter.response_cache_ttl`.                                                          |
| `NOUS_BASE_URL`                                                                       | Override Nous Portal base URL; rarely needed outside dev/testing.                                                               |
| `NOUS_INFERENCE_BASE_URL`                                                             | Override Nous inference endpoint directly.                                                                                      |
| `OPENAI_API_KEY`                                                                      | API key for custom OpenAI-compatible endpoints.                                                                                 |
| `OPENAI_BASE_URL`                                                                     | Base URL for custom endpoints such as VLLM or SGLang.                                                                           |
| `COPILOT_GITHUB_TOKEN`                                                                | First-priority Copilot API token. OAuth `gho_*` or fine-grained PAT `github_pat_*`; classic `ghp_*` not supported for this var. |
| `GH_TOKEN`                                                                            | Second-priority Copilot token, also used by `gh` CLI.                                                                           |
| `GITHUB_TOKEN`                                                                        | Third-priority Copilot token and Skills Hub rate/publish token.                                                                 |
| `HERMES_COPILOT_ACP_COMMAND`                                                          | Copilot ACP binary path, default `copilot`.                                                                                     |
| `COPILOT_CLI_PATH`                                                                    | Alias for `HERMES_COPILOT_ACP_COMMAND`.                                                                                         |
| `HERMES_COPILOT_ACP_ARGS`                                                             | Copilot ACP args, default `--acp --stdio`.                                                                                      |
| `COPILOT_ACP_BASE_URL`                                                                | Copilot ACP base URL override.                                                                                                  |
| `GLM_API_KEY`, `ZAI_API_KEY`, `Z_AI_API_KEY`                                          | z.ai / ZhipuAI GLM key aliases.                                                                                                 |
| `GLM_BASE_URL`                                                                        | z.ai base URL, default `https://api.z.ai/api/paas/v4`.                                                                          |
| `KIMI_API_KEY`                                                                        | Kimi / Moonshot global key.                                                                                                     |
| `KIMI_BASE_URL`                                                                       | Kimi base URL, default `https://api.moonshot.ai/v1`.                                                                            |
| `KIMI_CN_API_KEY`                                                                     | Kimi / Moonshot China key.                                                                                                      |
| `ARCEEAI_API_KEY`, `ARCEE_BASE_URL`                                                   | Arcee AI key/base URL; default base `https://api.arcee.ai/api/v1`.                                                              |
| `GMI_API_KEY`, `GMI_BASE_URL`                                                         | GMI Cloud key/base URL; default `https://api.gmi-serving.com/v1`.                                                               |
| `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`                                                 | MiniMax global key/base; OAuth path does not use these. Default base `https://api.minimax.io/anthropic`.                        |
| `MINIMAX_CN_API_KEY`, `MINIMAX_CN_BASE_URL`                                           | MiniMax China key/base. Default base `https://api.minimaxi.com/anthropic`.                                                      |
| `KILOCODE_API_KEY`, `KILOCODE_BASE_URL`                                               | Kilo Code key/base; default base `https://api.kilo.ai/api/gateway`.                                                             |
| `XIAOMI_API_KEY`, `XIAOMI_BASE_URL`                                                   | Xiaomi MiMo key/base; default base `https://api.xiaomimimo.com/v1`.                                                             |
| `TOKENHUB_API_KEY`, `TOKENHUB_BASE_URL`                                               | Tencent TokenHub key/base; default base `https://tokenhub.tencentmaas.com/v1`.                                                  |
| `AZURE_FOUNDRY_API_KEY`                                                               | Microsoft Foundry/Azure OpenAI key; not needed with `model.auth_mode: entra_id`.                                                |
| `AZURE_FOUNDRY_BASE_URL`                                                              | Microsoft Foundry endpoint URL.                                                                                                 |
| `AZURE_ANTHROPIC_KEY`                                                                 | Azure Anthropic key for Anthropic provider plus Foundry Claude base URL.                                                        |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`                           | Entra ID service principal/workload identity/user-assigned managed identity.                                                    |
| `AZURE_CLIENT_CERTIFICATE_PATH`, `AZURE_FEDERATED_TOKEN_FILE`, `AZURE_AUTHORITY_HOST` | Certificate, OIDC, sovereign cloud authority settings.                                                                          |
| `IDENTITY_ENDPOINT`, `MSI_ENDPOINT`                                                   | Managed Identity endpoint for App Service, Functions, Container Apps.                                                           |
| `HF_TOKEN`, `HF_BASE_URL`                                                             | Hugging Face token/base URL, default base `https://router.huggingface.co/v1`.                                                   |
| `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GEMINI_BASE_URL`                                 | Google AI Studio key alias/base URL.                                                                                            |
| `HERMES_GEMINI_CLIENT_ID`, `HERMES_GEMINI_CLIENT_SECRET`, `HERMES_GEMINI_PROJECT_ID`  | Google Gemini CLI PKCE/project settings.                                                                                        |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_TOKEN`                                                | Anthropic API key or manual/legacy OAuth token override.                                                                        |
| `DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`                                             | Alibaba DashScope key/base; default intl compatible endpoint.                                                                   |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`                                               | DeepSeek direct key/base.                                                                                                       |
| `NOVITA_API_KEY`, `NOVITA_BASE_URL`                                                   | NovitaAI key/base; default `https://api.novita.ai/openai/v1`.                                                                   |
| `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`                                                   | NVIDIA NIM key/base; default `https://integrate.api.nvidia.com/v1`.                                                             |
| `STEPFUN_API_KEY`, `STEPFUN_BASE_URL`                                                 | StepFun key/base; default `https://api.stepfun.com/v1`.                                                                         |
| `OLLAMA_API_KEY`, `OLLAMA_BASE_URL`                                                   | Ollama Cloud key/base; default `https://ollama.com/v1`.                                                                         |
| `XAI_API_KEY`, `XAI_BASE_URL`                                                         | xAI key/base; default `https://api.x.ai/v1`.                                                                                    |
| `MISTRAL_API_KEY`                                                                     | Mistral key for Voxtral TTS/STT.                                                                                                |
| `AWS_REGION`, `AWS_PROFILE`, `BEDROCK_BASE_URL`                                       | Bedrock region/profile/base override.                                                                                           |
| `HERMES_QWEN_BASE_URL`                                                                | Qwen Portal base URL override.                                                                                                  |
| `OPENCODE_ZEN_API_KEY`, `OPENCODE_ZEN_BASE_URL`                                       | OpenCode Zen key/base.                                                                                                          |
| `OPENCODE_GO_API_KEY`, `OPENCODE_GO_BASE_URL`                                         | OpenCode Go key/base.                                                                                                           |
| `CLAUDE_CODE_OAUTH_TOKEN`                                                             | Explicit Claude Code token override.                                                                                            |
| `HERMES_MODEL`                                                                        | Process-level model override, used by cron scheduler; prefer config for normal use.                                             |

Anthropic OAuth note: Hermes prefers Claude Code credential files when present because they refresh automatically. OAuth against Anthropic requires Claude Max with purchased extra usage credits. Claude Pro does not work for this path; use an API key instead.

## Provider Auth And Nous Variables

| Variable                          | Purpose                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `HERMES_PORTAL_BASE_URL`          | Override Nous Portal URL.                                          |
| `NOUS_INFERENCE_BASE_URL`         | Override Nous inference API URL.                                   |
| `HERMES_NOUS_MIN_KEY_TTL_SECONDS` | Minimum agent key TTL before remint; default 1800.                 |
| `HERMES_NOUS_TIMEOUT_SECONDS`     | HTTP timeout for Nous credential/token flows.                      |
| `HERMES_DUMP_REQUESTS`            | Dump API request payloads to logs.                                 |
| `HERMES_PREFILL_MESSAGES_FILE`    | JSON file of ephemeral prefill messages injected at API-call time. |
| `HERMES_TIMEZONE`                 | IANA timezone override.                                            |

## Tool API Variables

| Variable                                                                              | Purpose                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `PARALLEL_API_KEY`                                                                    | Parallel web search.                        |
| `FIRECRAWL_API_KEY`, `FIRECRAWL_API_URL`                                              | Firecrawl key/API URL.                      |
| `TAVILY_API_KEY`, `TAVILY_BASE_URL`                                                   | Tavily key/base URL.                        |
| `SEARXNG_URL`                                                                         | Self-hosted SearXNG search URL.             |
| `EXA_API_KEY`                                                                         | Exa search/contents.                        |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`                                       | Browserbase.                                |
| `BROWSER_USE_API_KEY`                                                                 | Browser Use cloud browser.                  |
| `FIRECRAWL_BROWSER_TTL`                                                               | Firecrawl browser session TTL, default 300. |
| `BROWSER_CDP_URL`                                                                     | Local Chrome DevTools Protocol URL.         |
| `CAMOFOX_URL`, `CAMOFOX_USER_ID`, `CAMOFOX_SESSION_KEY`, `CAMOFOX_ADOPT_EXISTING_TAB` | Camofox browser settings.                   |
| `BROWSER_INACTIVITY_TIMEOUT`                                                          | Browser inactivity timeout.                 |
| `AGENT_BROWSER_ARGS`                                                                  | Extra Chromium launch flags.                |
| `FAL_KEY`                                                                             | FAL image generation.                       |
| `GROQ_API_KEY`, `GROQ_BASE_URL`, `STT_GROQ_MODEL`                                     | Groq STT settings.                          |
| `VOICE_TOOLS_OPENAI_KEY`, `STT_OPENAI_MODEL`, `STT_OPENAI_BASE_URL`                   | OpenAI speech settings.                     |
| `ELEVENLABS_API_KEY`                                                                  | ElevenLabs TTS.                             |
| `HONCHO_API_KEY`, `HONCHO_BASE_URL`                                                   | Honcho memory provider.                     |
| `HINDSIGHT_TIMEOUT`                                                                   | Hindsight memory timeout, default 60.       |
| `SUPERMEMORY_API_KEY`                                                                 | Supermemory.                                |
| `DAYTONA_API_KEY`                                                                     | Daytona cloud sandboxes.                    |

## Langfuse Observability

Requires `observability/langfuse` plugin enabled.

| Variable                                                          | Purpose                                           |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| `HERMES_LANGFUSE_PUBLIC_KEY`, `HERMES_LANGFUSE_SECRET_KEY`        | Required Langfuse keys.                           |
| `HERMES_LANGFUSE_BASE_URL`                                        | Server URL; default `https://cloud.langfuse.com`. |
| `HERMES_LANGFUSE_ENV`                                             | Environment tag.                                  |
| `HERMES_LANGFUSE_RELEASE`                                         | Release/version tag.                              |
| `HERMES_LANGFUSE_SAMPLE_RATE`                                     | Sampling 0.0-1.0, default 1.0.                    |
| `HERMES_LANGFUSE_MAX_CHARS`                                       | Per-field truncation, default 12000.              |
| `HERMES_LANGFUSE_DEBUG`                                           | Verbose plugin logging.                           |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` | Standard SDK fallbacks.                           |

## Nous Tool Gateway

Most users configure this via `hermes model` or `hermes tools`.

| Variable                  | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `TOOL_GATEWAY_DOMAIN`     | Base domain, default `nousresearch.com`.          |
| `TOOL_GATEWAY_SCHEME`     | `http` or `https`, default `https`.               |
| `TOOL_GATEWAY_USER_TOKEN` | Tool Gateway auth token, normally auto-populated. |
| `FIRECRAWL_GATEWAY_URL`   | Firecrawl gateway endpoint override.              |

## Terminal Backend

| Variable                                 | Purpose                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `TERMINAL_ENV`                           | Backend: `local`, `docker`, `ssh`, `singularity`, `modal`, `daytona`.          |
| `HERMES_DOCKER_BINARY`                   | Docker/podman binary override.                                                 |
| `TERMINAL_DOCKER_IMAGE`                  | Docker image, default `nikolaik/python-nodejs:python3.11-nodejs20`.            |
| `TERMINAL_DOCKER_FORWARD_ENV`            | JSON array of env vars to forward into Docker terminal sessions.               |
| `TERMINAL_DOCKER_VOLUMES`                | Extra volume mounts, comma-separated `host:container`.                         |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | Mount launch cwd into Docker `/workspace`; default false.                      |
| `TERMINAL_SINGULARITY_IMAGE`             | Singularity image or `.sif`.                                                   |
| `TERMINAL_MODAL_IMAGE`                   | Modal container image.                                                         |
| `TERMINAL_DAYTONA_IMAGE`                 | Daytona sandbox image.                                                         |
| `TERMINAL_TIMEOUT`                       | Command timeout seconds.                                                       |
| `TERMINAL_LIFETIME_SECONDS`              | Max terminal session lifetime.                                                 |
| `TERMINAL_CWD`                           | Deprecated for gateway/cron; prefer `terminal.cwd`. CLI uses launch directory. |
| `SUDO_PASSWORD`                          | Enable sudo without interactive prompt.                                        |

SSH:

| Variable                                                                          | Purpose                            |
| --------------------------------------------------------------------------------- | ---------------------------------- |
| `TERMINAL_SSH_HOST`, `TERMINAL_SSH_USER`, `TERMINAL_SSH_PORT`, `TERMINAL_SSH_KEY` | SSH connection settings.           |
| `TERMINAL_SSH_PERSISTENT`                                                         | Override persistent shell for SSH. |

Container resources:

| Variable                        | Purpose                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| `TERMINAL_CONTAINER_CPU`        | CPU cores, default 1.                                             |
| `TERMINAL_CONTAINER_MEMORY`     | Memory MB, default 5120.                                          |
| `TERMINAL_CONTAINER_DISK`       | Disk MB, default 51200.                                           |
| `TERMINAL_CONTAINER_PERSISTENT` | Persist container FS, default true.                               |
| `TERMINAL_SANDBOX_DIR`          | Host dir for workspaces/overlays, default `~/.hermes/sandboxes/`. |

Persistent shell:

| Variable                    | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `TERMINAL_PERSISTENT_SHELL` | Enable persistent shell for non-local backends, default true. |
| `TERMINAL_LOCAL_PERSISTENT` | Enable persistent local shell, default false.                 |
| `TERMINAL_SSH_PERSISTENT`   | SSH override.                                                 |

## Messaging And Gateway Variables

Global gateway variables:

| Variable                                                                                                                         | Purpose                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GATEWAY_ALLOWED_USERS`                                                                                                          | Comma-separated user IDs allowed across platforms.                       |
| `GATEWAY_ALLOW_ALL_USERS`                                                                                                        | Allow all users, default false.                                          |
| `GATEWAY_PROXY_URL`, `GATEWAY_PROXY_KEY`                                                                                         | Proxy platform I/O to remote Hermes API server.                          |
| `MESSAGING_CWD`                                                                                                                  | Deprecated fallback; prefer `terminal.cwd`.                              |
| `API_SERVER_ENABLED`, `API_SERVER_KEY`, `API_SERVER_CORS_ORIGINS`, `API_SERVER_PORT`, `API_SERVER_HOST`, `API_SERVER_MODEL_NAME` | OpenAI-compatible API server settings. Key is required whenever enabled. |
| `WEBHOOK_ENABLED`, `WEBHOOK_PORT`, `WEBHOOK_SECRET`                                                                              | Webhook adapter settings.                                                |

Platform families documented include Telegram, Discord, Slack, Google Chat, WhatsApp, Signal, SMS/Twilio, Email, DingTalk, Feishu/Lark, WeCom, Weixin, BlueBubbles, QQ, Mattermost, Matrix, Home Assistant, Microsoft Graph, Teams delivery, LINE, and ntfy.

Security-sensitive examples:

- `TELEGRAM_WEBHOOK_SECRET` is required when `TELEGRAM_WEBHOOK_URL` is set.
- `SMS_INSECURE_NO_SIGNATURE=true` disables Twilio signature validation and is local-dev only.
- `GOOGLE_CHAT_ALLOW_ALL_USERS`, `LINE_ALLOW_ALL_USERS`, `NTFY_ALLOW_ALL_USERS`, and similar allow-all switches are dev/trusted-topic only.
- `DISCORD_ALLOW_MENTION_EVERYONE` defaults false; do not enable lightly.
- Matrix E2EE needs stable `MATRIX_DEVICE_ID` and may need `MATRIX_RECOVERY_KEY`.

## Advanced Messaging Tuning

Common knobs:

| Variable                                                                                                                                          | Purpose                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `HERMES_TELEGRAM_TEXT_BATCH_DELAY_SECONDS`, `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS`, `HERMES_MATRIX_TEXT_BATCH_DELAY_SECONDS`                   | Text batch flush delays.                                 |
| `HERMES_TELEGRAM_TEXT_BATCH_SPLIT_DELAY_SECONDS`, `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS`, `HERMES_MATRIX_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Split delays for long messages.                          |
| `HERMES_FEISHU_*`, `HERMES_WECOM_*`                                                                                                               | Platform-specific batching controls.                     |
| `HERMES_VISION_DOWNLOAD_TIMEOUT`                                                                                                                  | Image download timeout, default 30.                      |
| `HERMES_RESTART_DRAIN_TIMEOUT`                                                                                                                    | Gateway drain timeout on restart, default 900.           |
| `HERMES_GATEWAY_PLATFORM_CONNECT_TIMEOUT`                                                                                                         | Per-platform startup connect timeout.                    |
| `HERMES_GATEWAY_BUSY_INPUT_MODE`                                                                                                                  | `queue`, `steer`, or `interrupt`.                        |
| `HERMES_GATEWAY_BUSY_ACK_ENABLED`                                                                                                                 | Send acknowledgement for busy input, default true.       |
| `HERMES_GATEWAY_NO_SUPERVISE`                                                                                                                     | s6 image foreground no-supervision mode.                 |
| `HERMES_FILE_MUTATION_VERIFIER`                                                                                                                   | Advisory footer for failed file mutations, default true. |
| `HERMES_CRON_TIMEOUT`                                                                                                                             | Cron run inactivity timeout, default 600; `0` unlimited. |
| `HERMES_CRON_SCRIPT_TIMEOUT`                                                                                                                      | Pre-run script timeout, default 120.                     |
| `HERMES_CRON_MAX_PARALLEL`                                                                                                                        | Max cron jobs per tick, default 4.                       |

## Agent Behavior

| Variable                                                                            | Purpose                                                                                                                           |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `HERMES_MAX_ITERATIONS`                                                             | Max tool-calling iterations, default 90.                                                                                          |
| `HERMES_INFERENCE_MODEL`                                                            | Session/process model override; also `-m`/`--model`.                                                                              |
| `HERMES_YOLO_MODE`                                                                  | Bypass dangerous-command approvals; equivalent to `--yolo`.                                                                       |
| `HERMES_ACCEPT_HOOKS`                                                               | Auto-approve unseen shell hooks.                                                                                                  |
| `HERMES_IGNORE_USER_CONFIG`                                                         | Equivalent to `--ignore-user-config`.                                                                                             |
| `HERMES_IGNORE_RULES`                                                               | Equivalent to `--ignore-rules`.                                                                                                   |
| `HERMES_MD_NAMES`                                                                   | Rules file names to auto-inject; default `AGENTS.md,CLAUDE.md,.cursorrules,SOUL.md`.                                              |
| `HERMES_HUMAN_DELAY_MODE`, `HERMES_HUMAN_DELAY_MIN_MS`, `HERMES_HUMAN_DELAY_MAX_MS` | Response pacing.                                                                                                                  |
| `HERMES_QUIET`                                                                      | Suppress non-essential output.                                                                                                    |
| `CODEX_HOME`                                                                        | Codex app-server config/auth dir.                                                                                                 |
| `HERMES_KANBAN_TASK`                                                                | Set by dispatcher for worker task UUID; do not set manually.                                                                      |
| `HERMES_API_TIMEOUT`                                                                | LLM API call timeout, default 1800.                                                                                               |
| `HERMES_API_CALL_STALE_TIMEOUT`                                                     | Non-streaming stale-call timeout, default 300; auto-disabled for local providers when unset.                                      |
| `HERMES_STREAM_READ_TIMEOUT`                                                        | Streaming socket read timeout, default 120.                                                                                       |
| `HERMES_STREAM_STALE_TIMEOUT`                                                       | Stale stream timeout, default 180; auto-disabled for local providers.                                                             |
| `HERMES_STREAM_RETRIES`                                                             | Mid-stream reconnect attempts, default 3.                                                                                         |
| `HERMES_AGENT_TIMEOUT`                                                              | Gateway run inactivity timeout, default 900; `0` disables.                                                                        |
| `HERMES_AGENT_TIMEOUT_WARNING`                                                      | Gateway inactivity warning threshold.                                                                                             |
| `HERMES_AGENT_NOTIFY_INTERVAL`                                                      | Long-running progress notification interval.                                                                                      |
| `HERMES_CHECKPOINT_TIMEOUT`                                                         | Filesystem checkpoint timeout, default 30.                                                                                        |
| `HERMES_EXEC_ASK`                                                                   | Enable execution approvals in gateway mode.                                                                                       |
| `HERMES_ENABLE_PROJECT_PLUGINS`                                                     | Enable repo-local plugin discovery from `./.hermes/plugins/`. Dashboard refuses project Python API auto-import even when enabled. |
| `HERMES_PLUGINS_DEBUG`                                                              | Verbose plugin discovery logs.                                                                                                    |
| `HERMES_BACKGROUND_NOTIFICATIONS`                                                   | Gateway background process notifications: `all`, `result`, `error`, `off`.                                                        |
| `HERMES_EPHEMERAL_SYSTEM_PROMPT`                                                    | Ephemeral system prompt injected at API-call time.                                                                                |
| `HERMES_ALLOW_PRIVATE_URLS`                                                         | Allow tools to fetch localhost/private-network URLs; off by default in gateway mode.                                              |
| `HERMES_REDACT_SECRETS`                                                             | Secret redaction in tool output/logs/chat, default true.                                                                          |
| `HERMES_WRITE_SAFE_ROOT`                                                            | Directory prefix restricting writes; outside requires approval.                                                                   |
| `HERMES_DISABLE_FILE_STATE_GUARD`                                                   | Disable changed-since-read guard.                                                                                                 |
| `HERMES_CORE_TOOLS`                                                                 | Advanced override for core tools.                                                                                                 |
| `HERMES_BUNDLED_SKILLS`                                                             | Override bundled skill list.                                                                                                      |
| `HERMES_OPTIONAL_SKILLS`                                                            | Optional skills to auto-install first run.                                                                                        |
| `HERMES_DEBUG_INTERRUPT`                                                            | Interrupt/cancel tracing.                                                                                                         |
| `HERMES_DUMP_REQUEST_STDOUT`                                                        | Dump API payloads to stdout.                                                                                                      |
| `HERMES_OAUTH_TRACE`                                                                | OAuth tracing with redacted timings.                                                                                              |
| `HERMES_OAUTH_FILE`                                                                 | OAuth credential storage path, default `~/.hermes/auth.json`.                                                                     |
| `HERMES_AGENT_HELP_GUIDANCE`                                                        | Append guidance text to system prompt.                                                                                            |
| `HERMES_AGENT_LOGO`                                                                 | Override ASCII banner.                                                                                                            |
| `DELEGATION_MAX_CONCURRENT_CHILDREN`                                                | Max child agents per delegate batch, default 3. Config value takes priority.                                                      |

Deprecated display vars: `HERMES_TOOL_PROGRESS`, `HERMES_TOOL_PROGRESS_MODE`; prefer `display.tool_progress` in `config.yaml`.

## Interface And Session Settings

| Variable               | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `HERMES_TUI`           | Launch TUI when set to `1`; equivalent to `--tui`.                  |
| `HERMES_TUI_DIR`       | Prebuilt `ui-tui/` dir for distros/Nix.                             |
| `HERMES_TUI_RESUME`    | Resume specific TUI session ID.                                     |
| `HERMES_TUI_THEME`     | Force `light`, `dark`, or 6-char background hex.                    |
| `SESSION_IDLE_MINUTES` | Reset after inactivity, default 1440.                               |
| `SESSION_RESET_HOUR`   | Daily reset hour, default 4.                                        |
| `HERMES_SESSION_ID`    | Exported automatically into tool subprocesses; do not set manually. |

## Windows And Kanban Environment Variables

| Variable                            | Purpose                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `HERMES_HOME`                       | Override Hermes config directory; scopes gateway PID/service names.                 |
| `HERMES_GIT_BASH_PATH`              | Windows bash discovery override; installer sets it to PortableGit when provisioned. |
| `HERMES_DISABLE_WINDOWS_UTF8`       | Windows diagnostic workaround for UTF-8 stdio shim; rarely normal operation.        |
| `HERMES_KANBAN_HOME`                | Root for kanban DB/workspaces/worker logs.                                          |
| `HERMES_KANBAN_BOARD`               | Active board override; dispatcher injects into workers.                             |
| `HERMES_KANBAN_DB`                  | Direct DB path override; highest precedence.                                        |
| `HERMES_KANBAN_WORKSPACES_ROOT`     | Direct workspaces root override.                                                    |
| `HERMES_KANBAN_DISPATCH_IN_GATEWAY` | Runtime override for gateway embedded dispatcher.                                   |

## Config-Only: Context Compression

No environment variables. Configure in `config.yaml`:

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20
  protect_last_n: 20
```

Legacy `compression.summary_model`, `compression.summary_provider`, and `compression.summary_base_url` migrate to `auxiliary.compression.*` on first load.

## Auxiliary Task Overrides

| Variable                                                                                                                           | Purpose                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `AUXILIARY_VISION_PROVIDER`, `AUXILIARY_VISION_MODEL`, `AUXILIARY_VISION_BASE_URL`, `AUXILIARY_VISION_API_KEY`                     | Vision task override.                  |
| `AUXILIARY_WEB_EXTRACT_PROVIDER`, `AUXILIARY_WEB_EXTRACT_MODEL`, `AUXILIARY_WEB_EXTRACT_BASE_URL`, `AUXILIARY_WEB_EXTRACT_API_KEY` | Web extraction/summarization override. |

For task-specific direct endpoints, Hermes uses the task configured API key or `OPENAI_API_KEY`; it does not reuse `OPENROUTER_API_KEY` for custom endpoints.

## Config-Only: Fallback Providers

No environment variables. Use `config.yaml`:

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

Older top-level `fallback_model` is read for compatibility; new config should use `fallback_providers`.

CLI helper:

```bash
hermes fallback list
hermes fallback add
hermes fallback remove
hermes fallback clear
```

## Config-Only: Provider Routing

Use `config.yaml` under `provider_routing`:

| Key                  | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `sort`               | `price` default, `throughput`, or `latency`.                 |
| `only`               | Provider slugs to allow.                                     |
| `ignore`             | Provider slugs to skip.                                      |
| `order`              | Provider slugs to try in order.                              |
| `require_parameters` | Only use providers supporting all request params.            |
| `data_collection`    | `allow` default or `deny` to exclude data-storing providers. |