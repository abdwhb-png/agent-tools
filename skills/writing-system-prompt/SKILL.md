---
name: writing-system-prompt
description: Create, audit, or revise system prompts and custom instructions for durable AI and coding-agent behavior.
---

# Writing System Prompts

Create a system prompt that makes an agent more useful across many tasks without turning a single user's preference into a brittle global rule. A system prompt has multiplicative impact: reserve it for durable behavior that should apply repeatedly, and keep task-specific work in the user prompt, project instructions, or a dedicated skill.

When drafting instructions, explain the intended outcome, the reason it matters, and the conditions that change the decision. Prefer this to absolute "do this" or "do not do this" language: models can apply a stated rationale to novel cases, while a blanket prohibition can fail in its exceptions. Reserve hard constraints for genuine policy, safety, security, legal, or irreversible-action boundaries.

## When to Use

Use this skill when the user needs to create, audit, or revise instructions that should govern an AI assistant across multiple future interactions, including:

- System prompts, custom instructions, agent personas, or standing behavior rules.
- Persistent issues such as excessive verbosity, unsupported certainty, scope drift, inconsistent tone, or poor validation claims.
- A review of whether existing instructions conflict, are too broad, or belong in another instruction layer.
- An explicit request to create shared reference points, aliases, or other durable interaction conventions.

## When Not to Use

Use the narrower instruction layer when the behavior is not durable:

- A one-off request with its own goal, context, or acceptance criteria belongs in the user prompt.
- Repository architecture, commands, and conventions belong in project or repository instructions.
- A repeatable domain workflow belongs in a dedicated skill.
- An immediate implementation, debugging, research, or writing task should use the relevant task skill rather than creating a system prompt.

## Establish The Target

Before drafting, identify the facts that control the prompt:

- The agent's environment and authority: chat assistant, coding agent, support agent, or another role.
- The recurring users, workflows, output surfaces, and available tools.
- Observed failure modes, with concrete examples when available.
- The outcomes to preserve, including accuracy, speed, readability, cost, autonomy, or safety.
- Existing system, repository, project, or user-level instructions that could conflict.

Ask concise clarifying questions when these facts are missing. Do not invent a model, tool, deployment mechanism, or configuration file. If the user has supplied a prompt or response examples, treat them as the primary evidence.

## Separate Instruction Layers

Put each instruction at the narrowest layer that can reliably enforce it:

| Layer | Use for | Avoid putting here |
| --- | --- | --- |
| System prompt | Stable cross-task behavior, communication norms, global boundaries | A single task, temporary preference, repository-specific commands |
| Project or repository instructions | Local architecture, conventions, commands, and constraints | Rules needed outside that project |
| Skill | Specialized, multi-step workflow triggered by a class of requests | Universal response style |
| User prompt | Immediate goal, context, acceptance criteria, and one-off constraints | Permanent rules that will be repeated |

Explain any ambiguous placement choice briefly. A shorter prompt with correctly scoped instructions is more dependable than a long policy document.

## Build The Prompt

Draft the smallest coherent prompt using only sections that solve an established need. Prefer concrete rules and observable outcomes over a theatrical persona.

Structure the prompt with `# Purpose` followed by `# Instructions`. `Purpose` establishes the stable role, audience, and outcome; `Instructions` contains the guidance that achieves that outcome. Before the rules in each substantive `Instructions` section, state the recurring problem or goal, intended result, why it matters, and any conditions that alter the judgment. This context lets the agent generalize the instruction instead of applying a disconnected list mechanically.

### 1. Purpose And Working Relationship

State the agent's operating purpose, the audience, and the reason for the communication standard. Describe a practical working relationship such as direct, evidence-led, and collaborative. Explain the intended outcome so the agent can handle novel cases rather than mechanically following phrases.

### 2. Positive Patterns

Describe behaviors to reproduce. Make each pattern testable in an answer or action.

Useful examples, when they fit the target:

- Use plain, specific language and state a fact once.
- Match the response depth to the request and risk.
- Surface the decision, result, or next action where the target interface makes it easiest to find.
- Challenge incorrect assumptions directly and explain the evidence or reasoning.
- Prefer engineering value and clarity to performative phrasing.
- Compress two paragraphs into one when no meaning or decision is lost.

Do not copy these examples blindly. For example, placing the key point last can suit a terminal transcript, whereas an executive brief may need the conclusion first.

### 3. Failure Modes, Reasons, And Conditions

Describe the few recurring behaviors that harm the target workflow, why they create that harm, and the judgment that should replace them. For example, explain that unsupported certainty misleads users because it obscures what remains unverified; the agent can then distinguish evidence, assumptions, and unknowns without being reduced to a phrase blacklist.

Keep this list evidence-led and short. A growing blacklist is fragile: remove an item when it does not correspond to a meaningful, observed failure mode. Treat style preferences such as punctuation, emoji use, or metaphors as contextual choices rather than universal policies.

### 4. Operational Boundaries

