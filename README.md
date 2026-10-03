# Agent Tools

Reusable instructions, specialist agents, skills and supporting tools for AI coding agents. This repository owns the canonical sources, and each harness receives its native format.

## Contents

| Directory | Purpose |
| --- | --- |
| [`instructions/`](instructions/) | Shared operating rules, preferences, technology defaults and harness-specific global guidance. |
| [`agents/`](agents/) | Shared specialist roles, explicit Pi and Codex settings, and optional native procedures. |
| [`skills/`](skills/) | Reusable workflows with a `SKILL.md` entrypoint and their supporting files. |
| [`tools/harness-sync/`](tools/harness-sync/README.md) | Independent `instruction-sync` and `agent-sync` commands with previews, ownership tracking and recovery backups. |
| [`docs/decisions/`](docs/decisions/) | Architecture decisions and their rationale. |

## Getting started

```bash
git clone https://github.com/abdwhb-png/agent-tools.git
cd agent-tools
```

For synchronization, follow the [harness-sync guide](tools/harness-sync/README.md). Its committed CLIs run with Node 24+ without dependency installation. Instruction synchronization supports Pi, Codex, VS Code and Zed. Agent synchronization supports Pi and Codex, with separate configuration and ownership state.

For skills, follow the selected skill's `SKILL.md` and preserve its complete directory when installing or linking it through a harness's supported mechanism. There is no repository-wide installation step.

## Contributing

Keep durable global guidance in `instructions/`, specialist responsibilities and native settings in `agents/`, and repeatable task workflows in `skills/`. Edit canonical sources and regenerate outputs. Preserve externally consumed paths or provide an explicit migration, and record significant architecture decisions in `docs/decisions/`.
