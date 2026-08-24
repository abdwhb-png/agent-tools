# Codex Harness Reference

Read this file only when running inside **Codex** (OpenAI Codex CLI, IDE extension, desktop app) or ChatGPT Work. It maps the generic delegation step of the main SKILL.md onto Codex subagent workflows.

## How Codex subagents work

- Codex spawns parallel agents after a direct request ("spawn two agents", "delegate this work in parallel") or when applicable `AGENTS.md` / skill instructions request delegation.
- Each subagent runs in its own **agent thread** with its own model and tool work; the main thread waits for all requested results, then returns a consolidated response.
- Subagent workflows consume more tokens than comparable single-agent runs — use them for read-heavy, parallelizable work like code review (an ideal fit).
- Subagents inherit the parent's sandbox policy; you can override per custom agent (e.g. `sandbox_mode = "read-only"` for reviewers).
- Inspect running threads with `/agent` (CLI), the background-agent panel (IDE), or the activity feed (desktop app). Steer/stop by asking directly.
- Global settings live under `[agents]` in `config.toml` (`agents.enabled`, `agents.max_concurrent_threads_per_session`, `agents.default_subagent_model`, `agents.default_subagent_reasoning_effort`).

## Model and reasoning guidance

| Agent work | Suggested model | Reasoning effort |
| --- | --- | --- |
| Exploration / scout mapping (read-heavy scans) | `gpt-5.6-terra` | `medium` |
| Review lanes: correctness, security, tests | `gpt-5.6-terra` (or `gpt-5.6`) | `high` |
| Architecture assessment (complex trade-offs) | `gpt-5.6` | `high` to `xhigh` |
| Fast, narrow checks (style, docs) | `gpt-5.6-luna` | `low` to `medium` |

Unset model/effort inherits from the parent agent. Higher reasoning effort increases latency and token usage but improves complex-trace quality.

## Custom reviewer agents

Define custom agents as standalone TOML files under `~/.codex/agents/` (personal) or `.codex/agents/` (project-scoped). Required fields: `name`, `description`, `developer_instructions`. Optional keys include `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`.

Project config (`.codex/config.toml`):

```toml
[agents]
max_concurrent_threads_per_session = 8
```

`.codex/agents/reviewer.toml`:

```toml
name = "reviewer"
description = "PR reviewer focused on correctness, security, and missing tests."
model = "gpt-5.6-terra"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Review code like an owner.
Prioritize correctness, security, behavior regressions, and missing test coverage.
Lead with concrete findings, include reproduction steps when possible, and avoid style-only comments unless they hide a real bug.
"""
```

Keep each custom agent narrow and opinionated: one clear job, a tool surface matching that job, and instructions preventing drift into adjacent work.

## Delegation prompt pattern

A good subagent prompt explains how to divide the work, whether to wait for all agents, and what summary to return:

```text
Review this branch against main. Spawn one subagent per review lane:
1. Security risks
2. Correctness and edge cases
3. Architectural boundaries and coupling

Wait for all of them, then summarize findings by severity tier with file:line references.
```

## Rules specific to Codex

- Run all review lanes in parallel; wait for every lane before synthesizing the verdict.
- Prefer read-only sandbox for reviewer agents so they cannot edit code under review.
- If a lane fails or is unavailable, report the review as incomplete — never substitute self-review for a failed delegation lane.
