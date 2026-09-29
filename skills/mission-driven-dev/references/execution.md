# Execution

Implement one bounded assignment against an exact approved contract and repository state. Retain fast feedback without allowing stale context or an implementer's self-assessment to replace acceptance.

## Establish the Execution Boundary

Read the contract, state, applicable project instructions and evidence. Validate the state and inspect Git before dispatch. Resolve contradictions and interruptions first. Use one mission worktree from an explicitly recorded commit; accumulate accepted packets there sequentially.

Do not copy uncommitted source changes into a worktree implicitly. If they are prerequisites, ask how to preserve and include them. Keep contract files and `.missions/` records available at their referenced paths in the chosen worktree. Do not commit, stash, reset or clean the original checkout to make isolation convenient.

Generate only the next packet, with the exact mission revision, base commit, objective, prerequisites, file scope, exclusions, tests and expected evidence. Inspect actual accepted state before selecting that packet. Preserve launched packets; give a correction or revised assignment a new identity.

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

## Accept Before Checkpointing

Return the complete report and evidence to the coordinator. Do not mark your own assignment accepted. Compare the real diff, scope and required checks with the packet; record an independently authored packet result. Perform an authorized checkpoint only after acceptance, linking its exact commit to the packet and result. Do not stage unrelated work.

Use the result outcomes and record formats in [the artifact contract](artifacts.md). For correction, retain the failed attempt and prepare a bounded new packet. For a blocked condition or missing decision, retain changes and state precisely what must change. Bring repeated unsuccessful correction to the user; do not invent retry budgets.

Do not reset, clean, discard or quarantine work automatically. Require explicit disposition before destructive recovery. Keep implementation, validation, checkpoint, integration and deployment claims separate. Finish by requesting independent mission validation, not by declaring the mission completed yourself.
