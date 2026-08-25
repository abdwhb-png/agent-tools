# Recover a GitHub Copilot Session in VS Code

Use this reference during Skillify Phase 0 when the visible conversation is incomplete and VS Code exposes a target Copilot session-log directory. The goal is workflow reconstruction, not agent troubleshooting.

## Source

Resolve the runtime variable that points to the target session log, commonly `VSCODE_TARGET_SESSION_LOG`. Start with `main.jsonl` in that directory.

Relevant companion files may include:

- `system_prompt_*.json`: instructions active during a model request.
- `tools_*.json`: tools available during a model request.
- `runSubagent-*.jsonl` or `searchSubagent-*.jsonl`: delegated work referenced by the main session.

Ignore title, categorization, and summarization logs unless they directly contain missing workflow evidence.

## Safety and Scope

- Inspect the file size before reading. Session logs can be large.
- Search or stream the log first. Do not load the entire file into context.
- Read only the narrow slices needed to reconstruct the workflow.
- Do not expose secrets, credentials, environment values, or unrelated conversation content in the generated skill.
- Treat model reasoning as supporting context, not as proof of an action. Prefer recorded tool calls, results, user corrections, and repository artifacts.
- Follow child-session references only when delegated work materially affected the captured workflow.

## Evidence to Extract

Build a compact chronology from these records:

| Evidence | Skillify use |
| --- | --- |
| `user_message` | Initial goal, later requirements, corrections, approvals |
| `tool_call` | Tools used, arguments relevant to the workflow, success or failure |
| `agent_response` | Proposed steps, decisions communicated to the user, handoffs |
| `subagent` and child-session references | Delegated research or execution that materially changed the result |
| `llm_request.userRequest` | Full user request when the visible message is truncated |
| `turn_start` / `turn_end` | Ordering of actions within a request |

Extract only what Phase 0 needs:

1. Goal and requested output.
2. Ordered actions that produced the result.
3. Files, commands, tools, and external sources that were essential.
4. User corrections and constraints that should become durable rules.
5. Decision points and rejected alternatives.
6. Failures, recovery steps, and final validation evidence.

## Windows Workflow

Use PowerShell streaming commands against `main.jsonl`:

```powershell
$log = Join-Path $env:VSCODE_TARGET_SESSION_LOG 'main.jsonl'
(Get-Item $log).Length
Select-String '"type":"user_message"|"type":"tool_call"|"type":"subagent"' $log
Select-String '"status":"error"' $log
Get-Content $log -Tail 50
```

If the runtime variable is supplied as a template value rather than an environment variable, substitute that resolved directory directly into `$log`.

Use Node.js only for a bounded or already-small file when structured filtering is necessary:

```powershell
node -e "const fs=require('fs'); const p=process.argv[1]; for(const line of fs.readFileSync(p,'utf8').split('\n')) { if(!line) continue; const e=JSON.parse(line); if(['user_message','tool_call','subagent'].includes(e.type)) console.log(JSON.stringify({type:e.type,name:e.name,status:e.status,attrs:e.attrs})); }" $log
```

## macOS, Linux, or WSL Workflow

```bash
log="$VSCODE_TARGET_SESSION_LOG/main.jsonl"
wc -c "$log"
grep -E '"type":"(user_message|tool_call|subagent)"' "$log"
grep '"status":"error"' "$log"
tail -n 50 "$log"
```

Use `jq` for targeted structured extraction when available, but keep queries bounded to the evidence categories above.

## Reconstruction Output

Before continuing to the Skillify interview, produce an internal summary in this form:

```markdown
## Session Reconstruction

- Goal: ...
- Ordered workflow: ...
- Essential tools and artifacts: ...
- User corrections: ...
- Decisions and rejected paths: ...
- Failures and recovery: ...
- Validation and final outcome: ...
- Unresolved gaps: ...
```

Cross-check this summary against `git diff`, recent commits, created artifacts, and command results. If the log and repository disagree, keep the contradiction visible and ask the user rather than choosing a convenient version.

## Completion Criteria

Session recovery is complete when the summary identifies the repeatable process and its evidence without importing unrelated chat content. If important gaps remain, carry them into Skillify Phase 1 as focused user questions.