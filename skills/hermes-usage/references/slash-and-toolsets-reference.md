# Hermes Slash Commands And Toolsets Reference

This reference covers the in-chat slash command surface and toolset selection. Use it when the user asks what to type inside a Hermes session, how `/model` differs from `hermes model`, or which `--toolsets` value enables a capability.

## Slash Command Surfaces

Hermes has two slash-command surfaces:

| Surface                        | Where it runs                                                           | Notes                                                          |
| ------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Interactive CLI slash commands | Inside classic CLI/TUI sessions.                                        | Dispatched by the interactive session command registry.        |
| Messaging slash commands       | Telegram, Discord, Slack, WhatsApp, Teams, and other gateway platforms. | Gateway command availability can be platform/config dependent. |

For terminal commands, use `hermes <command>`. For in-session commands, type `/command` inside the Hermes conversation.

## Core Slash Commands From Reference

| Command               | Purpose                                   | Notes                                                                                                |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/new [name]`         | Start a new session with optional name.   | Alias: `/reset`.                                                                                     |
| `/clear`              | Clear screen and start a new session.     | Interactive cleanup.                                                                                 |
| `/history`            | Show conversation history.                | Session-oriented.                                                                                    |
| `/save`               | Save the current conversation.            | Useful before changing context.                                                                      |
| `/retry`              | Retry the last message sent to the agent. | Replays last request.                                                                                |
| `/undo`               | Remove the last user/assistant exchange.  | Conversation edit.                                                                                   |
| `/title <title>`      | Set current session title.                | Example: `/title My Session Name`.                                                                   |
| `/compress [here [N]  | focus topic]`                             | Manually compress context.                                                                           | Use when context is bloated or topic focus matters. |
| `/goal <text>`        | Set a standing goal.                      | Subcommands: `/goal status`, `/goal pause`, `/goal resume`, `/goal clear`.                           |
| `/help`               | Show help.                                | First stop for current installed command inventory.                                                  |
| `/model [model-name]` | Show or change current model.             | Only switches among configured providers/models; cannot add providers or OAuth.                      |
| `/personality <name>` | Switch personality when available.        | Example from quickstart: `/personality pirate`. Availability can depend on installed version/config. |
| `/commands [page]`    | Browse all commands and skills.           | Paginated list.                                                                                      |

Examples:

```text
/new my-experiment
/reset now
/title My Session Name
/goal improve response time
/model claude-sonnet-4
/personality pirate
/commands 2
```

## `/model` Rules

Use `/model` only for already configured providers/models:

```text
/model
/model claude-sonnet-4
/model openrouter:anthropic/claude-sonnet-4
/model custom:qwen-2.5
/model claude-sonnet-4 --global
```

Use terminal `hermes model` when the user needs to add Anthropic, Copilot, Nous, OpenRouter, custom endpoints, OAuth, or API keys.

## Toolsets Mental Model

Toolsets are named groups of tools that can be selected for a session or configured per platform.

CLI examples:

```bash
hermes chat --toolsets web,file,terminal
hermes chat --toolsets debugging
hermes tools
hermes tools --summary
```

Use `hermes tools` for persistent or per-platform tool configuration. Use `--toolsets` for per-run selection.

## Toolset Inventory From Reference

| Toolset          | Category  | Enables / purpose                                                                                                           | Notes                                                     |
| ---------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `browser`        | Core      | Browser automation: back, CDP, click, console, dialog, images, navigate, press, scroll, snapshot, type, vision, web search. | Runtime-gated on reachable CDP endpoint.                  |
| `clarify`        | Core      | Ask user clarification.                                                                                                     | Tool: `clarify`.                                          |
| `code_execution` | Core      | Run Python scripts that call Hermes tools programmatically.                                                                 | Tool: `execute_code`.                                     |
| `cronjob`        | Core      | Schedule/manage recurring tasks.                                                                                            | Tool: `cronjob`.                                          |
| `debugging`      | Composite | Debug bundle combining file, terminal/process, web extraction/search.                                                       | Good broad troubleshooting preset.                        |
| `delegation`     | Core      | Spawn isolated subagent instances for parallel work.                                                                        | Tool: `delegate_task`.                                    |
| `discord`        | Core      | Discord text/embed/DM actions.                                                                                              | Gateway-only; active on `hermes-discord`.                 |
| `discord_admin`  | Core      | Discord moderation, roles, channel management.                                                                              | Requires bot permissions.                                 |
| `feishu_doc`     | Core      | Read Feishu/Lark document content.                                                                                          | Used by Feishu document-comment handler.                  |
| `feishu_drive`   | Core      | Feishu/Lark drive comments.                                                                                                 | Scoped to comment agent, not `hermes-cli`.                |
| `file`           | Core      | `read_file`, `write_file`, `patch`, `search_files`.                                                                         | Needed for filesystem work.                               |
| `homeassistant`  | Core      | Home Assistant state/service/entity tools.                                                                                  | Requires `HASS_TOKEN`.                                    |
| `computer_use`   | Core      | macOS desktop control through `cua-driver`.                                                                                 | Requires `cua-driver` on PATH.                            |
| `image_gen`      | Core      | Text-to-image generation.                                                                                                   | Optional OpenAI/xAI backends.                             |
| `video_gen`      | Core      | Text-to-video and image-to-video.                                                                                           | Pass `image_url` for image-to-video.                      |
| `kanban`         | Core      | Multi-agent coordination tools.                                                                                             | Registered for dispatcher-spawned task workers.           |
| `memory`         | Core      | Persistent cross-session memory.                                                                                            | Tool: `memory`.                                           |
| `messaging`      | Core      | Send messages from a session.                                                                                               | Tool: `send_message`.                                     |
| `moa`            | Core      | Mixture-of-Agents consensus.                                                                                                | Tool: `mixture_of_agents`.                                |
| `safe`           | Core      | Read-only research and media generation.                                                                                    | No file writes, terminal, or code execution.              |
| `search`         | Core      | Web search without extraction.                                                                                              | Tool: `web_search`.                                       |
| `session_search` | Core      | Search past sessions.                                                                                                       | Tool: `session_search`.                                   |
| `skills`         | Core      | Skill management/browsing.                                                                                                  | `skill_manage`, `skill_view`, `skills_list`.              |
| `spotify`        | Core      | Spotify control.                                                                                                            | Registered by bundled `spotify` plugin.                   |
| `terminal`       | Core      | Shell command execution and process management.                                                                             | Tools: `terminal`, `process`.                             |
| `todo`           | Core      | In-session task list.                                                                                                       | Tool: `todo`.                                             |
| `tts`            | Core      | Text-to-speech.                                                                                                             | Tool: `text_to_speech`.                                   |
| `vision`         | Core      | Image analysis.                                                                                                             | Tool: `vision_analyze`.                                   |
| `video`          | Core      | Video analysis.                                                                                                             | Not included by default; explicitly add via `--toolsets`. |
| `web`            | Core      | Web extraction and search.                                                                                                  | `web_extract`, `web_search`.                              |
| `x_search`       | Core      | Search X/Twitter posts.                                                                                                     | Requires xAI credentials.                                 |
| `yuanbao`        | Core      | Yuanbao DM/group/sticker actions.                                                                                           | Only on `hermes-yuanbao`.                                 |

## Selection Guidance

| Need                                   | Use                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| Read-only web research                 | `--toolsets safe` or `--toolsets web,search` depending on whether extraction is needed. |
| Codebase edits                         | Include `file` and often `terminal`; consider `debugging` for broad troubleshooting.    |
| Strictly no shell/file writes          | Prefer `safe`; avoid `terminal`, `file`, `code_execution`.                              |
| Browser interaction                    | `browser`, plus configure CDP or cloud browser credentials.                             |
| Messaging from within an agent session | `messaging`; direct shell sends should use `hermes send`.                               |
| Multi-agent work                       | `delegation`; tune concurrency with `DELEGATION_MAX_CONCURRENT_CHILDREN` or config.     |
| Video analysis                         | Explicitly add `video`; docs say it is not in the default toolset.                      |

When in doubt, ask whether the user wants a temporary per-run toolset (`hermes chat --toolsets ...`) or persistent per-platform behavior (`hermes tools`).