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

Capture this session's repeatable process as a reusable `SKILL.md` file that follows the [agentskills.io](https://agentskills.io) open standard — compatible with Claude Code, Cursor, GitHub Copilot, Gemini CLI, VS Code, pi, and other Agent Skills platforms.

## When to Use

The user asks to persist the current session's process as a skill ("skillify this", "save this workflow"), typically at the end of a completed multi-step task.

## When Not to Use

Do not use for one-off tasks unlikely to repeat (a task prompt is enough), for project-local conventions that belong in AGENTS.md or repository instructions, or for stable cross-task behavior that belongs in a system prompt.

> **If you are running in the pi harness** (earendil-works/pi-coding-agent): read [references/pi-harness.md](references/pi-harness.md) before starting Phase 0. It maps each phase onto pi-specific tools (`session_search`, `memory_search`, `ask_user_question`, `safe_bash`, `skill_manage`) and defines the four pi save locations. Agents on other platforms ignore this reference safely.

> **If you are running in VS Code with GitHub Copilot** and the visible conversation does not contain enough detail to reconstruct the workflow: read [references/vscode-copilot-session.md](references/vscode-copilot-session.md) before starting Phase 0. It explains how to recover the session's requests, tool actions, corrections, decisions, and outcomes from Copilot's session log without loading the full log into context.

> **If you are running in Codex** and the visible conversation does not contain enough detail to reconstruct the workflow: read [references/codex-session.md](references/codex-session.md) before starting Phase 0. It uses Codex's structured thread APIs to locate and read stored session history without resuming or modifying the thread.

## Inputs

- `$focus`: Optional. Restrict capture to one part of the session instead of the whole session.

## Goal

A validated `SKILL.md` saved at a location chosen by the user, following the agentskills.io standard, so the captured workflow is reusable on demand across compatible agent platforms.

## Phase 0: Gather Session Context

Reconstruct the session using complementary sources. If your harness provides session or memory search tools, use them first. In VS Code with GitHub Copilot or in Codex, use the matching session reference only when the visible conversation is incomplete; otherwise rely on the conversation and repository artifacts.

### Step A: Review Conversation History

Look back through the entire conversation. Extract:
- **Goal**: What did the user ask you to accomplish?
- **Steps taken**: Ordered actions (tools used, files touched, commands run)
- **Corrections**: Where did the user redirect your approach? These become Rules in the skill.
- **Tools used**: Which tools were critical?
- **Decision points**: Where did you or the user choose between alternatives?

**Success criteria**: A written summary covering goal, ordered steps, corrections, and decision points.

### Step B: Check Git Artifacts

Fill gaps in conversation context with recent changes:

```bash
git diff --stat | head -30
git log --oneline -10
```

Skip when outside a git repository.

**Success criteria**: Recent file changes and commits reviewed, or repository absence confirmed and skipped.

### Step C: Detect Project Context

Auto-detect the project's tooling so the generated skill uses the right commands:

```bash
{ [ -f package.json ] && echo "NODE: $(grep -E '"(name|test|build|lint)"' package.json | head -5)"; \
  [ -f Makefile ] && echo "MAKE: $(head -20 Makefile | grep '^[a-z].*:')"; \
  [ -f Cargo.toml ] && echo "RUST: $(head -5 Cargo.toml)"; \
  [ -f go.mod ] && echo "GO: $(head -3 go.mod)"; \
  [ -f pyproject.toml ] && echo "PYTHON: $(head -10 pyproject.toml)"; } 2>/dev/null \
  || echo "No standard project files detected"
```

**Success criteria**: Project tooling identified, so Phase 2 commands match the environment.

## Phase 1: Interview the User

Use your harness's structured question tool for ALL questions. Never ask questions via plain text. Iterate each round until the user is satisfied.

### Round 1: High-Level Confirmation

- Present your summary from Phase 0
- Suggest a **name** (lowercase, hyphens only, max 64 chars per agentskills.io spec) and one-line **description**
- Suggest high-level goal(s) and success criteria
- Ask the user to confirm, rename, or adjust

### Round 2: Structure and Scope

- Present steps as a numbered list. Tell the user you'll dig into per-step detail next round.
- If the skill needs **arguments**, suggest them based on what you observed. Clarify what a future user would provide.
- Ask **execution context**: `inline` (default — runs in current conversation, user can steer mid-process) or delegated/subagent (isolated, better for self-contained tasks).
- Ask **save location** — ALWAYS ask this question, even when one location seems obvious. Never skip it and never assume. Generic options:
  - **User-level, shared across harnesses** (`~/.agents/skills/<name>/SKILL.md`) — follows the user everywhere; every Agent Skills platform loads it
  - **Project-level, shared across harnesses** (`.agents/skills/<name>/SKILL.md`) — this project's workflows on any compatible platform
  - Harness-specific locations exist too (e.g. `~/.claude/skills/`, `~/.pi/agent/skills/`) — offer them when relevant