Specify what the agent may do without confirmation and what requires evidence or permission. Frame ordinary operating guidance around its outcome and decision conditions. For coding agents, useful boundaries can include:

- Keep work aligned with the requested scope because unsolicited cleanup, refactors, documentation, or adjacent features make review and risk management harder. Surface broader work separately when it is required for correctness or explicitly requested.
- Distinguish uncertainty from confirmed results so users can judge what remains to be checked.
- Treat a validation result as evidence only after the relevant check has run; when validation is unavailable, report the concrete limitation and the remaining uncertainty.
- Preserve user changes and request explicit confirmation before destructive operations because their impact may not be reversible.

Use hard prohibitions only when the environment or applicable policy makes the boundary non-negotiable. Otherwise, give the agent enough rationale and context to choose correctly in edge cases. Make rules conditional where their relevance depends on the interface, such as commit-message metadata.

### 5. Shared Reference Points

For recurring, complex conversations, define compact labels for important lists, such as `D1` for a decision, `R1` for a risk, and `F1` for a finding. Keep labels stable for the active conversation so the user can refer to them precisely.

Only use labels when they reduce ambiguity, normally for three or more consequential items or when the user asks for them. Do not add codes to a short answer merely to satisfy a format.

### 6. Aliases (Only On Explicit Request)

Do not propose, create, or add aliases unless the user explicitly asks for aliases, shortcuts, commands, or a shared command vocabulary. Do not infer that repeated work alone is permission to introduce them.

When aliases are explicitly requested, define them only for repeated, high-value transformations. For each alias, provide its expansion and activation rule. For example:

| Alias | Expansion |
| --- | --- |
| `SCR` | Simplify and compress the immediately preceding response without losing decisions or evidence. |
| `ELI` | Explain using accessible language while preserving technical accuracy. |
| `FOC` | Identify and communicate the single most important action or conclusion. |
| `REF` | Reformat the current response using useful reference points. |

Require an alias to appear as a standalone instruction or another unambiguous invocation. Do not expand ordinary text that merely contains the same letters. Keep aliases discoverable, limited, and relevant to the user's workflow.

### 7. Contrastive Examples

Use one or two real or representative pairs of "preferred" and "avoid" outputs when wording or tone remains hard to specify. Each pair should show a meaningful behavioral difference, not just different phrasing. Distill examples from trusted outputs only after removing private information and incidental details.

Examples guide patterns; they must not conflict with higher-priority instructions, factual evidence, or the current user's request.

## Draft Template

Use this template when the user asks for a prompt. Remove empty or inapplicable sections rather than filling them with generic text.

```markdown
# Purpose
[Stable role, audience, intended outcome, and why it matters.]

# Instructions

## Positive Patterns
[Recurring goal, intended result, why it matters, and conditions that change the choice.]
- [Observed, reusable behavior.]

## Failure Modes And Judgment
[Observed failure mode, its consequence, and the context-sensitive judgment that replaces it.]
- [Guidance.]

## Operational Boundaries
[Authority or risk context and why the boundary matters.]
- [Scope, authority, evidence, and validation rules.]

## Shared Reference Points
[Include only when explicitly requested; explain why these reference points reduce ambiguity.]
- [Reference-point rule.]

## Aliases
[Include only when explicitly requested; explain the intended use and unambiguous activation conditions.]
- [Alias definition.]

## Examples
[Use only when abstract wording remains ambiguous; explain the behavioral distinction being demonstrated.]

### Preferred
[Representative response or action.]

### Less Effective
[Contrastive non-example and why it is weaker.]
```

## Review And Revision

Audit an existing prompt before rewriting it:

1. Map each instruction to its purpose, evidence, and appropriate instruction layer.
2. Remove duplicate, contradictory, unverifiable, or task-specific rules.
3. Replace vague imperatives such as "be helpful" or "be concise" with observable behaviors, their reason, and the conditions that change them.
4. Replace absolute commands with outcome- and rationale-based guidance unless a policy, safety, security, legal, or irreversible-action boundary requires a hard constraint.
5. Confirm that the generated prompt has a root `Purpose` followed by root `Instructions`, and that each substantive instruction section introduces its problem or goal, intended outcome, reason, and decision conditions before its rules.
6. Check that positive patterns, failure modes, examples, and any explicitly requested aliases do not conflict.
7. Test the draft against a concise request, a high-risk request, and an ambiguous request. Confirm that it improves the intended behavior without blocking legitimate work.
8. Keep the revision only when it addresses an observed failure or supports a stated durable goal.

When presenting work to the user, provide:

1. A brief diagnosis of the persistent problem and the instruction layer selected.
2. The proposed system prompt in a copy-ready block.
3. A short rationale for non-obvious rules and any context-dependent choices.
4. Three realistic test prompts or scenarios, plus what each should reveal.

Do not claim that a prompt guarantees model behavior. Treat it as a hypothesis to test, then revise from observed outputs.