# Agent Tools

Reusable instructions, skills, and supporting tools for AI coding agents.

The repository keeps agent behavior portable across harnesses without treating
one harness's file format as the source of truth. Canonical instruction content
lives in this repository; harness-specific files are adapters or generated
outputs.

## Contents

### Instructions

The [`instructions/`](instructions/) directory contains the canonical global instruction sources:

- [`invariant.md`](instructions/invariant.md) defines durable operating rules.
- [`preferences.md`](instructions/preferences.md) defines general coding and collaboration preferences.
- [`technology-defaults.md`](instructions/technology-defaults.md) defines conditional technology choices when the project has not established its stack or tooling.

Each harness (`pi`, `codex`, `vscode`, `zed`) supports two optional module directories:

```text
instructions/<harness>/system/*.md   # operating rules
instructions/<harness>/agents/*.md   # global personal guidance
instructions/pi/APPEND_SYSTEM.md    # dedicated Pi append source
```

Add a Markdown file to the appropriate layer directory to include it automatically. The loader reads regular `*.md` files directly within each directory in alphabetical filename order, normalizes BOM and line endings, and joins nonempty content with one blank line. Nested directories and non-Markdown files are not included. Missing or empty layer directories are valid.

| Source content | Pi | Codex |
| --- | --- | --- |
| `invariant.md` + matching `system/*.md` | `SYSTEM.md` | managed `developer_instructions` in `config.toml` |
| `preferences.md` + `technology-defaults.md` + matching `agents/*.md` | global `AGENTS.md` | global `AGENTS.md` |
| Only `pi/APPEND_SYSTEM.md` | `APPEND_SYSTEM.md` | excluded |

Zed combines the operating layer followed by the personal guidance layer into one personal `AGENTS.md` per configured home. VS Code combines them into the invariants and preferences sections of its existing `*.instructions.md` targets. Source separation does not give these files system or developer priority. Pi's custom `SYSTEM.md` continues to replace its built-in prompt preamble.

Markdown files directly under a harness directory are rejected with a migration error, except the exact `pi/APPEND_SYSTEM.md` source. Move old modules into `system/` or `agents/` and rename `pi/append-system.md` to `pi/APPEND_SYSTEM.md`. A missing append source generates an empty managed `APPEND_SYSTEM.md`. A TOML multiline-string delimiter (`"""`) in Codex's operating layer blocks synchronization. Codex's `agents/` content remains plain Markdown and does not have that restriction.

The Pi shell rule lives in [`pi/system/specific-tools.md`](instructions/pi/system/specific-tools.md), and its todo-list preference lives in [`pi/agents/task-workflow.md`](instructions/pi/agents/task-workflow.md). Codex's question-visibility rule lives in [`codex/system/async-question-wait.md`](instructions/codex/system/async-question-wait.md). These instructions do not guarantee model behavior. Validate generated files separately from observed behavior in a new session after synchronization.

### Skills

The [`skills/`](skills/) directory contains reusable agent skills. Each skill is
self-contained under its own directory with a `SKILL.md` entrypoint and, when
needed, references, scripts, or evaluations.

Install or link a skill through the target harness's supported skill mechanism.
Preserve the complete skill directory so relative references continue to work.

## Quick Start

Clone the repository and inspect the instruction or skill you want to use:

```bash
git clone https://github.com/abdwhb-png/agent-tools.git
cd agent-tools
```

No repository-wide installation step is currently required. Individual skills
may have their own documented requirements.

## Architecture

The accepted architecture introduces a portable TypeScript synchronizer under
`tools/instruction-sync/`. It will render the canonical instructions into the
native formats expected by Pi, Codex, VS Code, and Zed while preserving each
harness's instruction layering.

Version 1 uses explicit manual synchronization. Startup hooks are deliberately
deferred until the file-based workflow has been implemented and validated.

See [ADR-001](docs/decisions/001-cross-harness-instruction-synchronization.md) for the synchronization safety model and [ADR-002](docs/decisions/002-explicit-harness-instruction-layers.md) for the accepted source layout, native target mapping, migration, and validation requirements.

## Project Status

