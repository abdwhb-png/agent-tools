# Preparation

Turn accepted intent into the smallest set of authoritative artifacts needed for execution. Preserve existing owners so later agents do not reconcile competing copies of the same requirement.

## Route Information by Responsibility

| Information | Owner and creation condition |
| --- | --- |
| Facts and bounded experiments | Evidence record with inputs, results and limitations. |
| Shared product behavior and release acceptance | Existing PRD/Product Contract when several missions share those rules. |
| Durable architecture and costly-to-reverse choices | ADR using project conventions; do not create one for every local choice. |
| Route to a destination | Progressive roadmap only when more than one mission is needed. |
| One observable result and its execution boundaries | Mission Contract; do not add a parallel spec with the same responsibility. |
| One implementation assignment | Derived Task Packet, created just before dispatch. |
| Attempts, checks, decisions and checkpoints | Execution records under `.missions/`. |
| How design choices were reached | Historical convergence record, not a competing requirements owner. |

Inspect supplied conclusions and current documents for contradictions before compiling them. Updating a document does not authorize changing an accepted decision. Follow the user's documentation convention; retain existing PRD and ADR paths, link instead of copying, and do not manufacture a PRD because a template contains one.

## Map Observable Outcomes

Write a roadmap per destination, even when that destination touches several repositories. Split missions by verifiable outcomes, not component names or time estimates. Record meaningful dependencies and what proof allows progress. Keep distant missions at outcome level.

Present the next wave of two or three outcomes, boundaries and exit criteria for approval. Fully detail only the next mission. Record the user's approved frame as evidence; subsequent elaboration inside it needs no repeated approval. Escalate a new substantive decision rather than claiming the wave approved it implicitly. In V1, each executable mission concerns one repository.

For a one-mission change, prepare the contract directly. A small fix may still need explicit regression evidence, but not a roadmap or product document.

## Prepare the Next Contract

Use the Mission Contract sections in [the artifact contract](artifacts.md). Record the outcome, starting evidence, applicable decisions, scope, validation, execution boundaries and completion conditions. Make behavior, counterexamples, failure states and real-use checks concrete before implementation.

Mark a validation layer not applicable only with a reason. For documentation-only work, use proportionate consistency checks instead of inventing a RED test. For production behavior, require executable RED evidence through the owning public boundary.

Create the draft execution state and its initial history event together. Keep unapproved and blocked matters explicit. Move to ready only when dependencies, authority and decisive unknowns are resolved; structural validity alone is insufficient. Do not prepare all future packets or start agents while merely aligning documentation.

Preserve approved contract revisions. When new evidence changes scope or decisions, create a revision and reassess affected future work. Keep completed history unchanged. Reassess the roadmap at mission boundaries, but stop an in-progress mission immediately on a blocking contradiction or missing authority.
