# Resumption and Inspection

Recover the next authorized action from durable evidence, not remembered conversation. Keep an inspection read-only unless the user also authorizes progression.

## Establish Current Truth

Locate the supplied mission/state or inspect only the plausible project convention. Read the exact active contract, latest state and history, applicable decisions, latest attempts/results and Git state. Use explicit references across documentation and `.missions/`; do not assume a particular current working directory.

Run the structural validator on the state. Verify referenced commits and actual worktree changes separately. Report missing, inconsistent, stale or inaccessible records before claiming readiness. Do not select whichever conflicting source looks newest, reconstruct approval from a summary, or silently repair the journal.

## Distinguish History from Current Authority

Keep old packets and results attached to their original revisions. Their age alone is not a failure. Check that the packet being dispatched references the current mission revision and accepted Git state. Do not relabel historical proof as proof for a revised requirement.

Summarize the destination, approved wave, active mission/revision, accepted work, state's `executionMode` and its supporting decision/authority evidence, interruption or missing decision, required remaining evidence and next permitted step. Show what is known and what has not been verified. For an older state missing the field, follow [the compatibility rule](artifacts.md#state-and-history) before dispatch. Apply [mode selection](execution.md#choose-the-execution-mode) only where the actual choice is missing or must change, not on every new session.

## Continue Only Within Authority

If inspection alone was requested, stop after reporting. If resumption is authorized and the next step is fully bounded, load the relevant phase. Reuse the current packet when its assignment remains valid; prepare a new packet only at an [execution boundary](execution.md#choose-the-packet-boundary), not merely because work was paused or a session changed.

A lost session or repaired prerequisite does not establish that a previous worker stopped. Before resuming writes or relaunching the assignment, check existing actors' identity, live status, packet and worktree in the current harness. If a worker is still active on that assignment, recover or await its result rather than launch a duplicate or implement alongside it. If its status cannot be established, pause overlapping writes and report the missing confirmation. Once it is confirmed inactive, inspect retained changes and any completed report before continuing. Do not stop or replace it without applicable authority. Keep this check in existing state/history, not a new phase or artifact. Recheck delegation authority and fresh-context capabilities before dispatch.

For `needs_decision`, ask the precise unresolved question with meaningful options. For `blocked`, identify the external condition and any independent work still authorized. For correction, preserve the rejected attempt. Do not clear an interruption merely because a new session has started.

Return changes to destination, scope, constraints or validation requirements to the user. Do not reopen a completed mission: preserve its history and prepare a new mission or explicit superseding decision.
