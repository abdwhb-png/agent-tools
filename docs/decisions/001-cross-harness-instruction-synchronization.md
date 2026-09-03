# ADR-001: Synchronize global instructions across agent harnesses

## Status

Accepted

## Date

2026-09-03

## Context

The same durable agent behavior is currently maintained across Pi, Codex, and
VS Code Copilot. Each harness uses a different loading mechanism:

- Pi loads `SYSTEM.md`, `APPEND_SYSTEM.md`, and one or more `AGENTS.md` files.
  A custom `SYSTEM.md` intentionally replaces Pi's default system prompt.
- Codex accepts global developer instructions inline in `config.toml` and loads
  a global `AGENTS.md` before project-level instruction files.
- VS Code provides built-in system instructions that users cannot replace with
  an equivalent of Pi's `SYSTEM.md`. User-controlled behavior is supplied
  through instruction files, custom agents, and other customization layers.
  Multiple instruction files may be combined without a guaranteed order.

The repository already contains the two cross-harness sources:

- `instructions/evidence-led.md` is the canonical source for
  durable operating invariants.
- `instructions/user-indications.md` is the canonical source for
  general coding and collaboration preferences.

At the time of this decision, the evidence-led source matches the active Pi
`SYSTEM.md`. The user-indications source matches the active Codex global
`AGENTS.md` after normalizing line endings. Harness copies nevertheless require
manual editing, format wrappers, or configuration embedding. This creates drift
and makes a change difficult to verify across machines.

Pi also needs instructions that should not propagate to other harnesses.
`APPEND_SYSTEM.md` is such a Pi-specific layer. Repository-specific instructions,
including the `AGENTS.md` used while developing Pi configuration, are separate
from both global policy categories.

The desired outcome is one portable, versioned source for global instructions,
with deterministic generation of native harness files. Version 1 does not need
startup hooks because changes to the canonical sources are expected to be
synchronized manually.

Relevant platform documentation:

