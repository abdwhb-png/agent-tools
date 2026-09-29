# Independent Validation

Judge the complete mission against its approved contract rather than the implementer's narrative. Use a fresh context so earlier hypotheses do not quietly become acceptance criteria.

## Establish Independence and Scope

Read the validation handoff, exact contract revision, applicable ADRs, complete relevant diff, state and cited evidence. Validate record structure, then inspect the underlying evidence. Record the actual validator identity and context provenance; different role labels alone do not prove independence.

Use an explicitly authorized, no-history reviewer with read-only project authority. If that capability is unavailable, provide the handoff for the user to launch. Report an incomplete validation if the reviewer fails or only returns partial output. Never replace missing independent validation with self-review.

Add specialist review only for an identified risk and within delegation authority. Do not fan out reviewers merely because they are available. Do not give reviewers permission to repair production code.

## Examine the Required Evidence

| Layer | Inspect |
| --- | --- |
| Behavior | Positive case, legitimate counterexample/boundary and explicit failure or incomplete state. |
| Executable checks | Intended RED then GREEN for changed behavior, relevant regressions and justified exceptions. |
| Conformance | Real changes against scope, ADRs, ownership and architectural constraints. |
| Real use | Actual CLI, browser or runtime observations when required; code inspection alone is not runtime proof. |
| Provenance | Exact revisions, commands, outcomes, environment limits, fresh-context evidence and checks not run. |

Use the cheapest relevant executable check that could falsify the claim. If an observation needs unavailable authority or infrastructure, report the missing evidence. A green unit suite cannot waive a required integration check, and an AI review cannot waive a failed executable test.

## Record the Result

Identify concrete findings with source locations or violated criteria, impact and the bounded correction needed. Use `accepted` only when all applicable mandatory evidence supports the outcome. Use `correction_required` for concrete defects, `needs_decision` for an unresolved choice or authority, and `blocked` for a technical/external condition.

Write a mission-scoped result referencing its exact contract and evidence. Record the implementers separately from the validator. Preserve unsuccessful results. Return findings to execution for bounded correction; rerun checks invalidated by the correction and ensure the remaining evidence still applies to the reviewed revision.

Only the authorized coordinator may close the mission after accepting the independent result and reconciling pending attempts. Do not treat a structurally valid result file as proof that validation occurred. Reassess the next roadmap boundary after closure, keeping completed records intact.
