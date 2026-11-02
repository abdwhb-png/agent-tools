# ADR-009: Own only the Codex `developer_instructions` assignment

## Status

Accepted. Refines the Codex managed-region section of [ADR-001](/home/abdwhb/engineering/agent-tools/docs/decisions/001-cross-harness-instruction-synchronization.md).

## Date

2026-11-02

## Context

Instruction synchronization owns a marked region inside Codex's `config.toml`. The original implementation treated the region as everything between the BEGIN and END markers, so the region was structurally wider than the value it owned: any line that Codex wrote between the closing `"""` of the TOML string and the END marker became part of the managed content.

Two live failures followed from that.

The primary home accumulated `service_tier = "default"` and `plan_mode_reasoning_effort = "high"` between the closing delimiter and the END marker, because Codex writes top-level configuration keys next to that value. The region hash then differed from the recorded ownership hash, so `doctor` reported `conflict` even though every byte of managed content was unchanged. `adopt` was the documented remedy and the wrong one: it rewrites the region with rendered content and would have deleted both settings.

The Windows home lost its END marker entirely. `managedCodexBlock` treats a single surviving marker as malformed, so one file blocked every Codex instruction target, including the healthy primary home, because one instruction configuration covers all homes.

## Decision

The owned region is exactly the `developer_instructions = """…"""` assignment. Marker placement is derived on every render rather than trusted from the file.

Rendering removes any existing marker lines, then inserts BEGIN immediately before the assignment and END immediately after its closing delimiter. No configuration line is ever reordered, so table association and key order are preserved; only the inert comment markers move. Foreign keys that Codex wrote above or below the value keep their position relative to their neighbours.

Content extraction wraps the assignment as found in the file, synthesizing a missing marker when exactly one survived. This makes a lost marker a repairable layout difference instead of a conflict, while content drift inside the assignment still hashes differently and remains a `conflict`.

`assessTargets` gains one Codex-only status rule: when file content equals the recorded ownership hash and the canonical value, but the normalized file differs from the desired output, the target is `stale` with a marker-repair detail. The write is visible in sync output and produces a backup like any other update.

Unchanged boundaries: an assignment with no markers at all is still unmanaged and still requires explicit `adopt`; an ambiguous file with zero or multiple assignments under markers is still a hard error; the agent domain and every non-Codex target are untouched.

## Alternatives Considered

- **Keep markers authoritative and repair by hand.** That is the status quo that produced both failures, and its repair step deletes adjacent settings when the documented `adopt` command is used.
- **Move the managed content into `AGENTS.md` and stop owning `config.toml`.** Cleanest ownership boundary, rejected for now: `developer_instructions` is delivered as system-level content, while `AGENTS.md` is appended guidance, so the change would weaken instruction precedence. It stays the escalation path if Codex is observed rewriting the assignment text itself.
- **Relocate stray lines instead of relocating markers.** Rejected: moving a TOML key across a table header changes which table it belongs to, so a layout repair could silently alter configuration meaning.
- **Repair only when the surviving region hash matches the baseline.** Rejected because the Windows file also had stale content, so the repair would still have required manual work; the assignment is unambiguous, so ambiguity is not what needs guarding.

## Consequences

- Codex settings written near `developer_instructions` never produce a false conflict and are never deleted by adoption.
- A single lost marker is repaired by an ordinary `sync`, reported as `stale`.
- Files that genuinely diverge inside the assignment still block with `conflict`, so repairs remain distinguishable from edits.
- `config.toml` may be rewritten once per repair even when only marker positions changed; the write is printed and backed up.
- Anyone reading the file sees markers wrapped tightly around the value instead of a region that can absorb neighbouring keys.

## Validation Requirements

Renderer coverage must prove that keys above and below the value survive, that a single surviving marker is rebuilt, that duplicate assignments and marker-only files still fail, that rendering is idempotent with exactly one marker pair, and that CRLF input normalizes while preserving neighbouring keys. Sync coverage must prove that displaced markers report `stale` and are repaired without data loss, that edits inside the assignment stay `conflict`, and that a missing marker is restored to a byte-identical file. Live verification must confirm both homes converge, keep unrelated keys and hook blocks, and reach an idempotent second run.
