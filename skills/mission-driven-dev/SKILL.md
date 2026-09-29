---
name: mission-driven-dev
description: Guide development from evidence-led conception to bounded missions, just-in-time task packets, independent validation and resumable execution records. Use when adopting or continuing a mission-based development process, preparing a progressive implementation roadmap, aligning existing project documents, executing an approved mission, or resuming one from its evidence. Keep preparation and execution authority separate.
version: v0.1-experimental
---

# Mission-Driven Development

Carry approved intent into verifiable outcomes without reconstructing it from an entire conversation. Keep one owner for each decision, expose unresolved choices, and use deterministic checks for mechanical consistency rather than asking a model to infer it.

Use any harness with local file access. Require Node.js 24+ for the bundled read-only validator; native delegation is optional and subject to the execution phase's authority and fresh-context checks.

## When to Use

Use this process when the user requests mission-based development, needs a progressive route to a development destination, wants to align project artifacts with this process, or asks to execute, inspect or resume an existing mission.

## When Not to Use

Do not take over a standalone explanation, general brainstorming session, isolated review, installation, or simple edit merely because it concerns code. Do not reopen an approved design. Follow a narrower requested process when one already owns the task.

## Select the Phase

Inspect the user's request, relevant project instructions and existing artifacts before choosing a phase. Read the selected reference completely. Read the artifact contract when creating, validating or interpreting machine-readable records; do not preload every phase into every worker.

| Intent                      | Read                                                                                      | Deliver                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Resolve an uncertain design | [Conception](references/conception.md)                                                    | Evidence, accepted decisions, rejected alternatives and remaining uncertainty.        |
| Prepare or align work       | [Preparation](references/preparation.md) and [artifact contract](references/artifacts.md) | Existing owners updated where authorized, optional roadmap and next Mission Contract. |
| Execute an approved mission | [Execution](references/execution.md) and [artifact contract](references/artifacts.md)     | One next packet, bounded changes, evidence and accepted checkpoints.                  |
| Validate a mission          | [Validation](references/validation.md) and [artifact contract](references/artifacts.md)   | An independent result against the complete mission contract and evidence.             |
| Inspect or resume           | [Resumption](references/resumption.md) and [artifact contract](references/artifacts.md)   | Verified current state, gaps and next authorized action.                              |

Use [handoff templates](assets/handoffs.md) when transferring implementation or validation to a fresh context. Use [the example artifact set](assets/README.md) as editable output templates, not as evidence of actual work.

## Keep Authority Explicit

Treat conception, document preparation, execution, delegation, acceptance, commit, integration and deployment as distinct authorities. A plan, a successful structural check, or an implementer's claim does not grant any of them. Inspecting a mission does not authorize starting it.

Approve results, boundaries and exit criteria for a wave of two or three missions. Detail only the next mission fully; elaborate later contracts within that approved frame. Return to the user when a new choice changes scope, constraints, authority, outcome or required validation. Do not create a roadmap for a one-mission change.

Keep V1 execution to one repository per mission. A roadmap may reference several repositories. Escalate an indivisible multi-repository mission rather than silently changing its outcome or pretending independent commits are atomic.

Own this workflow's phase instructions here. Use other skills for technical expertise only when consistent with the user's instruction hierarchy; do not depend on the global brainstorming, TDD or review skills to define the process. Accept sufficient external conception as input and investigate only its gaps. Changes to another skill must not silently redefine this protocol.

## Use Mechanical Checks Honestly

From the installed skill directory, run:

```sh
node scripts/validate.mjs /absolute/path/to/artifact --json
```

Resolve the script relative to this skill, not the project. Validate the state before dispatch and after changing records; validating an archived packet alone does not establish that it is current. Read every diagnostic and distinguish invalid input from unavailable files.

Treat success as structural consistency only. Verify claims against actual code, commands, revisions, permissions and real-use observations. Follow [maintainer verification](MAINTENANCE.md) when changing this bundle; do not run its tests as a substitute for project validation.