- Canonical instruction sources: available
- Reusable skills: available
- Cross-harness instruction synchronizer: architecture accepted, implementation
  available at [`tools/instruction-sync/`](tools/instruction-sync/)

## Instruction synchronization

The synchronizer is a self-contained Node 24+ CLI. A clone can run the checked
in artifact without installing dependencies:

```bash
node tools/instruction-sync/dist/agent-policy.mjs configure --apply
node tools/instruction-sync/dist/agent-policy.mjs doctor
node tools/instruction-sync/dist/agent-policy.mjs check
node tools/instruction-sync/dist/agent-policy.mjs sync
```

The default configuration is
[`tools/instruction-sync/config.json`](tools/instruction-sync/config.json),
next to the executable. `configure` is optional: you may instead copy
[`config.example.json`](tools/instruction-sync/config.example.json) there,
edit its absolute target paths, or use `--config /path/to/config.json` to
override the default. The file supports enabling or disabling each harness and
a list of VS Code instruction destinations.

Codex can have a primary home plus named additional homes. From WSL, point an
additional home at the Windows Codex directory using its mounted path (for
example `/mnt/c/Users/<you>/.codex`). Confirm the actual Windows `CODEX_HOME`
first if it is customized. Add it to the machine-local configuration with:

```bash
node tools/instruction-sync/dist/agent-policy.mjs configure --codex-additional-home windows=/mnt/c/Users/<you>/.codex
node tools/instruction-sync/dist/agent-policy.mjs configure --codex-additional-home windows=/mnt/c/Users/<you>/.codex --apply
node tools/instruction-sync/dist/agent-policy.mjs doctor
```

The first command previews the configuration. The existing Codex home retains
its target IDs and sync state; the new home uses `codex-windows-config` and
`codex-windows-agents`. If its `config.toml` already has unmanaged
`developer_instructions`, `sync` reports a conflict until that target is
explicitly adopted.

Zed's native agent reads personal `AGENTS.md` from `%APPDATA%\Zed` on Windows
and `~/.config/zed` on Linux. From WSL, configure the Windows home as the
primary target with its mounted absolute path, then add the Linux home by name:

```bash
node tools/instruction-sync/dist/agent-policy.mjs configure --zed-home /mnt/c/Users/<you>/AppData/Roaming/Zed --zed-additional-home linux=/home/<you>/.config/zed --enable-zed
node tools/instruction-sync/dist/agent-policy.mjs configure --zed-home /mnt/c/Users/<you>/AppData/Roaming/Zed --zed-additional-home linux=/home/<you>/.config/zed --enable-zed --apply
node tools/instruction-sync/dist/agent-policy.mjs doctor
```

The first command previews the paths. Existing configs without `zed` remain
valid, and the Zed target is disabled until configured. The targets are
`zed-agents` and `zed-linux-agents`. Zed's external agents use their own
instruction mechanisms; these files target the native Zed Agent.
When running from WSL, use `/mnt/...` paths; a Windows `C:\...` path is rejected
because Linux would otherwise treat it as a relative filename.

`check` never writes and returns non-zero for stale, missing, untracked, or
conflicted targets. Existing divergent targets require explicit
`adopt --target <id> --apply` (or `--all`); adoption writes a recovery backup.

`sync` and `adopt` show one final result per target, with files written during that run labeled `changed` and listed first. Unchanged files show `current`, and missing files remain visible. Backups are reported by directory rather than as a list of individual files. `check` and `doctor` report the files' current state, so a file changed by an earlier command appears as `current` once it matches the sources.

Use `bun run typecheck`, `bun test`, `bun run build`, and `bun run verify:dist`
from `tools/instruction-sync/` when maintaining the tool. Source maintenance
requires Bun 1.3.14 and a locally available TypeScript compiler; the committed
CLI itself requires only Node 24+.

## Contributing

- Keep durable cross-harness behavior in `instructions/`.
- Keep harness-specific adaptation out of the canonical instruction bodies.
- Put repeatable, task-specific workflows in `skills/`.
- Record expensive-to-reverse architectural decisions in `docs/decisions/`.
- Preserve existing file paths unless a migration plan accounts for external
  consumers.
