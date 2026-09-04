---
name: writing-system-prompt
description: Create, audit, or revise persistent agent instructions such as SYSTEM.md, AGENTS.md, APPEND_SYSTEM.md, CLAUDE.md, developer instructions, custom instructions, and system personas. Use whenever the user wants to decide what belongs in always-loaded context, separate global, harness, repository, skill, memory, and task layers, reduce prompt bloat, preserve reliable fallbacks for weaker models, or synchronize one policy across agent harnesses. Do not use for ordinary task prompts or a one-off request.
---

# Writing Persistent Agent Instructions

Design persistent instructions that improve agent behavior across their intended scope. Optimize for reliable behavior per unit of context rather than treating either brevity or completeness as an absolute goal.

A persistent rule earns its cost when the expected harm of omitting it is greater than the repeated context and maintenance cost of carrying it. Information being discoverable is evidence against permanence, not an automatic reason to remove it: discovery may be expensive, ambiguous, inconsistently attempted, or unreliable with weaker models.

## When to use

Use this skill to create or revise:

- system and developer prompts;
- global or user-level agent preferences;
- harness-specific append instructions;
- repository or directory-scoped `AGENTS.md` files;
- persistent instruction files used by IDE assistants;
- a canonical policy rendered into several harness formats.

Use it when recurring failures include unsupported certainty, scope drift, missed skills, ignored project commands, incorrect tool routing, inconsistent communication, or claims of validation that never ran.

## When not to use

- Put a one-off goal, acceptance criterion, or temporary constraint in the current user prompt.
- Put a reusable specialist procedure in a domain skill unless retrieval reliability requires a persistent fallback.
- Put long reference material in documentation when the agent can reliably locate and load it at the point of need.
- Use the relevant implementation, debugging, research, or writing workflow for the immediate task instead of creating persistent instructions merely to complete it once.

## Establish the target environment

Inspect the actual instruction files and determine the following before recommending changes:

1. Identify every target harness, file, scope, precedence rule, and generated output.
2. Identify the models that will consume the instructions, including cheaper or weaker models and their observed skill- or document-retrieval behavior.
3. Identify available skills, tools, hooks, configuration, documentation, memory systems, and synchronization mechanisms. Never assume that a capability or loading behavior is shared across harnesses.
4. Gather observed failures, user preferences, non-negotiable boundaries, exact local commands, and hard-won repository constraints.
5. Separate canonical sources from generated or copied destinations so edits do not create silent divergence.

Treat user reports about their workflow and preferences as authoritative intent. Treat claims about harness behavior, precedence, tool availability, or file loading as empirical and verify them when they affect the design.

## Apply the reliability-adjusted admission test

Evaluate every candidate instruction against these questions:

1. **Outcome:** What recurring behavior, preference, failure, or risk does this instruction address?
2. **Scope:** In which tasks, repositories, users, or harnesses should it apply?
3. **Stability:** How likely is it to remain correct long enough to justify persistent placement?
4. **Retrieval:** Can the agent discover the information cheaply, unambiguously, and reliably when needed?
5. **Consequence:** What happens if the agent does not retrieve or follow it?
6. **Enforcement:** Would code, configuration, a hook, a permission boundary, or a deterministic tool enforce it more reliably?
7. **Interaction:** Does it duplicate, contradict, or weaken a higher-priority instruction?

Keep a rule in persistent context when its scope is durable and at least one of these conditions holds:

- it expresses a cross-task authority, safety, communication, or evidence boundary;
- it records a stable user preference that should survive across tasks;
- it prevents an observed and materially costly recurring failure;
- it captures a local constraint, exact command, or architectural fact that is costly or ambiguous to rediscover;
- it provides a necessary fallback because the relevant skill, documentation, or memory is not loaded reliably by the models in use;
- it routes the agent to a harness capability whose use is not otherwise dependable.

Move, narrow, or remove a rule when it is temporary, obsolete, unrelated to most tasks in its scope, reliably discoverable at low cost, duplicated without a reliability purpose, or better enforced mechanically.

Do not impose a universal line limit. Use file size and repeated tokens as diagnostic pressure: require each permanent section to justify its cost, then compress it without deleting behavior the user deliberately relies on.

## Select the narrowest reliable layer

Choose the narrowest layer that can enforce or communicate the rule reliably, not merely the theoretically narrowest layer.

