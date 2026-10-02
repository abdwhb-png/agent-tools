# Agentic development workflow: accepted decisions and reuse boundary

Date: 2026-09-23

Status: **D1–D22 and the subsequent implementation plan accepted; U2 implemented locally as `mission-driven-dev`, with O-B1 workflow-owned design guidance. Not globally installed or piloted.** This document retains the rationale and decision history. The [skill bundle](../../skills/mission-driven-dev/SKILL.md) owns operational guidance; its [artifact contract](../../skills/mission-driven-dev/references/artifacts.md) owns V1 serialization. Consult the [qualification report](../../skills/mission-driven-dev/VALIDATION.md) for checks actually performed. Implementation is not authorization to start a project mission, install the skill, change a harness, or build a factory.

## Destination and present scope

Establish a lightweight, evidence-led development workflow that carries verified brainstorming decisions into bounded implementation and independent validation, and can be reused across projects with the user's chosen harness, including Codex or Pi.

The current sequence is:

1. Document the accepted workflow.
2. Use the selected U2 form: one portable skill with templates and small deterministic validation helpers.
3. Deliver the explicitly requested bundle, source validator, examples and qualification evidence; keep installation separate.
4. The user asks the LLM in the existing Anti-Slop task to align that project's artifacts with the workflow.
5. The user starts the pilot in the harness of their choice.
6. Review the resulting evidence and friction together before expanding automation.

Building a software factory, a global multi-project scheduler, an autonomous controller, or a Pi-specific implementation is outside the current scope. The future factory is motivation, not an implementation requirement for this phase.

The earlier word **controller** describes responsibility for coordinating work and checking evidence. During the manual phase, the user directs this process and agents perform explicitly assigned work. No controller software has been selected or built. Structured records and instructions alone do not enforce transitions or make LLM judgments deterministic.

## Evidence and limitations

The initial discovery examined the Anti-Slop task titled `Design Rust anti-slop tool`, its `AGENTS.md`, `README.md`, `docs/PRD.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/templates/task.md`, ADR index, and three `docs/brainstorming-decisions/2026-09-22-*` records. They distinguish product requirements, accepted architecture, implementation order, historical proposals and executable behavior. Their number alone does not prove duplication or justify deleting any of them. The observed workflow difficulty is assembling the relevant approved context for the next implementation step.

The Pi `sdd-missions` design and implementation plan from 2026-08-02 provided precedent for bounded task context, artifact ownership and explicit transitions. Those documents are historical design evidence, not proof of a currently implemented controller or a mandate to reuse that implementation.

The Agent Tools [README](../../README.md) and [cross-harness ADR](../decisions/001-cross-harness-instruction-synchronization.md) establish this repository's existing ownership of reusable instructions, skills and supporting tools. Placing this record here keeps workflow design separate from any particular pilot or harness. Existing instruction synchronization is not evidence of skill installation or workflow support in a live Codex or Pi session.

The video and its supporting sources are recorded below. They inform the workflow; the accepted design also deliberately adds requirements from the user's preferences. No empirical improvement in delivery speed, intervention rate or reliability has yet been measured for this workflow.

## Accepted decisions

These identifiers preserve the conversation's decision history. The explanatory sections below specify their present interpretation, including the later manual-phase correction.

