# ADR-006: Keep the native Pi system prompt and append personal instructions

## Status

Accepted. Supersedes ADR-002 only for Pi's operating-layer destination, append composition and retirement of `pi-system`. Source discovery, tags, personal guidance, other harnesses and separate synchronization domains remain applicable.

## Date

2026-10-11

## Context

A Pi `SYSTEM.md` replacement omits native tool guidance and documentation sections. The local provider catalog compensates for some tool presentation when a custom prompt is present, but does not restore all native guidance. The user selected O1: keep Pi's native prompt and append personal operating instructions. Deleting the generated file alone is insufficient because the old renderer still targets it.

Verified local owners are Pi core's `core/resource-loader` and `core/system-prompt`, and harness-sync's `src/targets.ts`, `src/sync.ts` and `src/files.ts`. The installed daily 0.87.1 runtime and the separate 1.1.0 candidate support additive composition. This change does not promote either runtime or change extensions.

## Decision

Pi's default output is `APPEND_SYSTEM.md`, composed from the shared invariants, the existing tagged-module introduction, Pi system modules and then the dedicated `instructions/pi/APPEND_SYSTEM.md` source. Reuse the existing composition and rendering functions. Keep personal guidance in `AGENTS.md`. Preserve canonical source wording and the other harness outputs.

Retain `pi-system` as an explicit deletion target at the configured Pi directory. It never renders replacement content. An unchanged owned file is backed up and removed in the same transaction as the append update and ownership state. An already absent owned file loses its record without recreation. An absent unowned file is current and creates no ownership record. A modified, unmanaged or differently located ownership record blocks synchronization. Pi being disabled preserves its files and records.

Use existing explicit adoption only after reviewing content that would be removed. Adoption of `pi-system` records the current file hash without deleting or rewriting it. A later sync rechecks ownership, saves a recovery copy and removes the file. Independently edited append content retains the ordinary conflict protection. Failed transactions restore removed files and previous state. A moved directory with old ownership requires an explicit migration, because absence at the new path does not authorize forgetting the old record.

## Alternatives Considered

A configuration option retaining replacement mode is technically possible but adds an unused variation. The requested O1 behavior is the new Pi default. Removing the target without an explicit retirement leaves an existing `SYSTEM.md` active. Copying native Pi rules into canonical instructions creates another version-dependent source and is unnecessary.

## Consequences

Configuration and state schemas stay unchanged. Existing append ownership becomes stale when the composition changes. Conflicting outputs block all writes during normal instruction synchronization. Targeted adoption follows the scope defined in [ADR-004](004-separate-synchronization-commands.md#extension-targeted-adoption-scope-2026-10-11). Agent-sync remains independent. Recovery uses the existing target and ownership-state backups together. Restoring an old `SYSTEM.md` also restores replacement behavior until it is retired again.

## Validation Requirements

Exercise the real renderer, synchronizer and CLI with temporary files. Verify additive ordering and single occurrence, unchanged other harness outputs, absent and unchanged old files, independent edits, unmanaged files, mismatched paths, dry-run, adoption, backups, concurrent edits, rollback and idempotence. Rebuild both standalone Node bundles and verify them against source. Probe the real daily and candidate resource loaders and prompt builders with temporary agent directories, including native sections and safe_bash guidance. Provider session behavior and application to personal resources remain separate validation steps.
