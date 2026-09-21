# Agent Tools

Reusable instructions, skills, and supporting tools for AI coding agents.

The repository keeps agent behavior portable across harnesses without treating
one harness's file format as the source of truth. Canonical instruction content
lives in this repository; harness-specific files are adapters or generated
outputs.

## Contents

### Instructions

The [`instructions/`](instructions/) directory contains the canonical global
instruction sources:

- [`invariant.md`](instructions/invariant.md)
  defines durable, evidence-led operating invariants.
- [`preferences.md`](instructions/preferences.md)
  defines general coding and collaboration preferences that project-level
  instructions may refine or override.
- [`technology-defaults.md`](instructions/technology-defaults.md)
  defines conditional technology choices used only when a project has not
  already established its own stack or tooling.
- [`pi/`](instructions/pi/) contains Pi-only instruction modules, including
  `append-system.md`.
- [`codex/`](instructions/codex/) contains Codex-only instruction modules,
  including `async-question-wait.md`.
- `instructions/vscode/` is the optional location for VS Code-only instruction
  modules.

These files intentionally contain plain Markdown. Pi, Codex, and VS Code use
different configuration formats and precedence rules, so a source file should
not be copied blindly to every destination. The synchronizer deterministically
appends `technology-defaults.md` to `preferences.md` before rendering each
harness's preferences target.

The central source loader discovers every regular `*.md` file in
`instructions/pi/`, `instructions/codex/`, and `instructions/vscode/`, sorted
by filename within each directory. It normalizes each source to LF, trims
trailing whitespace, and separates modules with one blank line. Every harness
directory is optional, so removing its last file leaves the extension point
intact without requiring a code change.

The renderers keep these modules isolated. Pi writes its modules to
`APPEND_SYSTEM.md`. Codex appends its modules after `invariant.md` in the managed
`developer_instructions` TOML string. VS Code adds its modules in a dedicated
section of the combined instruction file between invariants and preferences. A
TOML multiline-string delimiter (`"""`) in any Codex-composed source blocks
synchronization.

The current waiting policy is an instruction-based mitigation. It does not
modify the Codex server or guarantee model behavior. Validate generated files
separately from observed behavior in a new Codex session after synchronization.

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
native formats expected by Pi, Codex, and VS Code while preserving each
harness's instruction layering.

Version 1 uses explicit manual synchronization. Startup hooks are deliberately
deferred until the file-based workflow has been implemented and validated.

See
[`ADR-001: Synchronize global instructions across agent harnesses`](docs/decisions/001-cross-harness-instruction-synchronization.md)
for the context, target mapping, safety model, alternatives, and implementation
boundary.

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

`check` never writes and returns non-zero for stale, missing, untracked, or
conflicted targets. Existing divergent targets require explicit
`adopt --target <id> --apply` (or `--all`); adoption writes a recovery backup.
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
