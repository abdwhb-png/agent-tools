---
name: better-ux-flow
description: Diagnose, design, and implement easier application workflows by reducing unnecessary decisions, clarifying task order, and making errors recoverable. Use for confusing forms, onboarding, setup, conditional or multi-step journeys, and SaaS tasks with or without data entry. Use when people struggle to understand what to do next, repeat information, lose progress, or get stuck. Do not use for purely visual styling or dashboard metric definitions.
---

# Better UX Flow

Help people complete their task with less uncertainty, avoidable work, and recovery effort. Improve the decisions and transitions that shape the experience before adding screens or decoration. Work independently using the project's existing components and conventions.

## When to Use

Use this skill to diagnose friction, design a new application journey, or implement a requested improvement to an existing one. Cover forms, onboarding, configuration, review and approval tasks, and workflows that involve navigation or selection without a form.

## When Not to Use

For changes limited to colors, spacing, typography, visual polish, or a component's isolated implementation bug, follow the narrower task. For dashboard metric definitions or product strategy, use the appropriate domain workflow. Do not expand these requests into a journey redesign unless evidence shows that the requested outcome depends on it.

## 1. Establish the task and evidence

A confusing screen can reflect missing product knowledge, unnecessary work, or unclear presentation. Identify the actual obstacle so the change addresses a task users need to complete.

- Follow the requested mode: diagnose without editing, specify when planning is requested, and implement when implementation is authorized. Do not turn an implementation request into a report-only handoff.
- Read the relevant routes, components, validation, state ownership, and existing product/design documents. If a working interface is available, inspect the actual task and its failure states using the available browser tools.
- Establish who performs the task, how often, what starts it, what counts as completion, and which business rules must remain true. Distinguish first-time guidance from repeated expert work.
- Trace the current path: decisions, required information, dependencies, waits, navigation, and points where work can be lost. Reuse existing evidence of confusion or abandonment when available.
- Separate observed behavior, supplied facts, and hypotheses. Do not invent analytics, user research, conversion gains, or backend capabilities.
- Ask only about missing decisions that change the solution. If the audience or desired outcome is unclear, ask a targeted question before choosing a new path. Continue independent inspection where possible.

## 2. Choose the least burdensome path

Extra screens can hide complexity while increasing navigation and memory demands. Choose a structure that follows real task dependencies and keeps information together when users need to compare it.

| Task condition | Starting choice | Check before applying |
| --- | --- | --- |
| Related information can be completed or compared together | One page with meaningful groups | Keep context visible and make the main action easy to locate. |
| A choice makes later information relevant | Conditional disclosure | Define what happens to values and errors when relevance changes. |
| Later work genuinely depends on earlier decisions | Sequential steps | Give each step a meaningful task boundary and support correction. |
| Several subtasks can be completed independently | Task list with individual completion states | Preserve prerequisites only where they actually exist. |
| Users explore, compare, or repeatedly adjust settings | Free navigation with contextual help | Keep orientation and state without imposing an artificial order. |

Use field difficulty, unfamiliar decisions, dependencies, comparison needs, and interruption cost to choose. Field count alone is not a reason to split a form, and step count is not a reason to create a wizard. For a simple task, keep the simple structure.

Explain the chosen structure in terms of the task and the friction it removes. Distinguish a reasoned design hypothesis from a measured improvement.

## 3. Reduce the work and define transitions

People should understand what is needed, why it matters, and what happens next without remembering hidden rules. Establish the functional behavior before deciding its final presentation.

- Challenge each requested input or decision: needed now, needed later, already known, derivable, or genuinely optional. Preserve required business information and make any proposed rule change explicit.
- Reuse information already supplied when still applicable. Make inferred defaults visible and editable where appropriate. Do not preselect consent or hide a consequential commitment behind a default.
- Order questions by dependencies and user understanding. Put explanations where a decision needs them, with persistent labels and specific action wording.
- Match each control to the decision: one choice, multiple choices, immediate state change, lookup, or free entry. Make requiredness, permitted answers, units, and the effect of the action understandable before asking for input. For control selection, mobile/autofill semantics, repeatable groups, or question wording, read [Input and decision design](references/input-and-decision-design.md).
- Define the entry conditions, main action, next state, back/edit path, and completion result. For optional work, explain what skipping means. Return users to a useful product location after completion.
- When branches change, distinguish retained drafts from applicable submission data. Revalidate dependent decisions rather than silently treating old answers as current.
- For multi-step work, expose the current task and remaining work honestly. Do not show a fixed total when the route is still unknown. Allow backward correction without requiring unrelated current fields to pass validation.
- Define exit and interruption behavior from actual persistence capabilities. Keep in-session state and durable save/resume distinct. If leaving loses work, explain that at the relevant moment rather than promising autosave.
- For destructive or bulk actions, establish the affected scope, consequences, and actual reversibility. Expose an existing undo or restore path with its real limits, and explain irreversible effects before commitment. Use review or confirmation when consequences justify it, without inventing rollback infrastructure or confirming every harmless action.

When the task involves conditional inputs, validation, submission, destructive actions, or interruption, read [Form behavior and recovery](references/form-behavior-and-recovery.md). Use it to resolve concrete behaviors without loading an additional design skill.

## 4. Implement within the product

Consistent controls and state ownership reduce both user confusion and maintenance cost. Use the existing implementation and design conventions to carry the chosen behavior through to a working interface.

- Extend the module that already owns the form or workflow state and reuse its validation and components. Preserve the established stack. Do not add a form engine, wrapper layer, package, or parallel business-rule implementation just to apply this skill.
- Follow the repository's testing workflow for behavior changes. Exercise the real public boundary and failure transitions, not a copied helper implementation.
- Use familiar accessible controls, meaningful grouping, clear actions, and usable keyboard/mobile behavior. Preserve the project's visual identity and scope changes to what the task requires.
- Keep required transitions and recovery behavior consistent across layouts. A narrow viewport must not hide the only way to proceed, correct an error, or leave the flow.

### Optional composition with a design skill

Competing design directions make the result inconsistent. Keep the functional journey explicit while letting a deliberately selected design workflow handle visual expression.

If the user explicitly uses Impeccable or another design skill alongside this one, share the goal, audience, necessary information, transitions, state behavior, and acceptance scenarios. Let that skill choose composition, density, typography, spacing, and visual treatment within the project's design system. Review any proposed functional change against the task and business rules.

Without a companion skill, complete the requested work using the project's components and conventions, or accessible conventional controls when none exist. Do not require, auto-load, install, or wait for Impeccable. Read product/design documents if present, but do not require particular filenames or create parallel design-system records.

## 5. Verify the task, not just the screen

A clear initial screen can still fail during correction or interruption. Verify the transitions affected by the change so users can finish and recover under realistic conditions.

- Walk the primary task from entry to a meaningful completion state. Check that removed inputs or steps do not remove necessary information or safeguards.
- Exercise relevant alternatives: back/edit, branch changes, invalid input, server rejection, delayed responses, retry, duplicate activation, and exit/re-entry.
- Check keyboard order, focus after navigation or failure, discoverable instructions, and operable controls on a narrow screen. Distinguish browser interaction checks from code inspection and automated tests.
- Report the chosen change, its reason, checks actually performed, and remaining uncertainty. Never infer screen-reader compatibility from keyboard testing alone or claim improved completion rates without supporting measurement.

Keep the output proportionate: a focused diagnosis, a concise behavior specification, or implemented changes with validation evidence. Save a separate specification only when requested or needed by the project's workflow. When measurement is warranted, propose task completion, correction effort, or recovery observations without inventing baselines or adding tracking infrastructure unasked.