| ID | Accepted choice | Purpose and qualification |
| --- | --- | --- |
| D1 | O3: one active Mission Contract owns execution intent | Agents receive one bounded outcome instead of reconstructing intent from scattered discussions. |
| D2 | O3B: progressive roadmap | Map the destination globally; detail work as it becomes actionable. |
| D3 | O3B.2: roadmap per destination | A destination may span repositories. A change that fits one mission needs no roadmap. |
| D4 | O3B.2-B: mission per observable outcome | Missions deliver verifiable results; components and elapsed time are not the primary boundaries. |
| D5 | B2: initially approve waves of 2–3 missions | Keep human oversight while learning how the workflow behaves. Approval refers to reviewable scope and constraints. |
| D6 | B3: destination-level authorization is a later target | Continuous progression remains conditional on demonstrated reliability and explicit authority. It is not active now. |
| D7 | O3B-F3: Markdown contracts with structured headers | Preserve readable reasoning and identifiable, versioned contracts. |
| D8 | O3B-F3: structured execution state | Separate intended work from attempts, evidence and observed progress; task packets are derived artifacts. |
| D9 | O3B-S2: typed mission lifecycle | Distinguish preparation, execution, validation and terminal outcomes. Runtime enforcement remains undecided. |
| D10 | Append-only transition history | Retain who changed state, when, against which contract and with which evidence; full event sourcing is deferred. |
| D11 | O3B-V2: multilayer validation | Define behavior, executable checks, conformance, real-use checks and evidence before execution. |
| D12 | O3B-R2: independent fresh validation at mission level | Task packets have fast local checks; mission closure requires a fresh validator. Specialized reviews are risk-triggered. |
| D13 | O3B-D2: route artifacts by responsibility | Product Contract, ADR and roadmap are conditional. The Mission Contract is the execution spec. |
| D14 | O3B-B2: converge, then compile artifacts | Preserve facts, choices, rejected paths and uncertainty before producing normative documents. |
| D15 | O3B-P2: evidence-triggered roadmap revision | Replan at mission boundaries; preserve completed history and escalate destination, scope or authority changes. |
| D16 | O3B-C2: one Mission Contract core with conditional sections | Avoid separate workflows for features, bugs, refactors and documentation. |
| D17 | O3B-T3: just-in-time Task Packets | Materialize the next packet against the current accepted state; preserve every launched attempt. |
| D18 | O3B-I2: one worktree per mission | Keep task continuity in one isolated checkout; additional parallel isolation needs a demonstrated reason. |
| D19 | O3B-G2: checkpoint after packet acceptance | Link accepted evidence to a commit; preserve separate integration and deployment authority. |
| D20 | O3B-EM2: four manual attempt outcomes | Use `accepted`, `correction_required`, `needs_decision`, `blocked`; do not introduce automatic retry budgets now. |
| D21 | U2: portable skill with templates and small deterministic validation helpers | Reuse the workflow through one entrypoint while checking mechanical consistency in code; keep progression manual. |
| D22 | O-B1: workflow-owned design reference | Maintain development-specific conception guidance with the bundle, independently of the frequently evolving global brainstorming skill; do not embed a frozen copy of that skill. |
| D23 | Name the U2 skill `mission-driven-dev` | One portable entrypoint with progressively loaded references, output templates and a read-only validator. |
| D24 | Own all phase instructions inside the bundle | Existing brainstorming, TDD and review skills remain optional technical aids, not workflow dependencies. |
| D25 | Approve a wave's outcomes, limits and exit criteria | Elaborate later contracts inside that frame; return new substantive choices to the user. |
| D26 | Execute one repository per V1 mission | Preserve multi-repository roadmaps; escalate indivisible cross-repository work rather than implying atomicity. |
| D27 | Require authorized no-history delegation, otherwise hand off manually | An inherited fork is not fresh; missing independent validation stays missing. |
| D28 | Separate documentary contracts from execution records | Preserve existing document conventions, default roadmaps/missions to `docs/`, and store execution in `.missions/`; hidden does not mean ignored. |
| D29 | Narrow the general brainstorming patch to its boundaries | Preserve its exploration/dialogue method, respect selected processes and document owners, and remove automatic commit. |

## Artifact ownership

The workflow is progressive rather than a mandatory stack of documents:

```text
Verified brainstorming and convergence
    -> update only the durable owners that are needed
    -> roadmap per destination, if more than one mission
    -> active Mission Contract
    -> next Task Packet
    -> execution evidence and accepted checkpoint
    -> independent mission validation
    -> closure and roadmap reassessment
```