- [Codex `AGENTS.md` discovery and precedence](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [VS Code custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
- [VS Code prompt context](https://code.visualstudio.com/docs/agents/concepts/context)

## Decision

### Use `agent-tools` as the canonical repository

Do not create a separate repository. `agent-tools` already owns reusable agent
instructions and skills, and already contains the two required global sources.
Keeping synchronization tooling beside those sources avoids another repository,
release flow, and source-of-truth boundary.

Preserve the existing source filenames in version 1:

```text
instructions/evidence-led.md
instructions/user-indications.md
```

The filenames describe their purpose but do not confer instruction priority.
They are retained because the repository cannot establish whether external
consumers already reference their paths.

Add the Pi-specific source during implementation:

```text
instructions/pi/append-system.md
```

Project and repository `AGENTS.md` files remain outside this synchronization
model. They belong to the project instruction layer and may refine or override
global preferences according to each harness's precedence behavior.

### Add an isolated synchronization tool

Implement the synchronizer as an isolated tool rather than turning the entire
repository into a Node package:

```text
tools/instruction-sync/
├── src/
│   ├── cli.ts
│   ├── config.ts
│   ├── renderers.ts
│   └── sync.ts
├── tests/
├── dist/
│   └── agent-policy.mjs
└── package.json
```

Use strict TypeScript for the maintained source. Commit the compiled
`dist/agent-policy.mjs` artifact so a newly cloned repository can run with Node
without installing Bun, TypeScript, or package dependencies. The compiled CLI
must have no runtime package dependencies.

The intended commands are:

```text
configure  Create or update machine-local target configuration
doctor     Report resolved paths, unavailable harnesses, and invalid setup
check      Compare rendered content with configured targets without writing
sync       Apply validated changes to configured targets
```

Only canonical sources, tool source, tests, configuration examples, and the
compiled CLI are versioned. Generated files installed into harness directories
are machine-local and are not committed to this repository.

### Keep machine paths outside the repository

The tool must not embed usernames or absolute machine paths. `configure` stores
target paths in a machine-local configuration outside the Git checkout. It may
derive conventional defaults from environment variables such as `CODEX_HOME`
and the user's home directory, but it must display and validate every resolved
destination before the first write.

The configuration supports enabling any subset of the harnesses. Missing
harnesses are reported by `doctor` and skipped only when they are explicitly
disabled, not silently ignored.

### Render native outputs for each harness

Use the following semantic mapping:

| Canonical source | Pi | Codex | VS Code |
| --- | --- | --- | --- |
| `evidence-led.md` | `SYSTEM.md` | managed `developer_instructions` block in `config.toml` | invariants section of one combined instruction file |
| `user-indications.md` | global `agent/AGENTS.md` | global `AGENTS.md` | preferences section of the same combined instruction file |
| `pi/append-system.md` | `APPEND_SYSTEM.md` | not applicable | not applicable |

The Pi repository-level `.pi/AGENTS.md` is not generated because it describes
the Pi configuration project rather than a global user preference.

For Codex, manage only a clearly delimited `developer_instructions` region. The
synchronizer must preserve all unrelated `config.toml` content. Initial adoption
of an existing unmanaged value requires an explicit operation and a backup.

For VS Code, generate one combined `*.instructions.md` file with `applyTo: "**"`.
Place invariants before preferences inside that file to avoid relying on ordering
between multiple instruction files. The generated file remains a user-level
instruction, not a replacement for VS Code's built-in system instructions.

VS Code destinations are a configurable list. A machine may target its local VS
Code profile, `~/.copilot/instructions` for Agent Host, or both. This accounts
for local extension-host and Agent Host sessions without hard-coding one user
directory layout.

Normalize canonical sources and generated outputs to UTF-8 without a byte-order
mark and with LF line endings. Do not add timestamps or other volatile content
to generated files.

### Make synchronization explicit and defensive

Version 1 uses manual synchronization. Do not install startup, session, Git, or
filesystem-watcher hooks.

Before writing, `sync` must render and validate every enabled target. A failure
during preflight prevents all writes. Because destinations can span filesystems,
the tool must not claim multi-file atomicity. It should instead use same-directory
temporary files, atomic replacement where supported, and recovery backups for
targets that will change.

Track the last generated hash for each target in machine-local state. If a
target has changed independently since the previous successful sync, stop and
show the conflict instead of overwriting it. A force or adoption operation must
be explicit and retain a recoverable backup.

`check` is read-only and returns a non-zero exit status when targets are stale,
misconfigured, or conflicted. A successful `sync` followed immediately by
`check` must be idempotent and produce no diff.

The synchronization flow is:

```text
canonical sources
    -> harness renderers
    -> validate every enabled target
    -> create recovery backups
    -> replace changed targets
    -> record generated hashes
    -> verify the resulting state
```

## Alternatives Considered

### Create a dedicated repository

- Benefit: isolates the policy synchronizer from the skills collection.
- Cost: duplicates the existing instruction ownership boundary and requires
  another repository to clone, version, and discover.
- Rejected: `agent-tools` already contains the canonical instruction sources and
  its stated scope includes reusable agent tooling.

### Use startup hooks as the primary propagation mechanism

- Benefit: changes can appear automatically when a harness starts.
- Cost: lifecycle and injection semantics differ across Pi, Codex, and VS Code.
  Pi loads file resources before its `session_start` extension event, while
  direct context injection changes precedence and observability. VS Code hooks
  are also currently a preview feature.
- Deferred: hooks may later run `check` or support convenience workflows, but
  they are not part of version 1 and must not become the source of truth.

### Use symbolic links

- Benefit: eliminates copies for targets that consume plain Markdown.
- Cost: Codex needs TOML embedding, VS Code needs frontmatter and composition,
  and link behavior differs across Windows and WSL.
- Rejected: symbolic links do not cover all targets and weaken portability.

### Package the policy as a harness plugin

- Benefit: a plugin can bundle installation and lifecycle integration for one
  harness.
- Cost: Pi, Codex, and VS Code expose different plugin and prompt mechanisms.
- Rejected: no single plugin provides a stable authority boundary across all
  three harnesses.

### Continue manual copy and paste

- Benefit: requires no implementation.
- Cost: provides no drift detection, format validation, conflict protection, or
  reproducible setup on another machine.
- Rejected: this is the failure mode the synchronizer is intended to remove.

## Consequences

### Positive

- Global behavior is edited in one versioned repository.
- Each harness continues to consume its native configuration format.
- The repository can be cloned and configured on another machine without
  preserving the original user's absolute paths.
- `check` makes drift observable before or after synchronization.
- Generated content remains inspectable in the same files each harness already
  exposes.
- Harness-specific and project-specific guidance remain separate from global
  policy.

### Trade-offs and limitations

- The user must run `sync` after changing a canonical source in version 1.
- Committing a compiled JavaScript artifact requires a test that confirms it is
  current with the TypeScript source.
- Safely updating only one value in Codex `config.toml` requires targeted parsing
  and conflict detection.
- VS Code cannot reproduce Pi's replaceable system-prompt layer. Its generated
  invariants remain user instructions and cannot override higher-priority
  built-in instructions.
- Cross-filesystem updates cannot be truly atomic, so backups and rollback
  behavior are part of correctness.

## Out of Scope for Version 1

- Startup, session, Git, and filesystem-watcher hooks
- Dynamic prompt injection at runtime
- Rewriting or simplifying the canonical instruction content
- Generating repository-specific files such as `.pi/AGENTS.md`
- Synchronizing or installing skills
- Publishing the synchronizer to a package registry

## Open Implementation Details

The following choices do not change the accepted architecture and should be
resolved against implementation evidence:

- The minimum supported Node version, based on the APIs used by the compiled
  dependency-free CLI
- The conventional machine-local configuration and state paths on each
  supported operating system
- The generated VS Code filename
- Whether first-time adoption is exposed as a dedicated command or an explicit
  `sync` option

## Validation Requirements

Implementation is not complete until focused tests establish at least these
behaviors:

1. Identical sources and configuration produce byte-identical output across
   repeated runs.
2. `check` detects stale, missing, malformed, and independently modified targets
   without writing.
3. `sync` preserves unrelated Codex configuration and changes only its managed
   developer-instructions region.
4. The VS Code renderer emits valid frontmatter followed by invariants and then
   preferences in one file.
5. Pi-specific content appears only in `APPEND_SYSTEM.md`.
6. A failed preflight produces no target writes.
7. A failure after writes begin leaves backups sufficient to restore every
   changed target.
8. Windows, WSL, Linux, and macOS path handling is covered by deterministic
   path-resolution tests without depending on the test host's real home path.
9. The committed `dist/agent-policy.mjs` matches a clean build and runs with the
   documented minimum Node version without installing runtime dependencies.

Perform three end-to-end acceptance checks on a temporary directory before
syncing a real profile:

- Change an invariant, synchronize, and confirm every enabled harness target
  contains the new content in its intended layer.
- Modify a generated target manually and confirm both `check` and `sync` report
  a conflict without overwriting it.
- Add a project preference that conflicts with a global preference and confirm
  the harness preserves project-level precedence while retaining the global
  invariant.

## Implementation Boundary

This ADR accepts the architecture but does not implement the synchronizer or
modify active Pi, Codex, or VS Code configuration. Implementation should begin
with executable renderer and conflict-detection tests, then add the CLI and
machine-local configuration flow. Startup hooks remain out of scope for version
1.
