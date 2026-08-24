# Pi Harness Reference

Read this file only when running inside the **pi** harness. It maps the generic steps of the main SKILL.md onto pi-specific capabilities.

## Phase 0: Gather Session Context — pi-specific sources

Unlike harnesses without session memory, pi provides direct session and memory tools. Use them before falling back to reconstruction alone.

### Step A: Search Session History

Use `session_search` (semantic, indexed past conversations) with concrete terms from this session's goal. For deeper detail on a specific prior session, use `pi_session_search` to locate it by literal text, then `pi_session_query` with a targeted question (e.g. "What files were modified?" / "What approach was chosen?").

Extract:
- **Goal**: What did the user accomplish?
- **Steps taken**: Ordered actions (tools used, files touched, commands run)
- **Corrections**: Where did the user redirect your approach? These become Rules in the skill.
- **Tools used**: Which pi tools were critical?
- **Decision points**: Where did you or the user choose between alternatives?

### Step B: Search Durable Memory

Use `memory_search` scoped to the relevant target (`user`, `project`, `failure`) for prior corrections, conventions, and known pitfalls related to this workflow. Corrections found here become hard Rules in the generated skill.

## Phase 1: Interview — pi specifics

- Use the `ask_user_question` tool for ALL questions. Never ask questions via plain text.
- The tool appends a freeform "Type something." row automatically — do not author your own "Other" option.
- Execution context options: `inline` (default, current conversation) or `subagent` (delegated via pi's `subagent` tool).

## Phase 3: Review and Save — pi save locations

ALWAYS ask about save location, even when one seems obvious. Four options:

| Scope | Path | Notes |
| --- | --- | --- |
| User-level, shared across harnesses | `~/.agents/skills/<name>/SKILL.md` | Follows the user everywhere; pi, Claude Code, and other Agent Skills platforms load it |
| User-level, pi-specific | `~/.pi/agent/skills/<name>/SKILL.md` (pi default) | Follows the user across all projects, pi only |
| Project-level, shared across harnesses | `.agents/skills/<name>/SKILL.md` | This project's workflows on any compatible platform |
| Project-level, pi-specific | `.pi/skills/<name>/SKILL.md` | This project's workflows, pi only; loaded only after the project is trusted |

On approval:
1. Create the skill directory at the chosen location via `safe_bash`.
2. Write the SKILL.md file.
3. Create a `references/` subdirectory if the skill has reference files.

Confirm to the user:
- Where the skill was saved
- How to invoke: `/skill:<name> [arguments]` (arguments are appended as `User: <args>`)
- That they can edit the SKILL.md directly to refine it
- That the skill loads at next pi startup (new files are discovered at session start)
- Optionally offer registering the same procedure via pi's `skill_manage` tool for persistent procedural memory
