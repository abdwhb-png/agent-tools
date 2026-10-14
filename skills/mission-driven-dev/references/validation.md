# Independent Validation

Judge the assigned packet or complete mission against its approved scope rather than the implementer's narrative. For delegated review, use a fresh context so earlier hypotheses do not quietly become acceptance criteria. The [execution reference](execution.md#accept-before-checkpointing) owns packet acceptance responsibilities in both implementation modes.

## Establish Independence and Scope

Start validation at an acceptance point required by the approved contract or for an explicitly requested review. Internal diagnostics and prerequisite checks follow the [execution boundary rules](execution.md#choose-the-packet-boundary); their completion or blockage alone does not add an independent review. This does not waive packet acceptance, final mission validation or an explicit intermediate gate.

Read the validation handoff, exact contract revision, applicable ADRs, complete relevant diff, state and cited evidence. For packet scope, inspect that outcome and affected boundaries without rerunning unrelated mission checks; for mission scope, establish coverage of the complete contract. Packet acceptance does not replace final mission validation. Validate record structure, then inspect the underlying evidence. Record the actual validator identity and context provenance; different role labels alone do not prove independence.

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

Write a result with the actual scope, referencing its exact contract, packet when applicable, and evidence. Record the implementers separately from the validator. Preserve unsuccessful results. Return findings to execution for bounded correction; rerun checks invalidated by the correction and ensure the remaining evidence still applies to the reviewed revision.

The authorized principal agent may record mission closure in either execution mode only after obtaining the accepted independent mission result and reconciling pending attempts. Administrative recording is not self-acceptance: preserve the independent validator's actual identity and report. Do not treat a structurally valid result file as proof that validation occurred. Reassess the next roadmap boundary after closure, keeping completed records intact.