| Information | Authoritative owner | Creation rule |
| --- | --- | --- |
| Verified fact or bounded experiment | Research/evidence record | Preserve the inputs, results and limits needed to support the decision. |
| Shared product behavior and release acceptance | Product Contract, which may be an existing PRD | Needed when multiple missions share workflows, actors, policies or release criteria. |
| Durable architectural choice and rejected alternatives | ADR | Needed for meaningful boundaries, public contracts, security/data choices or costly-to-reverse decisions. |
| Route to a destination | Roadmap | Needed when the destination requires multiple missions. |
| Approved observable outcome and execution constraints | Mission Contract | The execution specification; do not add a parallel `spec.md` with the same responsibility. |
| One bounded assignment to an agent | Task Packet | Derived from a specific mission revision and current accepted repository state. |
| What actually happened and why it was accepted | Execution state and evidence history | Record attempts, transitions, checks, findings, decisions and Git references. |
| Design discussion and convergence provenance | Convergence Record | Historical after routing; it does not compete with the resulting authoritative contracts. |

An existing PRD can already serve as the Product Contract. Renaming it is not required. An ADR explains and constrains architecture; it does not replace acceptance criteria. A roadmap orders outcomes; it is not the full task list for every future mission. Reuse existing owners and link to them instead of copying mutable requirements.

Useful ADR triggers include a changed responsibility boundary, a decision shared by several missions/consumers, a significant public API or data/security contract, or expensive reversal. A local implementation choice does not automatically require an ADR.

## Brainstorming and preparation

Keep a working set of verified facts, accepted decisions, ruled-out paths, unresolved questions and exclusions. Distinguish empirical claims, user trade-offs and future contingencies. Resolve the uncertainties that block the next outcome; do not invent answers to distant questions just to complete a template.

After convergence, route information to its owner, map the destination into observable mission outcomes, and review dependencies and validation feasibility. A document update that changes an accepted decision requires the corresponding decision process. The historical Convergence Record remains evidence of how the design was reached.

Compilation has two different meanings: an agent may synthesize prose and propose a mission breakdown; deterministic code may validate fields, references and transition rules. No helper can establish the correctness of an architectural choice solely from the presence of a field.

## Progressive roadmap and approval

The roadmap belongs to a bounded destination, not necessarily a repository. Preserve the destination, exclusions, mission outcomes, meaningful dependencies and the evidence needed to decide whether to proceed.

Detail the next mission enough to launch it. Describe the next 2–3 missions by outcome, dependencies and exit criteria. Keep distant missions at outcome level until evidence makes further design useful. Close or explicitly abandon the roadmap when its destination is resolved.

Start with wave approval under D5. D6 is a future operating mode, conditional on low intervention burden, reliable escalation and absence of silent scope growth; numeric thresholds have not been selected.

A mission is ready when its outcome, starting evidence, dependencies, scope, applicable decisions, authority and required validation are explicit, and no unresolved decision prevents execution. A machine can check structural prerequisites; user approval and substantive review remain distinct evidence.

**Resolved by D25:** approval covers a wave's observable outcomes, limits and exit criteria. Later elaboration inside that frame does not require repeated approval. A new substantive choice affecting outcome, scope, constraints, authority or required validation does. Detail only the next contract fully.

## Mission Contract

Use one conceptual structure, shortening conditional sections according to the work. The original examples were illustrative; the [artifact contract](../../skills/mission-driven-dev/references/artifacts.md) now defines the V1 machine format and its examples.

| Section | Owns |
| --- | --- |
| Identity and references | Schema/contract identity and revision, roadmap reference when applicable, repositories, dependencies and authority. |
| Outcome | One observable result and why it matters. |
| Starting Evidence | Verified current behavior, owning files/modules, source revision and relevant uncertainty. |
| Decisions and Constraints | Applicable ADRs, approved choices, obligations and prohibitions. |
| Scope | Included work, exclusions and authorized external actions. |
| Validation Contract | Expected behavior, counterexamples, failure states and the required evidence from each applicable layer. |
| Execution Boundaries | Choices an executing agent may make and conditions that require escalation. |
| Completion | Deliverables, closure evidence and capabilities unlocked. |