| Layer | Put here | Keep out |
| --- | --- | --- |
| Global system or developer instructions | Stable cross-task operating invariants, evidence standards, authority boundaries | Repository commands, transient facts, full specialist workflows without a fallback justification |
| Global user preferences | Durable communication, collaboration, coding, delegation, and technology preferences | Facts that apply to only one repository or harness |
| Harness-specific append instructions | Tools, paths, loading behavior, or workflow rules unique to that harness | General preferences already shared across harnesses |
| Repository or directory instructions | Local architecture, exact commands, package boundaries, test traps, conventions, and hard-won constraints | Generic advice that every project already receives |
| Skill | Detailed reusable workflow triggered by a class of tasks | Behavior that must apply even when the skill is not retrieved |
| Code, configuration, hook, or permission system | Deterministic enforcement, generated values, machine-verifiable policy | Judgment that genuinely requires task context |
| Documentation or reference | Detailed explanations, architecture overviews, large examples, infrequent procedures | Critical rules the agent routinely fails to retrieve |
| Memory | Historical context, prior decisions, and experiential preferences that tolerate probabilistic retrieval | Safety boundaries or deterministic policy required on every relevant task |
| Current user prompt | Immediate goal, inputs, acceptance criteria, and one-off exceptions | Durable rules that would otherwise be repeated manually |

Project-specific information does not need to move into a global skill merely because it is detailed. Keep exact commands and local failure-prevention rules in repository instructions when they are important, difficult to infer correctly, or repeatedly missed.

## Design intentional fallbacks

When capable models reliably load skills and documentation, keep the persistent instruction to a short routing rule and place the detailed workflow in the referenced resource.

When weaker models do not reliably retrieve that resource, embed a fallback kernel that is sufficient to prevent the primary failure. Include the trigger, the non-negotiable behavior, and the most important exception or completion condition.

Embed a complete skill or larger policy only when the behavior must apply broadly and the user has accepted the context cost. Mark the duplication as intentional, identify the canonical source, and keep the copies synchronized manually or through generation. Never allow an intentional fallback and its detailed source to evolve into conflicting policies.

Prefer deterministic enforcement when it is available and proportionate, but do not remove a useful prompt rule merely because a future hook could theoretically replace it. Record the mechanical replacement as a future option until it actually exists and is validated.

## Build The Prompt

Turn the selected rules into a coherent operating contract, not just a list of correctly placed instructions. Explain enough of the intended outcome and reasoning for the agent to generalize, while preserving the conditions and limits that make each rule safe.

Use the following dimensions when they solve an established need. They are construction tools, not mandatory output sections: combine or omit them when the target prompt does not need them. Preserve useful user-approved rationale and examples rather than deleting them solely to meet a size target.

### 1. Purpose And Working Relationship

State the practical role, audience, intended outcome, and working relationship. Explain what success looks like and why the relationship matters when that context changes the agent's decisions. Prefer a concrete purpose such as producing reviewable engineering results over claims of exceptional expertise or a theatrical persona.

### 2. Positive Patterns

Describe the behavior to reproduce, not only the behavior to avoid. Translate goals such as clarity, accuracy, or collaboration into observable actions: surface the result, calibrate detail to risk, challenge an incorrect premise with evidence, or distinguish a verified fact from an inference.

Select patterns from the user's needs and observed successful outputs. Explain their purpose where it helps the agent handle unfamiliar cases; do not copy a generic style checklist into every prompt. Adapt presentation to the actual interface and user preference rather than universally requiring the conclusion first or last.

### 3. Failure Modes, Reasons, And Conditions

Identify the recurring failure, its consequence, and the judgment that should replace it. Preserve meaningful explanations of why a rule exists, especially when a weaker model needs that context to apply it beyond the example.

- Prevent over-claiming by keeping findings attached to their scope, evidence, caveats, and test conditions. Do not turn a narrow observation into an unrestricted guarantee.
- Make missing evidence, unavailable checks, and residual uncertainty visible instead of smoothing them into confident prose.
- Require visible failure handling rather than silent suppression or fallbacks that conceal the defect.
- Keep a negative pattern only when it addresses a real failure or an explicit user preference. Pair it with the desired alternative when the prohibition alone leaves behavior ambiguous.

### 4. Operational Boundaries

Define which actions the agent may take autonomously, which require evidence or approval, and what constitutes completion. Attach permissions to their limits in the same rule so the agent cannot retain the action while dropping its boundary.

