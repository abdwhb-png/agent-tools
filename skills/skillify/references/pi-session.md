# Recover a Pi Session

Use this reference during Skillify Phase 0 when the visible Pi conversation is incomplete. The goal is to reconstruct the repeatable workflow from Pi's standard persisted session format, without depending on extension-provided search or memory tools.

Official reference: <https://pi.dev/docs/latest/session-format>

## Source

Pi stores sessions as JSONL files under:

```text
~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl
```

`<path>` represents the working directory with `/` replaced by `-`. Each line is one JSON object with a `type` field.

The first line is a session header containing metadata such as the session version, ID, timestamp, and working directory. Current sessions use version 3. Older versions are migrated when Pi loads them.

## Locate the Session

1. Derive the project session directory from the current working directory.
2. List candidate `.jsonl` files by modification time instead of loading every session.
3. Inspect each candidate's session header and optional `session_info` name.
4. Use the working directory, timestamp, session name, and first relevant user message to identify the correct session.
5. If multiple candidates remain plausible, ask the user to choose rather than merging unrelated sessions.

Pi's `/resume` picker can help identify or name the intended session interactively. Do not delete, branch, clone, or append to a session merely to inspect it.

## Understand the Session Tree

Except for the header, entries contain an `id`, `parentId`, and timestamp. These links form a tree rather than a flat transcript:

- The first entry has `parentId: null`.
- Each later entry points to its parent.
- Branching creates multiple children from an earlier entry.
- The current leaf identifies the active path.

Do not reconstruct the workflow by blindly reading file order. Follow the active leaf back through `parentId` to the root, then reverse that path into chronological order. Preserve relevant abandoned paths only when a `branch_summary` or user correction materially affected the final workflow.

When Pi's `SessionManager` API is available, prefer its structured methods:

- `SessionManager.list(cwd, sessionDir?, onProgress?)`: list sessions for a project.
- `SessionManager.listAll(onProgress?)`: list sessions across projects.
- `SessionManager.open(path, sessionDir?)`: open an existing session.
- `getBranch(fromId?)`: walk from an entry to the root.
- `buildContextEntries()`: obtain the active branch with compaction applied.
- `buildSessionContext()`: obtain the messages, model, and thinking level used for context.
- `getEntries()`, `getHeader()`, `getSessionName()`, and `getSessionFile()`: inspect persisted session metadata and entries.

Use read and context-building methods only. Do not call append, branch, reset, fork, or session-switching methods during recovery.

## Evidence to Extract

Relevant entry and message types include:

| Evidence | Skillify use |
| --- | --- |
| `message` with role `user` | Initial goal, later requirements, corrections, approvals |
| `message` with role `assistant` | Proposed steps, decisions communicated to the user, tool calls |
| `message` with role `toolResult` | Tool outcomes, errors, validation evidence |
| `bashExecution` message | Commands, output, exit status, cancellation or truncation |
| `compaction` | Summary and retained context from earlier work |
| `branch_summary` | Relevant exploration or decisions from an abandoned branch |
| `custom_message` | Extension-injected context that participated in the conversation |
| `session_info` | User-defined session name |
| `label` | User-defined checkpoints or markers |

`custom` entries persist extension state but do not participate in the model context. Ignore them unless their data is necessary to understand an action that is independently confirmed elsewhere.

Extract only what Skillify Phase 0 needs:

1. Initial goal and requested output.
2. Ordered actions on the active branch.
3. Files, commands, tools, skills, and external sources that were essential.
4. User corrections and constraints that should become durable rules.
5. Decision points and rejected alternatives.
6. Failures, recovery steps, and final validation evidence.
7. Relevant branch or extension context that materially changed the result.

Treat assistant reasoning and proposed actions as context, not proof. Prefer tool results, bash exit codes, file changes, explicit user decisions, and final artifacts.

## Compaction Handling

Compaction entries summarize earlier context and may include `retainedTail`:

- When `retainedTail` exists, treat the compaction as a self-contained checkpoint, then include entries after it on the active path.
- For older sessions using `firstKeptEntryId`, include the retained range described by the session format before continuing with later entries.
- Keep compaction summaries distinguishable from verbatim messages. Verify material claims against tool results or repository artifacts when possible.

Using `buildContextEntries()` or `buildSessionContext()` is safer than reproducing this logic manually when the Pi API is available.

## Direct JSONL Fallback

When `SessionManager` is unavailable, inspect the JSONL file with streaming or bounded commands. Do not load an unknown large session into model context.

Example on macOS or Linux:

```bash
session="$HOME/.pi/agent/sessions/--project-path--/<session>.jsonl"
wc -c "$session"
head -n 1 "$session"
grep -E '"type":"(message|compaction|branch_summary|session_info|label)"' "$session"
```

Example on Windows PowerShell:

```powershell
$session = Join-Path $HOME '.pi\agent\sessions\--project-path--\<session>.jsonl'
(Get-Item $session).Length
Get-Content $session -TotalCount 1
Select-String '"type":"(message|compaction|branch_summary|session_info|label)"' $session
```

For accurate branch reconstruction, use a small parser that indexes entries by `id`, identifies the active leaf, walks `parentId` links to the root, and applies compaction rules. Prefer the official `SessionManager` implementation when it is installed.

## Optional Extension Tools

An extension may provide tools such as semantic session search, targeted session queries, durable memory search, structured user questions, managed shell access, or skill registration. These are not part of Pi's default toolset.

Use an extension-provided tool only when it is actually available in the current harness. Treat it as an optional acceleration layer, not as a prerequisite or standard Pi capability. The persisted JSONL session and Pi's `SessionManager` remain the source of truth.

## Pi Save Locations

When the user chooses where to save the generated skill, offer the relevant standard locations:

| Scope | Path | Notes |
| --- | --- | --- |
| User-level, shared across harnesses | `~/.agents/skills/<name>/SKILL.md` | Available to compatible Agent Skills platforms |
| User-level, Pi-specific | `~/.pi/agent/skills/<name>/SKILL.md` | Pi's user-level skill directory |
| Project-level, shared across harnesses | `.agents/skills/<name>/SKILL.md` | Shared project workflow |
| Project-level, Pi-specific | `.pi/skills/<name>/SKILL.md` | Pi project skill, loaded after the project is trusted |

Use the file and directory tools actually available in the current harness to save the skill. Do not assume custom shell or skill-management tools exist.

Pi invokes a discovered skill as `/skill:<name> [arguments]`. New files are normally discovered at session startup, so tell the user when a new Pi session is required.

## Reconstruction Output

Before continuing to the Skillify interview, produce an internal summary:

```markdown
## Session Reconstruction

- Session file: ...
- Active leaf or branch: ...
- Goal: ...
- Ordered workflow: ...
- Essential tools and artifacts: ...
- User corrections and approvals: ...
- Decisions and rejected paths: ...
- Failures and recovery: ...
- Validation and final outcome: ...
- Unresolved gaps: ...
```

Cross-check this summary against `git diff`, recent commits, created files, and command results. If the session and repository disagree, preserve the contradiction and ask the user.

## Completion Criteria

Session recovery is complete when the active workflow and its evidence are reconstructed from the standard Pi session data without assuming extension-only capabilities. Carry important gaps into Skillify Phase 1 as focused user questions.