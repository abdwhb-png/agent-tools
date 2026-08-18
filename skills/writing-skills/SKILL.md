---
name: writing-skills
description: Create, audit, or revise agent skills for repeated workflows, including instructions and evaluations. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.
---

# Writing Skills

Create and improve reusable agent skills. This file defines the governing decisions for that work. The detailed workflow, evaluation process, scripts, and schemas are in [reference-skill-creator/SKILL.md](reference-skill-creator/SKILL.md); consult that reference after applying the rules in this file. When the two documents differ, this file takes precedence.

## When to Use

Use this skill when creating, auditing, or revising a reusable `SKILL.md`, including its frontmatter, workflow, templates, bundled resources, or evaluations.

Use it when a repeated correction points to a missing durable practice, when a skill produces inconsistent outputs, or when its scope overlaps with another instruction layer.

## When Not to Use

Use a task prompt for one-off work, repository instructions for local conventions, and a system prompt for stable behavior across unrelated tasks. Use a domain-specific skill for the actual implementation, debugging, research, or writing task rather than creating a skill only to perform it once.

## Governing Improvements

Apply these rules before following the detailed reference workflow:

1. Start from verified user needs, supplied examples, and observed failures. Ask focused questions when the recurring goal, scope, evidence, or acceptance criteria are unknown.
2. Keep the skill at the narrowest durable instruction layer. A skill owns a reusable multi-step workflow; one-off work belongs in the user prompt, local conventions belong in repository instructions, and cross-task behavior belongs in a system prompt.
3. Give the skill a short, precise description that names its outcome and compactly summarizes when it should trigger. Include `When to Use` and `When Not to Use` in the body to make those boundaries explicit and prevent it from displacing a narrower workflow.
4. Write each substantive section in this order: recurring problem or goal, intended result, why it matters, relevant decision conditions, then procedure. Prefer this rationale-led guidance to disconnected "do" and "don't" lists. Hard constraints are appropriate for policy, safety, security, legal, or irreversible-action boundaries.
5. Translate research sources, videos, prompts, and examples into self-contained operational guidance. The skill should state the resulting practice directly rather than cite its source material, research process, or a prior conversation.
6. Use examples only when they resolve a meaningful ambiguity. Contrastive examples should show a behavioral difference and its consequence, not merely alternate wording.
7. Add aliases, shortcuts, commands, or shared labels only after the user explicitly requests them. Each requested alias needs an expansion and an unambiguous activation condition; repeated work alone is not sufficient reason to introduce one.
8. When a skill produces a system prompt, generate root `# Purpose` followed by root `# Instructions`. Under `Instructions`, introduce each substantive section with its problem, result, reason, and decision conditions before its rules.
9. Preserve the requested scope. Add workflows, tools, scripts, and artifacts only when they solve an established recurring need.
10. Validate the skill after editing. For behavior changes with meaningful risk or scope, use representative requests including an ambiguous case and a boundary case. Assertions must be observable and discriminating; a result that passes equally with and without the skill does not demonstrate improvement.
11. Before launching evaluations, select an executor whose stated capabilities fit the task being evaluated. Compare the required work (for example, browser interaction, research, terminal testing, code editing, or general task execution) with the available agents' descriptions; do not select a specialized testing agent solely because the activity is called an evaluation. Use the same appropriate executor and configuration for the with-skill and baseline runs so agent choice cannot distort the comparison. Record the selected agent and why it fits in each eval's metadata. If no available agent is appropriate, notify the user that a valid comparative evaluation cannot run, identify the missing capability, and stop that evaluation rather than substituting an unsuitable agent.

## Reference Workflow

Read [reference-skill-creator/SKILL.md](reference-skill-creator/SKILL.md) for the detailed creation, evaluation, benchmarking, and description-optimization process. Its bundled `agents`, `assets`, `references`, `scripts`, and `eval-viewer` directories provide the supporting resources named by that workflow.
