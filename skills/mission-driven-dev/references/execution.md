# Execution

Implement one bounded assignment against an exact approved contract and repository state. Retain fast feedback without allowing stale context or an implementer's self-assessment to replace acceptance.

## Establish the Execution Boundary

Read the contract, state, applicable project instructions and evidence. Validate the state and inspect Git before dispatch. Resolve contradictions and interruptions first. Use one mission worktree from an explicitly recorded commit; accumulate accepted packets there sequentially.

Do not copy uncommitted source changes into a worktree implicitly. If they are prerequisites, ask how to preserve and include them. Keep contract files and `.missions/` records available at their referenced paths in the chosen worktree. Do not commit, stash, reset or clean the original checkout to make isolation convenient.

Generate only the next packet, with the exact mission revision, base commit, objective, prerequisites, file scope, exclusions, tests and expected evidence. Inspect actual accepted state before selecting that packet. Preserve launched packets; a rejected candidate's corrective assignment or a changed assignment needs a new identity.

## Choose the Execution Mode

The principal agent owns sequencing in either mode so the user does not have to distribute technical steps. Before implementation, present both modes with a recommendation grounded in the mission's actual dependencies, context and expertise needs:

| Mode | Implementation responsibility | Prefer when |
| --- | --- | --- |
| Direct | The principal agent prepares packets and implements them itself. | Work is concentrated or tightly coupled, useful context is already available, and delegation offers little benefit over its handoff cost. |
| Coordinated | The principal agent prepares packets, delegates implementation and examines complete worker reports. | Separable outcomes, distinct expertise or renewed implementation context justify handoffs. |

Length or risk alone does not justify multiple implementers. Coordination does not imply parallel writes: keep dependent packets sequential in the mission worktree. Parallel execution needs its own justified isolation and authority. Both modes retain the acceptance rules below; direct implementation does not mean self-validation.

Wait for the user's explicit mode choice unless already given. State which implementation and review delegations are actually available and authorized; mode preference alone is not blanket delegation permission. Resolve missing authority before the affected action. Record the choice, recommendation rationale and granted limits in the existing contract's Execution Boundaries when preparing it, or in linked execution evidence and state/history for an approved contract. Do not rewrite approved revisions or add a mode file, schema field or second plan.

Reuse that choice on resumption. If it conflicts with an explicit contract constraint, such as mandatory fresh implementation, resolve the conflict before work. If capabilities or scope require changing mode, explain the reason and obtain a new choice instead of silently switching. Preserve the user's harness and model configuration.

## Choose the Packet Boundary

The aim is an earlier verifiable result, not a quota of packets or a shorter total mission at any cost. Before preparing each packet, identify the remaining observable outcomes and their dependencies in the existing contract and accepted evidence. Select the smallest useful outcome that can be implemented and examined while leaving the system coherent. Briefly state the next result, its decisive proof and what remains afterward; detail only that packet.

When several outcomes can be examined separately, do not put the entire mission into the first packet. Keep changes together when splitting would break a shared invariant or leave misleading behavior. A small or genuinely indivisible mission may use one packet; explain that boundary rather than inventing a minimum count, time budget or file-count limit. For example, after stable position identities exist, an independently testable balance observation can precede unrelated activity reporting. Splitting its migration, backend, UI and tests into separate accepted packets would instead fragment one behavior.

Keep necessary environment preparation, focused research, diagnosis, implementation and test-driven iteration in the same packet when they serve its objective and stay within its scope and authority. A failed test during implementation is not a rejected packet. Continue the current assignment through its required checks rather than returning each intermediate step for acceptance.

Split when the next assignment has a distinct deliverable or when a changed boundary requires a new approved assignment. Preserve explicit contract review points. A separately requested investigation can be a deliverable, including a useful negative result; an incidental diagnostic does not become one merely because it produced a report or commit. These boundaries do not authorize an installation, infrastructure repair, provider change or other external action that needs separate permission.

When a prerequisite or missing decision blocks execution, preserve the current packet, changes and compact evidence. Record the interruption in the existing state/history and report the failed observation, its consequence and the exact fact, condition or authority needed to continue. Do not create an investigation-acceptance packet, independent review or checkpoint merely to report the blocker. Resume the same assignment when the blocker clears and its contract, scope and authority still apply. A new session or transport commit alone does not change that assignment.

## Dispatch in the Selected Mode

In direct mode, implement the bounded packet in the principal agent's context. Read the exact sources and record actual provenance; retained conversation is not a fresh context. Independent packet acceptance still requires a different actor.

In coordinated mode, use the implementation [handoff template](../assets/handoffs.md). Check the available tool contract for a no-history context and explicit implementation delegation authority. Launch only the required worker and wait for its complete terminal report. If either capability or authorization is missing, include the ready-to-run manual handoff for the user to launch in a qualifying context and record what is missing. A request for native delegation permission may accompany that fallback, but does not replace it. A fork inheriting the conversation is not fresh; do not substitute direct implementation without the user's choice. Do not create user-owned tasks or install extensions as an implicit substitute for unavailable delegation.

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

Before advancing to the next packet, obtain acceptance from an actor who did not implement the current packet. In direct mode, the principal agent hands its report, diff and evidence to an authorized independent reviewer using the packet acceptance template. In coordinated mode, the non-implementing coordinator can accept the worker's result after examining the actual diff, scope and checks; add reviewers only where required or justified by risk. A role change or self-review does not create independence. Use focused checks for packet acceptance, not a repeat of the whole mission's validation by default. If independent acceptance is unavailable, retain the candidate and provide its handoff, without claiming acceptance or advancing past that gate.

Record the actual accepting actor in the packet result, separately from every implementer, even when the principal agent transcribes the report. Perform an authorized checkpoint only after acceptance, linking its exact commit to the packet and result. Do not stage unrelated work. Reporting an incomplete or blocked assignment follows the interruption path above and does not depend on an acceptance review.

Use the result outcomes and record formats in [the artifact contract](artifacts.md). After independent validation requires correction, retain the rejected candidate and findings and prepare a bounded corrective packet. Normal implementation fixes stay within the active packet. Bring repeated unsuccessful corrective attempts to the user; do not invent retry budgets.

An authorized commit or push can preserve unfinished work or transport a candidate without claiming acceptance. An administrative commit recording an actual verdict does not by itself require another packet or review. Keep the reviewed commit distinct from the receipt commit; if a later edit changes the deliverable, scope, criteria or evidence supporting acceptance, revalidate the affected claims before accepting it. Never present unreviewed changes as covered by the earlier verdict.

Do not reset, clean, discard or quarantine work automatically. Require explicit disposition before destructive recovery. Keep implementation, validation, checkpoint, integration and deployment claims separate. Request independent mission validation for mission acceptance; never close without that result or delay a blocker report waiting for it.

## Continue Within the Authorized Mission

After independent packet acceptance, the principal agent reports the result, proof and next outcome, then prepares and executes the next packet when the mission's authority covers it. Do not ask the user to approve each routine test, packet boundary or technical detail again. Preserve explicit user-imposed stops and contract gates. Return substantive changes of scope, constraints, required validation, authority or execution mode to the user; report real blockers and repeated unsuccessful corrections. Do not infer authorization to start the next mission from permission to finish this one.
