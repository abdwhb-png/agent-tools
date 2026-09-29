# Artifact Contract V1

Keep authoritative intent in project documentation and execution records in `.missions/`. Use explicit references to connect them, not copies of contracts. Adapt the default directories to an established convention without changing identity or reference semantics.

## Placement and Identity

| Artifact | Default location | Owner |
| --- | --- | --- |
| Product behavior, architecture, convergence | Existing project convention | Existing PRD/Product Contract, ADR or historical convergence record. |
| Roadmap revisions | `docs/roadmaps/<destination>/r<N>.md` | Route to one destination; may span repositories. |
| Mission Contract revisions | `docs/missions/<id>/r<N>.md` | Approved intent for one repository in V1. |
| Packets, results, state, history and evidence | `.missions/<id>/` | Assignments and observed execution. |

Keep the same mission id in its contract and state. Resolve each local path relative to its containing file, not the terminal's working directory. Use native paths for the executing OS; do not treat a Windows path as a WSL path. The validator canonicalizes artifact symlinks before resolving their contents; prefer direct artifact paths.

Do not ignore `.missions/` merely because it is hidden. Retain records and compact redacted proof needed for handoff and recovery. Keep secrets and unnecessary raw logs out of artifacts. Decide any large/external evidence retention explicitly; local evidence references must remain available. Do not infer commit permission from this convention.

## Common Metadata and References

For roadmap, mission and packet Markdown, place one strict JSON object between opening and closing `---` lines, followed by readable prose. This is the artifact format, not the YAML `SKILL.md` format. State and result records are JSON; history is JSONL.

Require `schemaVersion: 1`, `kind`, a nonempty `id` and positive integer `revision` on every non-history artifact. Use `kind: roadmap | mission | packet | state | result`. An optional `refs` array links other relevant artifacts. Additional metadata is allowed but has no validation semantics unless specified here; the validator does not inspect arbitrary extra fields as references.

Represent a workflow reference as `{ "kind": "mission", "id": "example", "revision": 1, "path": "relative/file.md" }`, using the referenced artifact's kind. For ordinary documents or evidence use `{ "kind": "document" | "evidence", "path": "relative/file" }`; their existence is checked, not their content or truth. References are local files, not URLs or commands. Preserve external-source URLs inside prose or a local evidence record, not as machine references.

Preserve approved contract revisions and launched packets. Create a new revision/file for changed intent and a new packet identity for a corrective attempt. An old reference remains valid if its exact historical target exists. Do not rewrite old files to make an active reference look current. The read-only validator cannot prove that an earlier version of a file was not overwritten; verify Git history and retained evidence separately.

## Document Kinds

For a **roadmap**, use the common metadata and optional references. Describe destination, exclusions, observable mission outcomes, dependencies, wave approval frame and reassessment conditions. Do not require files for distant missions that have not been detailed.

For a **mission**, additionally require `repository`: a path to the existing repository directory, relative to the contract. This checks directory availability, not Git identity. Write these prose sections, shortening content rather than creating parallel spec files:

- **Outcome:** observable result and why it matters.
- **Starting Evidence:** verified behavior, code owners, source revision and uncertainty.
- **Decisions and Constraints:** approved choices, applicable ADRs and obligations.
- **Scope:** included/excluded work and permitted external actions.
- **Validation Contract:** behavior, counterexamples, failure states and required checks/evidence.
- **Execution Boundaries:** decisions workers may make and escalation conditions.
- **Completion:** deliverables, independent acceptance and capabilities unlocked.

For a **packet**, additionally require `mission`: an exact contract reference, and `baseCommit`: the full 40- or 64-character lowercase Git object id. Describe one objective, prerequisites, relevant files, exclusions, checks, required handoff and authority. Verify the commit and actual working state separately; a syntactically valid hash is not proof that it exists.

## Results and Checkpoints

