---
name: skillify
description: >
  Capture a session's repeatable process into a reusable SKILL.md file following
  the agentskills.io standard, compatible with any agent platform. Use when the
  user says "skillify this", "turn this into a skill", "capture this as a skill",
  "make this repeatable", "save this workflow", or "create a skill from this
  session". Works at end of any workflow worth repeating.
license: MIT
metadata:
  author: abdwhb-png
  version: "2.0.0"
---

# Skillify — Turn Any Session Into a Reusable Skill

Turn a completed session into a concise, reusable `SKILL.md` that follows the [agentskills.io](https://agentskills.io) standard.

## When to Use

Use when the user asks to save, skillify, or make a completed workflow repeatable.

## When Not to Use

Do not use for one-off tasks, project conventions that belong in repository instructions, or cross-task behavior that belongs in a system prompt.

## Input

- `$focus`: Optional part of the session to capture. Default: the whole repeatable workflow.

## Workflow

### 1. Reconstruct the Session

Review the conversation and relevant repository artifacts. Extract:

- goal and final outcome;
- ordered actions and essential tools;
- user corrections and hard constraints;
- decisions, rejected paths, failures, and validation.

Use platform session history only when the visible conversation is incomplete:

- Pi: [references/pi-session.md](references/pi-session.md)
- VS Code with GitHub Copilot: [references/vscode-copilot-session.md](references/vscode-copilot-session.md)
- Codex: [references/codex-session.md](references/codex-session.md)

Cross-check material claims against changed files, commands, tests, or commits. Keep unresolved contradictions visible.

**Success criteria**: A factual workflow summary exists with no important gaps hidden by assumption.

### 2. Confirm the Skill Contract

Use the harness's structured question tool. Ask only what the session does not already establish, combining related choices when practical.

Confirm:

- name and trigger-focused description;
- goal, inputs, ordered steps, and expected artifacts;
- success criteria and hard rules for each major step;
- human checkpoints, parallelism, and important failure cases;
- inline or delegated execution;
- cross-platform requirements;
- save location. Always ask for the save location rather than assuming it.

Common locations:

- User shared: `~/.agents/skills/<name>/SKILL.md`
- Project shared: `.agents/skills/<name>/SKILL.md`
- Harness-specific locations from the relevant platform reference

Keep the interview proportional. A simple workflow may need one question round.

**Success criteria**: The user has confirmed the skill's scope, behavior, and save location.

### 3. Draft the Skill

Write a focused `SKILL.md` with:

- `name`: lowercase hyphenated directory name, at most 64 characters;
- `description`: action and trigger context, at most 1024 characters;
- `When to Use` and `When Not to Use` boundaries;
- optional inputs and a concrete goal;
- ordered, actionable steps with success criteria;
- user corrections expressed as durable rules;
- only the commands, examples, and annotations that improve execution.

Prefer standard frontmatter fields: `name`, `description`, `license`, and `metadata`. Put substantial platform or domain detail in `references/`. Avoid harness-specific tool names when the skill must be portable.

Keep simple skills simple. Do not preserve incidental debugging, narration, or session-specific details.

**Success criteria**: The draft is self-contained, concise, and reproduces the verified workflow.

### 4. Review and Save

Present the complete draft and request approval through the structured question tool. After approval:

1. Create the confirmed directory and files.
2. Validate frontmatter, links, and available checks.
3. Report the saved path, invocation syntax, validation performed, and whether a new agent session is required for discovery.

Do not save before approval.

**Success criteria**: The validated skill is saved at the chosen location and the user knows how to invoke it.
