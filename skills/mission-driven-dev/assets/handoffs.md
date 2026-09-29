# Fresh-Context Handoffs

Fill these templates from verified sources; do not paste unresolved proposals as approved decisions. Use ordinary user requests, not new slash commands. Pass explicit absolute paths when crossing working directories. Preserve the source packet's relative references.

## Implementation

Execute only packet `<absolute packet path>` for mission `<id>`, contract revision `<revision>`, in worktree `<path>` at accepted base `<full commit>`.

Read this skill's execution reference, the packet, its exact Mission Contract and the listed project instructions/ADRs. Use no inherited design conversation. Treat any mismatch between actual Git state, packet and contract as a decision to resolve before implementation.

Implement the bounded outcome with the specified tests and TDD evidence. Do not expand scope, create further agents, commit, merge, deploy or discard changes unless the explicit authority below permits that action.

Authority: `<what is allowed and prohibited>`. Return actor/context identity, actual starting/ending Git state, changed files, exact checks and outcomes, evidence paths, unresolved questions and the requested result. Do not accept your own work or mark the mission complete.

## Mission Validation

Independently validate mission `<id>`, contract revision `<revision>`, in `<worktree>` over diff `<base>..<reviewed revision>` and any explicitly included uncommitted changes. Read `<contract>`, `<state>`, required ADRs and evidence. Do not inherit the implementation conversation.

Read this skill's validation reference. Inspect the actual changes and required evidence, and run authorized focused checks. Do not edit production code. Specialist delegation authority: `<explicit permission or none>`.

Return validator/context identity, implementer identities, the reviewed revisions, concrete findings, checks run/not run and their limits, evidence references and one outcome: accepted, correction_required, needs_decision or blocked. Do not claim acceptance if mandatory evidence or independence is missing.
