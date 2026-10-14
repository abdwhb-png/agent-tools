# ADR-004: Separate synchronization commands with shared mechanisms

Status: Accepted

Date: 2026-10-03

## Decision

Keep the `harness-sync` package with two commands: `instruction-sync` for Pi, Codex, VS Code and Zed instructions, and `agent-sync` for Pi, Codex and VS Code agents. Their adjacent JSON configurations and ownership state files are independent. Each entrypoint binds its domain, so users cannot accidentally select both workflows or configure one through the other. This supersedes ADR-003's combined CLI, resource selectors and shared configuration/state placement. Native agent sources and rendering remain as defined in ADR-003, including its VS Code extension dated 2026-10-13.

Centralize shared mechanisms in one CLI implementation and one file transaction. Configuration validation owns the supported harness list and reusable native destination validation. Migration owns partitioning of legacy settings and ownership. Synchronization computes one plan for preview and execution. Configuration changes, imports, runtime replacements, deletions and state writes reuse the same backups, concurrent-change checks, atomic replacement and rollback implementation. Domain-specific rendering remains in its existing modules. Separate workflows do not justify duplicated parsers, planners or transaction implementations.

The two standalone Node bundles embed copies of the shared implementation because each artifact must run without installed dependencies. Both are generated from the same authoritative TypeScript sources through one build script. Distribution verification rebuilds and checks every artifact. Source fixes must never be applied independently to generated bundles.

## Configuration and migration

Profiles use schema version 2, a fixed `kind` of `instructions` or `agents`, an `enabled` boolean and domain-specific harness settings. The old `resources` selectors are internal legacy configuration only. Default configuration files are `instructions.config.json` and `agents.config.json` adjacent to the tool. Ownership retains schema version 1 and existing target IDs, paths and hashes under the existing platform-specific `agent-policy` state root, in separate `instructions/state.json` and `agents/state.json` files.

Each command provides `configure --import-legacy`, previewed by default and applied only with `--apply`. Optional `--legacy-config` and `--legacy-state` override source paths. Import settings before using ordinary configure flags to change destinations or enabled status. Existing agent ownership metadata partitions the original state. Imports preserve disabled workflows, named destinations, instruction markers and agent retirement lists where applicable. Legacy inputs receive private recovery copies and remain untouched. Divergent destinations block the entire import, identical imports do nothing, and a failed configuration/state transaction rolls back its changes. Runtime target files are outside this migration.

The former `harness-sync` executable only prints replacement commands. Calls requesting work exit with code 2 and perform no filesystem operations.

## Preview and execution

`sync --dry-run`, `adopt --dry-run` and `configure --dry-run` never create or modify targets, state, temporary files, directories or backups. Sync and adoption previews report target operations, ownership changes and preflight conflicts without exposing target contents. A feasible preview exits 0. Invalid or blocked operations exit 2. `check` and `doctor` remain read-only and exit 1 when targets are not current.

Sync applies by default. Configure previews by default. Adoption requires either `--dry-run` or `--apply`, and those modes cannot be combined. Agent deletion continues requiring matching recorded ownership and current content. During sync, hash conflicts block sibling changes. Targeted adoption uses the scope defined below. Replacements, deletions and ownership state participate in one transaction with recovery backups. Neither command installs tools, synchronizes skills, manages global MCP registries or restarts runtimes.

## Extension: Targeted adoption scope (2026-10-11)

`adopt --target` authorizes changes only to the selected target IDs. Ownership conflicts on unselected targets do not block this operation, because their content and ownership records remain untouched. The preview reports them as skipped, while `doctor` and `check` continue reporting their conflicts. This applies to instructions and agents through the shared planner, including unselected retirement targets.

`sync` retains the global conflict gate for enabled targets. `adopt --all` explicitly adopts all enabled targets as before. Configuration and canonical source validation remain global within the domain, and unknown target IDs remain errors. Scoped adoption still verifies the shared ownership-state snapshot and uses the existing transaction, backups, concurrent-write checks and rollback. Tests must show selected writes succeed, unrelated files and records remain unchanged, and a later sync remains blocked by unresolved conflicts.