For a **result**, require `mission`, `scope: packet | mission`, `packet` (a packet reference for packet scope; null for mission scope), `actor`, a nonempty `implementers` identity array, `freshContext` boolean, `outcome`, `summary` and `evidence` array of evidence references.

Use these outcomes for attempts and validation, not as mission phases:

| Outcome | Action |
| --- | --- |
| `accepted` | Accept the bounded result when required evidence is actually sufficient. |
| `correction_required` | Preserve findings and prepare a bounded correction. |
| `needs_decision` | Return the precise missing choice or authority to the user. |
| `blocked` | Record the technical/external condition required to resume. |

For accepted results, record at least one proof reference and an actor different from every implementer. For mission acceptance, record `freshContext: true` only after establishing actual independence. Structural checks on these claims do not authenticate actors or contexts. Preserve every result rather than replacing a failed report with a successful one.

Record a checkpoint only after independent packet acceptance and commit authorization. Its fields are `packet`, `result`, `commit` and `actor`. Reference a registered attempt and accepted packet result; the accepting actor cannot be an implementer. Record evidence for the actual commit; do not stage unrelated work.

## State and History

For **state**, additionally require:

| Field | Meaning |
| --- | --- |
| `mission` | Active contract reference; its id equals state id. |
| `status` | `draft`, `ready`, `executing`, `validating`, `completed`, `failed`, `cancelled` or `superseded`. |
| `interruption` | null, or `{ "kind": "needs_decision" | "blocked", "reason": "..." }`; preserve the current phase. |
| `history`, `lastSequence` | Local journal path and last positive event sequence. |
| `currentPacket` | Active packet reference or null; register it in attempts first. |
| `attempts` | Array of `{ "packet": <reference>, "result": <reference or null> }`; retain unsuccessful attempts. |
| `checkpoints` | Accepted checkpoints as defined above. |
| `evidence` | Local evidence references supporting the current state. |
| `validation` | Mission result reference for the active revision, or null. |

Increment state revision whenever recording a change. Append one JSONL **event** with `schemaVersion: 1`, `kind: event`, consecutive `sequence` starting at 1, `stateRevision`, ISO timestamp with timezone `at`, `actor`, exact `mission` reference, resulting `status`, `interruption`, `reason` and `evidence`. Paths in an event belong to the journal file. Start in draft. Keep one mission id, nondecreasing contract revisions and increasing state revisions. Keep the state snapshot aligned with the last event; this is an audit journal, not a required event-sourcing system.

Allow these transitions, plus same-phase record updates for nonterminal phases:

| From | Allowed next phases |
| --- | --- |
| draft | ready, cancelled, superseded |
| ready | draft, executing, cancelled, superseded |
| executing | validating, failed, cancelled, superseded |
| validating | executing, completed, failed, cancelled, superseded |
| completed, failed, cancelled, superseded | None; preserve terminal history. |

Require explicit user decisions for alternative terminal closures. Interruptions do not advance a phase. Do not clear one without the resolving evidence or decision. Revise future work at mission boundaries; stop sooner on a blocking contradiction.

Before completion, clear active work and interruptions, reconcile every launched attempt and obtain an accepted independent mission result for the active revision. Validation of state compares only the active packet to the active mission revision; historical packets remain attached to their original contracts. Validate state before launch, not merely a packet in isolation.

## Validator Boundary

Run `node <skill>/scripts/validate.mjs <artifact> [--json]` on Markdown, JSON or a JSONL journal. The JSON output is `{ "valid": boolean, "issues": [{ "path": string, "rule": string, "message": string }] }`. Exit 0 means structurally consistent; 1 means invalid input or a missing typed reference; 2 means invocation or artifact-read failure.

Inspect the diagnostics and underlying evidence. Do not treat a schema check as semantic approval, a scheduler, a journal writer, a Git check or enforcement against concurrent/manual edits. No cited command is executed, no remote URL is fetched and no input is rewritten.