For a coding agent, consider requested scope, preservation of existing changes, destructive or external effects, unresolved trade-offs, and truthful validation claims. Distinguish a missing check from a confirmed failure and a static result from runtime evidence. Keep hard boundaries explicit; explain judgment-dependent exceptions without accidentally broadening authority.

### 5. Shared Conventions And Contrastive Examples

Preserve shared labels and aliases when the user has requested or approved them. Do not invent them merely because repeated work could benefit from shortcuts. Define each alias's expansion and an unambiguous invocation rule so ordinary text cannot trigger it accidentally.

Use a small number of preferred/avoid examples when they clarify a meaningful behavioral difference or support a model that struggles with abstract guidance. Keep the inputs comparable and show the consequence of the difference. Remove incidental detail and private information; do not let examples contradict the rules, their limits, or the user's current request.

### 6. Compose And Refine

- Write instructions as direct imperatives addressed to the executing agent.
- State the intended outcome or rationale once when it improves judgment. Do not require every section or bullet to repeat its problem, result, reason, and conditions.
- Put the condition and its boundary in the same rule so the agent cannot retain the capability while dropping its limit.
- Use observable behavior: specify what the agent should inspect, preserve, ask, execute, report, or avoid claiming.
- Prefer calibrated conditions over absolute prohibitions. Keep hard constraints for explicit user policy, safety, security, legal, destructive, irreversible, or externally consequential boundaries.
- Preserve exact commands, paths, API names, and counterintuitive local details when their precision prevents a known failure. Verify them before encoding them.
- Make tool and harness rules conditional when the capability may not exist in every target environment.
- Remove decorative personas, generic repository summaries, repeated facts, and examples that do not change behavior.
- Use contrastive examples only when abstract wording remains ambiguous or smaller models need the demonstrated pattern.
- Follow the target file's native structure and precedence rules. Do not force every format into `Purpose` and `Instructions` headings when another structure is clearer or already established.
- Keep canonical source content independent of harness syntax when a renderer owns the target-specific wrapper.

## Audit and revision workflow

1. Read the complete current instruction set, relevant project files, referenced skills, and renderer or loading configuration.
2. Inventory the rules and classify each by outcome, scope, stability, retrieval reliability, consequence of omission, and current layer.
3. Identify contradictions, accidental duplication, stale tool names, fragile paths, unverifiable claims, and rules whose enforcement belongs elsewhere.
4. Distinguish accidental duplication from an intentional fallback before deleting anything.
5. Propose keep, compress, move, embed, make conditional, enforce mechanically, or remove decisions. Explain non-obvious placements and context-cost trade-offs.
6. Preserve user-approved exceptions to the general framework. Do not apply an external philosophy more strongly than the user's actual reliability requirements.
7. Edit canonical sources first. Update generated destinations through their synchronization mechanism when configured; never invent destination paths or overwrite independently modified targets silently.
8. Re-read the resulting instruction stack as the target model will receive it and remove remaining conflict or needless repetition.

## Validate the revision proportionally

For a substantial revision, test representative situations selected from the actual risks:

- a short low-risk request that should not trigger excessive ceremony;
- a high-risk or ambiguous action that should preserve authority and uncertainty;
- a specialist task where a skill may fail to load and the fallback must still prevent the main error;
- a repository task that depends on an exact local command or counterintuitive constraint;
- a harness where a named tool is unavailable or differs from another harness.

Check that the revised stack produces observable improvements, does not block legitimate work, keeps critical fallbacks available, and does not inject irrelevant procedures into unrelated scopes. Use direct inspection and deterministic checks for file composition, links, syntax, rendering, and synchronization. Use comparative model evaluations only when the behavioral uncertainty justifies their cost and the user wants that level of testing.

## Present the result

Lead with the recommended instruction architecture or completed change. Then provide only what the user needs to evaluate it:

1. Identify which rules stayed, moved, became conditional, were embedded as fallbacks, or were removed.
2. Explain the important trade-offs, especially retrieval reliability versus repeated context cost.
3. Provide copy-ready content or exact file changes when requested.
4. Report validations performed, destinations not synchronized, and unresolved harness assumptions.

Do not claim that a prompt guarantees behavior. Treat persistent instructions as a reliability mechanism whose value must be judged against observed model behavior, retrieval quality, maintenance cost, and context consumption.
