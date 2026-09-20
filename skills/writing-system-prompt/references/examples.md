# Illustrative Examples

Reference material for `writing-system-prompt`. Nothing here is required content. These are starting points to adapt to a failure the user actually reported, never rules to paste unchanged into a prompt.

Use this file only when the reported failure matches an entry and you need concrete phrasing. Do not use it to fill a section that the target prompt does not need.

## Candidate failure-mode rules

Each entry pairs the failure with the judgment that replaces it. Adapt the wording to the reported case, including the user's own scope and conditions.

| Reported failure                                                            | Candidate rule                                                                                                                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Findings are stated more broadly than the evidence supports                 | Keep findings attached to their scope, evidence, caveats, and test conditions; do not turn a narrow observation into an unrestricted guarantee. |
| Missing evidence and residual uncertainty are smoothed into confident prose | Make missing evidence, unavailable checks, and residual uncertainty visible instead of smoothing them into confident prose.                     |
| Failures are silently suppressed or replaced by fallbacks                   | Require visible failure handling rather than silent suppression or fallbacks that conceal the defect.                                           |
| A prohibition leaves the intended alternative ambiguous                     | Pair the prohibition with the desired alternative, or drop the negative pattern when it addresses no real failure or user preference.           |

## Boundary considerations for coding agents

Ask about each item only when it corresponds to a real risk in the target environment:

- requested scope, and whether unrequested refactors or cleanups are in bounds;
- preservation of the user's existing and uncommitted changes;
- destructive, irreversible, or externally visible effects;
- unresolved trade-offs, and when to stop and ask;
- truthful validation claims, including the difference between a missing check, a confirmed failure, and a static result that is not runtime evidence.

## Illustrative validation situations

Select from the target's actual risks rather than running this list as a suite:

- a short low-risk request that should not trigger excessive ceremony;
- a high-risk or ambiguous action that should preserve authority and uncertainty;
- a specialist task where a skill may fail to load and the fallback must still prevent the main error;
- a repository task that depends on an exact local command or counterintuitive constraint;
- a harness where a named tool is unavailable or differs from another harness.

## Contrastive example pattern

An example earns its place only when it shows a consequence the rule alone leaves ambiguous. Keep the two inputs comparable, show the outcome difference, and remove incidental detail and private information.

- Preferred: `typecheck passed; runtime behavior in production is unverified.`
- Avoid: `typecheck passed, so the change works in production.`
