# Execution

Implement one bounded assignment against an exact approved contract and repository state. Retain fast feedback without allowing stale context or an implementer's self-assessment to replace acceptance.

## Establish the Execution Boundary

Read the contract, state, applicable project instructions and evidence. Validate the state and inspect Git before dispatch. Resolve contradictions and interruptions first. Use one mission worktree from an explicitly recorded commit; accumulate accepted packets there sequentially.

Do not copy uncommitted source changes into a worktree implicitly. If they are prerequisites, ask how to preserve and include them. Keep contract files and `.missions/` records available at their referenced paths in the chosen worktree. Do not commit, stash, reset or clean the original checkout to make isolation convenient.

Generate only the next packet, with the exact mission revision, base commit, objective, prerequisites, file scope, exclusions, tests and expected evidence. Inspect actual accepted state before selecting that packet. Preserve launched packets; a rejected candidate's corrective assignment or a changed assignment needs a new identity.

## Choose the Packet Boundary

A packet should deliver one coherent outcome that can be independently judged. Splitting routine steps into separately accepted packets adds handoffs without improving the outcome. Keep necessary environment preparation, focused research, diagnosis, implementation and test-driven iteration in the same packet when they serve its objective and stay within its scope and authority. A failed test during implementation is not a rejected packet. Continue the current assignment through its required checks rather than returning each intermediate step for acceptance.

Split when the next assignment has a distinct deliverable or when a changed boundary requires a new approved assignment. Preserve explicit contract review points. A separately requested investigation can be a deliverable, including a useful negative result; an incidental diagnostic does not become one merely because it produced a report or commit. These boundaries do not authorize an installation, infrastructure repair, provider change or other external action that needs separate permission.

When a prerequisite or missing decision blocks execution, preserve the current packet, changes and compact evidence. Record the interruption in the existing state/history and report the failed observation, its consequence and the exact fact, condition or authority needed to continue. Do not create an investigation-acceptance packet, independent review or checkpoint merely to report the blocker. Resume the same assignment when the blocker clears and its contract, scope and authority still apply. A new session or transport commit alone does not change that assignment.

## Select a Fresh Context

Use the implementation handoff in [the templates](../assets/handoffs.md). Check the currently available tool contract for a no-history context and confirm explicit delegation authority for this work. A fork inheriting the conversation is not fresh. Do not create user-owned tasks or install extensions as an implicit substitute for unavailable delegation.

When authorized fresh delegation is available, launch only the required worker and wait for its complete terminal report. Otherwise give the user the ready-to-run handoff. Record that execution is awaiting that context; do not claim a same-context implementation satisfied a fresh-context requirement.

Pass the contract, required ADRs, source evidence and current revision, not the full brainstorming conversation. Keep essential context; remove stale reasoning, not constraints. Preserve the user's chosen harness and model configuration.

## Implement with Executable Feedback

For a behavior change, bug fix or domain rule:

1. Write one minimal test through the real owning module's public boundary. State the realistic defect it should catch. Import production code; do not copy implementations into tests.
2. Run the test and confirm RED for the intended missing or incorrect behavior. Repair import or fixture errors before counting RED.
3. Implement only what that behavior requires. Mock only genuinely external, nondeterministic or impractical boundaries. Derive expected values independently of the behavior being tested.
4. Run the same test to GREEN, then relevant nearby tests. Never weaken a correct assertion to get green.
5. Refactor without changing the approved behavior and rerun the affected checks.

For behavior-preserving refactoring, first establish characterization coverage sensitive to plausible regressions and keep it green. Do not delete working code to fabricate RED. For prose-only work, validate consistency. For configuration or tooling, use the smallest executable before/after check where RED is infeasible and record the exception explicitly.

Keep feedback focused. After behavior stabilizes, format task files and run relevant diagnostics once. Use project-wide checks only when a repository/CI contract, explicit request or genuinely transversal risk requires them; state why. Report commands, results, revisions, limits and checks not run.

Keep one canonical record of each useful observation. Preserve enough evidence to reproduce or assess the outcome and resume work; reference existing records instead of duplicating raw exports, rendered reports or unchanged evidence in each attempt.

## Accept Before Checkpointing

When the packet's deliverable is ready for acceptance, return the complete report and evidence to the coordinator. Do not mark your own assignment accepted. Compare the real diff, scope and required checks with the packet; record an independently authored packet result. Perform an authorized checkpoint only after acceptance, linking its exact commit to the packet and result. Do not stage unrelated work. Reporting an incomplete or blocked assignment follows the interruption path above and does not depend on an acceptance review.

Use the result outcomes and record formats in [the artifact contract](artifacts.md). After independent validation requires correction, retain the rejected candidate and findings and prepare a bounded corrective packet. Normal implementation fixes stay within the active packet. Bring repeated unsuccessful corrective attempts to the user; do not invent retry budgets.

An authorized commit or push can preserve unfinished work or transport a candidate without claiming acceptance. An administrative commit recording an actual verdict does not by itself require another packet or review. Keep the reviewed commit distinct from the receipt commit; if a later edit changes the deliverable, scope, criteria or evidence supporting acceptance, revalidate the affected claims before accepting it. Never present unreviewed changes as covered by the earlier verdict.

Do not reset, clean, discard or quarantine work automatically. Require explicit disposition before destructive recovery. Keep implementation, validation, checkpoint, integration and deployment claims separate. Request independent mission validation for mission acceptance; never declare the mission completed yourself or delay a blocker report waiting for that validation.