A document/configuration mission uses proportionate consistency or before/after checks. Production behavior changes follow RED → GREEN → REFACTOR through real public boundaries. A non-applicable validation layer needs a reason rather than silent omission.

## Task execution, Git and ownership

Generate only the next Task Packet from the mission and current accepted state. It identifies the mission and attempt, relevant revisions, one objective, prerequisites, expected file scope, exclusions, validation and required handoff evidence. It includes TDD expectations where applicable. New evidence may change the next packet without rewriting launched attempts.

A fresh implementation context receives the packet, the relevant contract/ADR references and current repository evidence. Fresh context means discarding stale conversational assumptions, not omitting essential sources. Selecting the right task or interpreting a finding remains reasoning work.

Use one mission worktree, initially based on an explicitly recorded revision. Accepted packets accumulate there. After packet checks and acceptance, record a checkpoint and its evidence. The actor responsible for acceptance controls the checkpoint; an implementer's completion claim alone is insufficient. Preserve the repository's eventual squash/merge convention.

An unsuccessful attempt remains recoverable until its disposition is chosen. Do not reset, clean, discard or quarantine it automatically. Start the mission worktree from an explicitly recorded commit without implicitly including the original checkout's uncommitted work. Ask for a decision if those changes are prerequisites. Keep contract and execution paths accessible in the mission context; do not commit or stash merely to make isolation convenient. D26 bounds V1 isolation to one repository per mission.

Keep these claims separate: implemented, validated, committed, integrated and deployed/activated. Approval to implement or checkpoint does not imply integration or deployment approval.

## Validation and manual failure handling

The Mission Contract defines required proof before implementation:

| Layer | Typical evidence |
| --- | --- |
| Behavior | Positive case, legitimate counterexample/boundary and failure/incomplete case. |
| Executable checks | Intended RED and subsequent GREEN, focused regressions and proportionate diagnostics. |
| Conformance | Evidence of scope compliance, ownership, ADR adherence and architectural consistency. |
| Real-use verification | Browser interaction, actual CLI invocation or live runtime check where the contract requires it. |
| Provenance | Exact commands/results, revision, environment limits, relevant artifacts and checks not run. |

The implementer performs focused checks for each packet. A fresh independent validator evaluates the mission outcome using its contract, complete relevant diff and evidence rather than the implementation conversation. Findings must identify concrete code or a violated requirement. Specialized review is added for demonstrated risk such as security, performance, public API or migration changes.

Findings produce bounded corrections. Repeat the checks invalidated by a correction and verify that the complete mandatory evidence still applies. An AI review cannot waive a failing executable check or replace a missing real-use observation. The implementer cannot close the mission alone.

Manual attempt/validation outcomes under D20:

| Outcome | Next action |
| --- | --- |
| `accepted` | Accept the bounded result and checkpoint or proceed to the appropriate next phase. It does not mean the entire mission is complete. |
| `correction_required` | Record findings and prepare a bounded corrective packet. |
| `needs_decision` | State the exact missing choice/authority and any independent work still possible. |
| `blocked` | State the concrete technical/external condition required to resume. |

There is no automatic retry budget. Repeated unsuccessful corrections are brought back to the user. Transient tool errors can be retried when appropriate without inventing a complex taxonomy. `failed`, `cancelled` and `superseded` closures remain explicit user decisions during the manual phase.

## State, revisions and replan boundaries

The accepted conceptual lifecycle is `draft → ready → executing → validating → completed`, with a correction loop back to execution. `needs_decision` and `blocked` describe interruptions; `failed`, `cancelled` and `superseded` describe alternative terminal dispositions. D20's four attempt outcomes and this mission lifecycle have different scope and must not be merged into one ambiguous status field.