**Success criteria**: Name, description, steps list, arguments, execution context, and save location confirmed by the user.

### Round 3: Step-by-Step Detail

For each major step (skip if obvious), ask:
- What does this step **produce** that later steps need? (artifacts: PR URL, commit SHA, file path)
- What **proves** this step succeeded? (success criteria — required on every step)
- Should the user **confirm** before proceeding? (human checkpoint — for irreversible actions)
- Can any steps run in **parallel**? (concurrent steps use sub-numbers: 3a, 3b)
- What are **hard rules**? (constraints from user corrections found in Step A, must/must-not)

Do multiple rounds if there are more than 3 steps or complex decision points.

**Success criteria**: Every major step has an artifact definition, success criteria, and explicit parallelism/checkpoint decisions.

### Round 4: Triggers and Edge Cases

- Confirm **when** this skill should be invoked — suggest trigger phrases
  - Example: "Use when the user says 'cherry-pick', 'hotfix', or 'CP this PR to release'"
- Ask about edge cases, gotchas, or failure modes to handle
- Ask if the skill should be **cross-platform** (if yes, avoid harness-specific tool names in the body)

Stop interviewing once you have enough. Don't over-ask for simple 2-3 step processes.

**Success criteria**: Trigger phrases confirmed and edge cases either documented or explicitly declined.

## Phase 2: Write the SKILL.md

Generate a `SKILL.md` following the agentskills.io standard (`name` ≤64 chars lowercase-hyphens matching directory name, `description` ≤1024 chars; unknown frontmatter fields are ignored by agents that don't understand them).

### Frontmatter Template

```yaml
---
name: {{skill-name}}
description: >
  {{One-line description. Start with an action verb. Under 1024 chars.
  Include "Use when..." trigger context so agents know when to activate.}}
license: MIT
metadata:
  author: {{user or org name}}
  version: "1.0.0"
{{Optional: allowed-tools — some platforms accept permission narrowing here.
Omit unless the workflow needs explicit permission constraints.}}
---
```

### Body Template

```markdown
# {{Skill Title}}

{{Brief description of what this skill does and its goal.}}

## Inputs

- `$arg_name`: Description of this input

## Goal

{{Clearly stated goal. Include concrete success artifacts
(e.g., "an open PR with CI passing" not just "code changes").}}

## Steps

### 1. {{Step Name}}

{{Specific, actionable instructions. Include commands where appropriate.}}

**Success criteria**: {{How to know this step is done.}}

### 2. {{Step Name}}

...
```

### Writing Rules

**Frontmatter:**
- `name`: lowercase, hyphens only, max 64 chars, matching directory name
- `description`: under 1024 chars, start with action verb, include "Use when..." triggers
- Prefer standard fields: `name`, `description`, `license`, `metadata`; add platform-specific fields only when needed

**Body:**
- **Success criteria** on EVERY step — required, not optional
- Use per-step annotations where helpful:
  - **Execution**: `Direct` (default), `Subagent` (parallel/isolated)
  - **Artifacts**: Data this step produces for later steps
  - **Human checkpoint**: Pause for user confirmation (irreversible actions)
  - **Rules**: Hard constraints (especially from user corrections found during Phase 0)
- Concurrent steps use sub-numbers: 3a, 3b
- Steps requiring user action get `[human]` in the title
- Keep simple skills simple — a 2-step skill doesn't need every annotation
- Put large reference material in a `references/` subdirectory, not inline

**Cross-platform compatibility:**
- The agentskills.io standard works across many agent platforms
- Avoid naming tools specific to one harness (`session_search`, `safe_bash`, ...) when cross-platform is requested
- Agents that don't understand extra fields simply ignore them

**Success criteria**: A complete draft SKILL.md exists, conforming to the templates and rules above, incorporating all interview answers.

## Phase 3: Review and Save

1. Output the complete SKILL.md in a fenced code block so the user can review
2. Ask for confirmation via your question tool: "Does this SKILL.md look good to save?"
3. On approval:
   - Create the skill directory at the location chosen in Round 2
   - Write the SKILL.md file
   - If the skill has reference files, create a `references/` subdirectory
4. Confirm to the user:
   - Where the skill was saved
   - How to invoke it (e.g. `/skill-name [arguments]` — adapt to their platform's invocation syntax)
   - That they can edit the SKILL.md directly to refine it
   - That most platforms load skills at startup — remind them to restart their agent session

**Success criteria**: The SKILL.md is saved at the confirmed location and the user knows where it lives, how to invoke it, and that a restart may be needed for discovery.
