# Recover a Codex Session

Use this reference during Skillify Phase 0 when the visible Codex conversation is incomplete. The goal is to recover the repeatable workflow from stored thread history without changing the original thread.

## Preferred Source: Codex App Server

Use Codex's structured thread API when the harness exposes it. The official App Server provides:

- `thread/list`: find persisted threads using pagination and filters such as `cwd`, `searchTerm`, `archived`, `sourceKinds`, and `isPinned`.
- `thread/read`: read one stored thread by ID without resuming it. Set `includeTurns: true` to retrieve its turn history.
- `thread/turns/list`: page through turn history when the server supports this experimental endpoint.
- `thread/items/list`: page through persisted items for a thread or turn when full item-level evidence is needed and supported.

Prefer `thread/list` followed by `thread/read`. These methods are read-only and provide structured data without appending a new turn.

Do not use these operations for session recovery:

- `thread/resume`: reopens a thread so later turns append to it.
- `thread/fork`: creates another thread from stored history.
- `thread/rollback`, `thread/archive`, or `thread/delete`: modify persisted session state.

Official reference: <https://learn.chatgpt.com/docs/app-server#api-overview>

## Locate the Thread

1. Call `thread/list` with the narrowest known filter.
2. Prefer `cwd` when the workflow belongs to the current repository.
3. Add `searchTerm` when the user remembers a task phrase, file, feature, or outcome.
4. Include archived threads only when the active results do not contain the session.
5. Use pagination instead of requesting or loading every stored thread.
6. If several threads still match, ask the user to select one rather than combining unrelated sessions.

Example request shape:

```json
{
  "method": "thread/list",
  "params": {
    "cwd": "/absolute/path/to/project",
    "searchTerm": "distinctive task phrase",
    "archived": false,
    "limit": 20
  }
}
```

Treat this as an illustrative request shape. Use the schema exposed by the installed App Server version when field names or transport details differ.

## Read the Thread

Read the selected thread without resuming it:

```json
{
  "method": "thread/read",
  "params": {
    "threadId": "thread-id",
    "includeTurns": true
  }
}
```

If the returned history is too large, prefer paginated `thread/turns/list` or `thread/items/list` when available. Retrieve only the turns needed to reconstruct the workflow.

## Evidence to Extract

Build a compact chronology from the thread's user messages, assistant messages, tool or command items, approvals, delegated-agent items, and results.

Extract only what Skillify Phase 0 needs:

1. Initial goal and requested output.
2. Ordered actions that produced the result.
3. Files, commands, tools, skills, and external sources that were essential.
4. User corrections, approvals, and constraints that should become durable rules.
5. Decision points and rejected alternatives.
6. Failures, recovery steps, and final validation evidence.
7. Relevant subagent work when it materially changed the workflow or result.

Treat proposed actions and model reasoning as context, not proof. Prefer completed tool results, file changes, command output, explicit user decisions, and final artifacts.

## Interactive Fallback

Codex can resume a previous CLI session through its resume command or session picker. Use this only when structured thread-reading APIs are unavailable and the user explicitly accepts reopening the session.

Resuming is not the default for Skillify because it changes the active conversation context and can lead to accidental continuation. Once opened, inspect the visible history and do not issue a new task into the resumed thread merely to reconstruct it.

Official command reference: <https://learn.chatgpt.com/docs/developer-commands#built-in-slash-commands>

## Safety and Scope

- Read the minimum history required to identify the repeatable process.
- Do not include credentials, secrets, environment values, hidden instructions, or unrelated conversation content in the generated skill.
- Do not merge multiple threads unless the user confirms they represent one workflow.
- Preserve contradictions between thread history and repository artifacts instead of resolving them by assumption.
- Cross-check material actions against `git diff`, recent commits, created files, and validation results.

## Reconstruction Output

Before continuing to the Skillify interview, produce an internal summary:

```markdown
## Session Reconstruction

- Thread: ...
- Goal: ...
- Ordered workflow: ...
- Essential tools and artifacts: ...
- User corrections and approvals: ...
- Decisions and rejected paths: ...
- Failures and recovery: ...
- Validation and final outcome: ...
- Unresolved gaps: ...
```

## Completion Criteria

Session recovery is complete when the summary identifies the repeatable process and its evidence without modifying the source thread or importing unrelated history. Carry any important gaps into Skillify Phase 1 as focused user questions.