Contracts own approved intent. Structured execution records own actual transitions, attempts, findings and evidence. Derived packets refer to the contract revision they were created from. The append-only history includes actor, time, revision and supporting evidence, without requiring a full event-sourced architecture.

A material contract revision invalidates dependent packets for future execution. Keep historical packets and evidence attached to their original revision rather than deleting or retroactively relabeling them. Previously successful checks are not automatically proof for a changed outcome.

Reassess the roadmap at mission boundaries when evidence changes dependencies, makes work unnecessary, exposes missing work, falsifies a validation assumption or supersedes a durable decision. Preserve completed missions and outcomes; revise future missions with an explicit cause and evidence. An in-progress mission must still stop on a blocking contradiction or missing authority; the boundary rule does not require continuing known-invalid work.

Destination, scope and authority changes need an explicit user decision. In the manual wave-based phase, prepare the affected next wave for review. Broader autonomous replan remains part of D6's future target.

## Rejected, deferred and unselected paths

| Reference | Disposition and reason |
| --- | --- |
| O1 minimal spec loop as the entire solution | Not selected as sufficient for roadmap/mission ownership; its incremental execution remains useful. |
| O2 mandatory PRD → design → ADR → spec chain | Rejected: forces documents without distinct responsibility and creates synchronization burden. |
| O4 / full event sourcing / factory-first | Deferred: additional system design before the manual workflow has been tested. |
| O3A exhaustive detailed roadmap | Rejected: premature details become stale. |
| O3C automatic capability DAG scheduling | Deferred: scheduling infrastructure is not needed for the manual pilot. |
| Roadmap per repository or global factory roadmap | Rejected as default: neither matches destination ownership across different project boundaries. |
| Component/time-based missions | Rejected as the primary cut: they need not deliver an observable outcome. |
| Markdown-only or structured-data-only contracts | Rejected in favor of readable contracts and distinct structured state. |
| Kanban-only lifecycle or AI-only completion judgment | Rejected: neither preserves the required evidence and interruption distinctions. |
| Mandatory fresh review after every packet | Not selected: independent validation is at mission level, with local checks during execution. |
| Separate mission models for each work type | Rejected: multiplies workflows and selection cost. |
| All packets generated up front / per-packet worktrees | Not selected: stale instructions and unnecessary integration overhead. |
| Implementer-owned unchecked commits / end-only commit | Not selected: checkpoints follow packet acceptance. |
| O3B-E3 typed retry budgets | Deferred after the user's manual-phase correction; D20/O3B-EM2 is active. |
| Anti-Slop P1B controlled-judge destination | Proposed but never accepted. P1 is the chosen project; its exact scope remains for its own task. |

## Selected reuse mechanism: U2

The user selected U2 after reviewing these alternatives, then approved its concrete implementation plan. The comparison is retained as decision history.

| Option | Concrete reusable form | Benefit | Failure condition |
| --- | --- | --- | --- |
| U1 — Portable skill bundle | One entrypoint with progressively loaded protocol references and templates. User directs stage changes in the chosen harness. | Lowest setup cost for a manual pilot; easy to inspect and revise. | Model compliance alone cannot guarantee state/contract integrity or evidence completeness. |
| U2 — Skill with small deterministic helpers | The same interface plus narrowly scoped checks for structure, references and revision consistency. | Makes mechanically checkable rules reproducible without delegating scheduling to software. | Overbuilding helpers or treating structural validity as semantic acceptance. |
| U3 — Dedicated local workflow tool | A maintained CLI owns lifecycle, artifact operations and inspectable status; a thin agent skill explains reasoning tasks. | Stronger operational consistency across sessions and harnesses. | Tool implementation and maintenance displace the manual workflow experiment. |

U1 is not selected because it leaves mechanical consistency entirely to model compliance and human checking. U3 is deferred because software-owned lifecycle operations would introduce additional implementation and maintenance before the manual pilot. U2 may justify U3 later if concrete recurring needs emerge. D23 and the V1 artifact contract settle naming and serialization; installation adapters remain out of scope. No automatic model/provider routing is required for this manual phase.

