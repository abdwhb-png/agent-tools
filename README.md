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

- [`evidence-led.instructions.md`](instructions/evidence-led.instructions.md)
  defines durable, evidence-led operating invariants.
- [`user-indications.instructions.md`](instructions/user-indications.instructions.md)
  defines general coding and collaboration preferences that project-level
  instructions may refine or override.

These files intentionally contain plain Markdown. Pi, Codex, and VS Code use
different configuration formats and precedence rules, so a source file should
not be copied blindly to every destination.

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
  pending

## Contributing

- Keep durable cross-harness behavior in `instructions/`.
- Keep harness-specific adaptation out of the canonical instruction bodies.
- Put repeatable, task-specific workflows in `skills/`.
- Record expensive-to-reverse architectural decisions in `docs/decisions/`.
- Preserve existing file paths unless a migration plan accounts for external
  consumers.
