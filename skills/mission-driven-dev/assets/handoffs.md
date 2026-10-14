# Fresh-Context Handoffs

Fill these templates from verified sources; do not paste unresolved proposals as approved decisions. Use ordinary user requests, not new slash commands. Pass explicit absolute paths when crossing working directories. Preserve the source packet's relative references.

## Implementation

Execution mode and authority evidence: `<coordinated mode choice and scoped delegation, or authorized manual handoff>`. Execute only packet `<absolute packet path>` for mission `<id>`, contract revision `<revision>`, in worktree `<path>` with packet base `<full commit>` and current revision `<full commit>`. This is the next bounded outcome, not permission to implement the rest of the mission.

Read this skill's execution reference, the packet, its exact Mission Contract and the listed project instructions/ADRs. Use no inherited design conversation. Verify retained changes from the packet base to the current state, including authorized unfinished work. Resolve unexplained divergence or a stale contract before implementation; do not treat those retained in-scope changes alone as a new assignment.

Implement the bounded outcome with the specified tests and TDD evidence. Apply the execution reference's packet boundaries to preparation, diagnosis, iteration and interruptions; return a real blocker directly rather than adding an acceptance step for its investigation. Do not expand scope, create further agents, commit, merge, deploy or discard changes unless the explicit authority below permits that action.

Authority: `<what is allowed and prohibited>`. Return actor/context identity, actual starting/ending Git state, changed files, exact checks and outcomes, evidence paths, unresolved questions and the requested result. Do not accept your own work or mark the mission complete.

## Packet Acceptance

Independently review packet `<absolute packet path>` for mission `<id>`, contract revision `<revision>`, in `<worktree>`. Scope: `<packet diff/base, current revision and explicitly included uncommitted changes>`. Implementer: `<actual actor>`. Review authority and evidence: `<permission and report paths>`. Do not inherit the implementation conversation or edit production code.

Read this skill's validation reference, the packet, exact contract and relevant project instructions. Inspect the actual changes and use focused checks for this outcome and affected invariants. Return a packet-scoped result with your identity/context provenance, implementer identities, findings, checks and limits, evidence and outcome. Do not claim whole-mission acceptance from this packet review.

## Mission Validation

Independently validate mission `<id>`, contract revision `<revision>`, in `<worktree>` over diff `<base>..<reviewed revision>` and any explicitly included uncommitted changes. Read `<contract>`, `<state>`, required ADRs and evidence. Do not inherit the implementation conversation.

Read this skill's validation reference. Inspect the actual changes and required evidence, and run authorized focused checks. Do not edit production code. Specialist delegation authority: `<explicit permission or none>`.

Return validator/context identity, implementer identities, the reviewed revisions, concrete findings, checks run/not run and their limits, evidence references and one outcome: accepted, correction_required, needs_decision or blocked. Do not claim acceptance if mandatory evidence or independence is missing.