**Selected boundary:** keep one user-facing skill, phase-specific references and templates, and small validators for required structure, identifiers, reference existence and revision consistency. The user continues to initiate work and approve results. The validator does not select missions, dispatch agents, commit, merge or decide whether an architectural judgment is correct. Its explicit-path CLI reports structural issues and never repairs input; semantic review remains part of D11/D12.

OpenSpec is a useful architectural reference, not an adopted dependency. Its [workflow documentation](https://github.com/Fission-AI/OpenSpec/blob/f179ed4e40567cdb56501ee3f4d09efbcb1557b8/docs/workflows.md) separates agent-driven work from CLI-owned scaffolding, status and artifact instructions. Its [customization documentation](https://github.com/Fission-AI/OpenSpec/blob/f179ed4e40567cdb56501ee3f4d09efbcb1557b8/docs/customization.md) supports custom artifact schemas and explicitly distinguishes advisory context from enforceable checks. This means that skill and deterministic tooling can coexist. The inspected workflow also describes verification as optional and nonblocking for archive: adopting it unchanged would not establish D11/D12's mandatory evidence gate.

Those two official documents were read at commit `f179ed4e40567cdb56501ee3f4d09efbcb1557b8` on 2026-09-23. This is a documentation-level comparison, not a runtime audit, compatibility qualification, or claim that OpenSpec cannot be adapted. It does not reopen the user's rejected heavyweight workflow choices.

D22 replaces the earlier proposal to depend on the existing brainstorming skill: the bundle owns its development-specific design guidance. D24 extends that autonomy to preparation, execution, validation and resumption. Other skills are optional expertise. The entrypoint separates preparation, execution and inspection authority and loads the relevant phase. Compatibility of fresh review, skill discovery and state access still needs qualification in the actual Codex and Pi setups; sharing Markdown does not establish equivalent runtime behavior.

This record owns the rationale and history. Maintain operational rules in their phase reference and machine meaning in the artifact reference plus the single TypeScript implementation; generate the delivered CLI from those sources. Templates illustrate that contract rather than becoming another policy owner.

### Accepted design ownership: O-B1

The global `brainstorming` skill serves varied uses and changes frequently. Depending on its current installed instructions would allow an unrelated improvement to change the development workflow without evaluating that workflow again. A one-way dependency protects the global skill's independence, but does not protect the consumer from those changes.

The workflow therefore owns a dedicated design reference, maintained and evaluated with its other guidance. It may draw on relevant brainstorming practices, but its responsibility is development-specific: establish evidence, distinguish proposals from accepted decisions, expose blocking uncertainty, converge on the required design and hand off to the appropriate artifacts. It is not a wholesale copy of the global skill and does not require that skill to be installed or improved first.

The global skill remains independently usable and maintained. Relevant improvements can be transferred deliberately after checking their fit; they do not propagate automatically. The two references have different responsibilities and need not evolve in lockstep. The approved minimal source patch D29 only fixes general brainstorming's trigger, document ownership and exit authority; the installed global copy is untouched.

Existing conclusions from an external brainstorming session are valid inputs. Inspect their evidence, accepted decisions and remaining gaps; complete only what the workflow needs rather than requiring a particular upstream skill or restarting the discussion.

**Alternative not selected:** O-B2 would embed a frozen copy of the complete brainstorming skill and selectively import subsequent changes. O-B1 instead keeps only the development-specific method the workflow owns. The earlier proposal to improve the global skill before planning this bundle is not a prerequisite. This changes the reuse boundary, not the accepted roadmap, mission, validation or manual-progression decisions.

### Accepted bundle contract

The same skill supports three user intents, expressed through ordinary requests rather than new commands or aliases:

| Intent | Agent responsibility | Output and boundary |
| --- | --- | --- |
| Prepare or align a project | Use the workflow-owned design reference where conception is needed; read existing conclusions and product/architecture documents, establish their ownership, retain accepted decisions, identify contradictions and prepare the progressive roadmap and next mission. | Reusable project artifacts or explicit gaps; no implicit implementation launch or repeated brainstorming when the existing inputs suffice. This covers the user's future request in the Anti-Slop task. |
| Execute authorized work | Read the approved mission, materialize the next packet, use the selected harness and bundled TDD protocol, collect evidence and arrange independent mission validation within the granted authority. | Bounded changes, evidence and state updates; new authority or decisions remain explicit. |
| Resume or inspect | Read the current contract, state, history and accepted Git references; identify what is complete, what is blocked and which action is authorized next. | A grounded status and next step; inspection alone does not authorize execution. |

Use progressive disclosure: the entrypoint routes to the relevant instructions and resources instead of loading the entire process into each implementation context. Its dedicated design reference is part of that bundle, not a call to the global brainstorming skill. The new skill also owns artifact handoff and workflow boundaries; any reuse of other skills needs an explicit dependency boundary rather than an assumed dependency on their latest installed instructions.

The delivered bundle has three parts:

- **C1 — Guidance:** a short `SKILL.md`, a workflow-owned design reference under D22, and referenced protocol sections for preparation, execution/validation and resumption. All phases share one set of artifact meanings.
- **C2 — Templates and schemas:** reusable starting points for roadmap, mission, packet and execution records. Existing PRD/ADR conventions remain project-owned. Templates are output shapes, not a second independent definition of workflow rules.
- **C3 — Read-only validation:** a small entrypoint checks required fields, identifier/reference consistency, existence of referenced local artifacts and correspondence between recorded revisions. Checks report a location, violated rule and actual observation, with a nonzero outcome on detected invalid input.

The validator can establish that a proof reference resolves or that a packet names the recorded active revision. It cannot establish actual approval, that a cited test was honestly executed, that a model review is correct, or that a mission delivers the right product behavior. A successful result means the checked structure is consistent; it does not authorize work or close a mission. V1 checks the documented transition graph and agreement between state and the last event; it cannot prove historical files were never overwritten.

Before distributing the bundle, verify meaningful cases in an isolated fixture project: preparation from existing PRD/ADR material without rewriting accepted choices; a single-mission change that does not manufacture a roadmap; a stale packet or missing proof reference that fails validation; and resumption that preserves scope and exposes a missing decision. Code for deterministic helpers follows TDD. Live discovery and fresh-context behavior in Codex and Pi are separate qualification checks. These checks qualify the reusable support and do not execute the Anti-Slop pilot.

D22 additionally requires checking that conception can run without the global brainstorming skill, that sufficient external conclusions are consumed without restarting the discussion, and that changes to the global skill do not alter the bundle's selected design instructions. Recorded simulated evaluations cover these boundaries; their scope and remaining live checks are listed in the qualification report. They are not a discovery/installation qualification in either harness.

## Open details and implementation handoff

| ID | Resolution or remaining detail | Boundary |
| --- | --- | --- |
| Q1 | Resolved by D23/D24 and the portable bundle. | Installation remains separately authorized. |
| Q2 | Resolved by D25: approved frame versus substantive new decisions. | Preserve evidence of each actual approval. |
| Q3 | Resolved by the V1 artifact contract and validator. | Structural checking is not lifecycle enforcement or authenticated approval. |
| Q4 | Resolved by D26 and explicit dirty-work/correction preservation. | No automatic disposal; ask when uncommitted inputs are needed. |
| Q5 | Policy resolved by D27; actual Codex and Pi discovery, worktree access and fresh-context behavior still need live qualification. | Do not claim a full manual mission was exercised in either harness. |
| Q6 | Concrete autonomy readiness measurements remain open. | Required before switching from D5 to D6. |

The pilot responsibilities are explicit: this task delivers the reusable bundle and bounded qualification. The user directs the existing Anti-Slop task to align its documents, selects the pilot's project scope there, and starts execution using their preferred harness. This task does not message that task, rewrite its roadmap, select a rule, or launch its agents on the user's behalf.

After the user runs the pilot, analyze the actual roadmap/mission/packet revisions, validation evidence, interventions, blocked decisions and document-maintenance burden. Observe whether a fresh session can identify the next action, whether repeated requirements diverge, and whether closure claims match proof. Numeric success thresholds are not yet fixed. Convert repeated mechanical friction into tooling only after identifying it in this evidence.

## Source coverage and adaptation

**Video:** [How I Code With AI Agents (Spec-Driven Development), Owain Lewis](https://www.youtube.com/watch?v=RhaF4LVAVng). Metadata, chapter markers and the full English automatic transcript were retrieved during this conversation. The transcript and source files support the mechanisms below; visual details of every editor interaction were not independently inspected.

**Selected description link:** <https://github.com/owainlewis/youtube-tutorials/tree/main/tutorials/spec-driven-development> — the author's source materials clarify the execution spec and task/review loop.

**External content read during discovery:**

- <https://raw.githubusercontent.com/owainlewis/youtube-tutorials/main/tutorials/spec-driven-development/README.md>
- <https://raw.githubusercontent.com/owainlewis/youtube-tutorials/main/tutorials/spec-driven-development/LESSON.md>
- <https://raw.githubusercontent.com/owainlewis/youtube-tutorials/main/tutorials/spec-driven-development/resources/commands/spec.md>
- <https://raw.githubusercontent.com/owainlewis/youtube-tutorials/main/tutorials/spec-driven-development/resources/commands/task.md>
- <https://raw.githubusercontent.com/owainlewis/youtube-tutorials/main/tutorials/spec-driven-development/resources/commands/review.md>
- <https://raw.githubusercontent.com/owainlewis/youtube-tutorials/main/tutorials/spec-driven-development/resources/commands/commit.md>
- <https://raw.githubusercontent.com/owainlewis/youtube-tutorials/main/tutorials/spec-driven-development/resources/examples/youtube.md>

These moving-branch links describe the consulted sources, not a pinned upstream contract. The last example file contained a project-description feature, so it is not evidence of the exact video-analysis implementation shown in the demo.

| Source component and evidence | Mechanism and intended result | Workflow decision | Status |
| --- | --- | --- | --- |
| Video 02:10; `LESSON.md`, document roles | Distinguish product value, architectural reasoning and agent execution. | D13 routes information conditionally; a Mission is the execution spec. | Adapted. |
| Video 03:37; `commands/spec.md`, context and constraints | Supply relevant context, exclusions and verification so an agent need not infer product choices. | D16 Mission Contract with references to existing durable owners. | Adapted. |
| Video 04:51 and 13:57; `commands/task.md` | Execute a bounded task in fresh context, then verify. | D17 just-in-time packets; D18 mission worktree continuity. | Adapted; worktree policy is user-specific. |
| `commands/task.md`, conditional test instruction | Testing is required only when specified by the task. | Production behavior follows mandatory TDD; documentation uses proportionate checks. | Intentional divergence to honor user requirements. |
| Video 14:41–16:07; `commands/review.md` | Inspect code and exercise actual behavior. | D11/D12 layered evidence and independent fresh mission validation. | Adapted; independence and closure rules are user-specific. |
| Video 05:26 and `commands/commit.md` | Commit incremental work and preserve task history. | D19 checkpoints occur after packet acceptance; integration authority remains separate. | Adapted. |
| Video 08:10; `LESSON.md`, changing the spec | Refine plans when implementation reveals new information. | D15 evidence-triggered roadmap revision with explicit authority boundaries. | Adapted. |
| User conversation, D2–D10 and D20 | Preserve direction across sessions while keeping manual operation understandable. | Destination roadmaps, conditional approval waves, structured state and simple failure handling. | User-context addition, not a claim about the video. |

The result is a synthesis tailored to the user's workflow, not a faithful reproduction of the video's framework or an adoption of OpenSpec, BMAD or Spec Kit.
