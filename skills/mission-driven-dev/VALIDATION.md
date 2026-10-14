# Qualification

## 2026-10-14 — Active-Actor Resumption Follow-up

The user authorized a narrow clarification and fictional test of a previous worker still active after the principal's session was lost. The existing resumption rule now names live actor identity, status, assignment and worktree; it forbids overlapping writes when the worker is active or its status unknown, and reconciles retained work when inactivity is established. No phase, schema or project artifact was added.

Case 10 in [evals.json](evals/evals.json) used two fresh `worker` contexts with identical `gpt-6-luna`/maximum-reasoning configuration. Each received the initial scenario, then the same fictional lookup branches: active worker, unavailable status and completed inactive worker. All four terminal reports were received. Both versions passed 6/6 assertions: check the actor first, await the active worker, withhold replacement on unknown status, review the completed result independently, retain the packet and respect authority. This explicit scenario demonstrates no comparative gain and is not a live concurrency test or reliability estimate. The principal graded the responses non-blindly; timing/token metrics were unavailable.

Focused structural checks before/after passed: `bun test ./tests/bundle.test.ts` (2 tests, 72 assertions), evaluation JSON/unique IDs and scoped whitespace checks. Validator code, schema and distribution were untouched, so the broader validator suite and typecheck were not rerun for this clarification. Previous failures remain historical evidence; the original grouped case 5 was not rerun. Full paired responses, snapshots, grading and static viewer are in the ignored `mission-driven-dev-workspace/actor-resumption-20261014.w9od5l/`; the [durable report](evals/qualification-2026-10-14.json) includes this follow-up separately. No installation, commit, real project modification or live mission-worker execution was performed.

## 2026-10-14 — Packet Outcomes and Execution Modes

Scope: canonical guidance, handoffs, example contract, decisions and evaluations for G1, the direct/coordinated choice, V1 independent packet acceptance and authorized progression. Validator source, generated distribution and artifact schema are unchanged. No global installation, project modification, commit or live mission qualification is included.

Executable checks: the existing 26-test bundle suite passed before the instruction changes (255 assertions) and afterward (263 assertions, including the additional local links). Typecheck, generated-distribution parity, standard skill frontmatter validation and scoped whitespace checks also passed. These checks cover structure, bundled examples and links, not whether an agent follows the instructions.

The user explicitly authorized isolated fictional before/after evaluations. Twelve fresh worker contexts used the same executor configuration (`worker`, `gpt-6-luna`, maximum reasoning, no inherited history). Four paired follow-up turns completed the mode-recording and progression scenarios. All 16 terminal reports were received. Evaluators read only their assigned instructions and fictional inputs, not live projects, expected answers or other outputs. Grading was performed by the implementing principal, not blindly or as independent implementation review.

| Comparison | Previous skill | Updated candidate | Interpretation |
| --- | --- | --- | --- |
| Earlier packet outcome, case 7 | 6/6 | 6/6 | Both split coherent outcomes and retain indivisible work. No comparative gain demonstrated. |
| Mode choice and recorded authority, case 8 with paired follow-up | 4/7 | 7/7 | Previous version offers worker arrangements but not principal-agent implementation. Updated version offers both modes with the expected contextual recommendation. |
| Direct resumption and progression, case 9 with paired follow-up | 7/7 | 7/7 | Both respect explicit direct-mode authority and independent acceptance in this scenario. |
| Existing boundaries, cases 1–6 grouped | 23/24 | 22/24 | Both omit an existing-actor check on blocked resumption. The initial candidate additionally omits the manual fallback when delegation authority is absent. |
| Standalone confirmation of that fallback, case 3 | 4/4 | 3/4 | Confirms the candidate omission outside the grouped scenario. |
| Fresh paired retest after fallback clarification, case 3 | 4/4 | 4/4 | The revised instruction supplies the manual handoff when either capability or authority is missing. |

The failed initial runs remain preserved. Only case 3 was behaviorally rerun after the fallback clarification, not the complete suite. The shared blocked-resumption omission remains an observed limitation despite the explicit actor check in `references/resumption.md`. These simulations do not prove live compliance, actual latency reduction or reliable boundary discovery: scenarios supply many relevant facts, each case/configuration has one initial run, and the principal graded its own change. Timing/token metrics are unavailable and omitted.

See [durable graded findings](evals/qualification-2026-10-14.json) and [reusable scenarios](evals/evals.json). Complete responses, instruction snapshots, assertion grading and a static review viewer are retained in the adjacent ignored `mission-driven-dev-workspace/execution-modes-20261014.ZhgmTb/`. User qualitative review and live Codex CLI/Pi qualification of this revision remain pending. The user's previously reported mission runs are motivation for this change, not qualification evidence for it.

## 2026-09-23 — Initial Bundle Qualification (Historical)

Scope: the local skill source, read-only validator, fictional examples and minimal general-brainstorming source patch. No global installation, commit, project pilot, integration or deployment is included.

## Executable Checks

Environment: Linux/WSL, Node 24.18.0, Bun 1.3.14, TypeScript 7.0.2. Only development type definitions were added (`@types/node` 24.0.0 with its locked transitive dependency), through Socket Firewall with an isolated cache. The delivered CLI has no runtime package dependency.

The focused suite contains 26 tests. Validator fixtures exercise both the real exported module and the generated Node CLI, comparing their exact reports from a different working directory. Covered cases include:

- **T1:** valid contracts; missing/invalid metadata; strict JSON frontmatter versus JSON records; malformed results/journals; missing or mismatched typed references; cyclic reference graphs.
- **T2:** active stale packets versus legitimate retained historical revisions; state/history agreement, sequence and transition errors; interrupted state independent of JSON key order; refusal to reopen terminal history.
- **T3:** accepted evidence before checkpointing; implementer self-acceptance rejection; fresh mission validation; a positive completed fixture; missing required proof.
- **T4:** default `docs/` ↔ `.missions/` references, alternative document conventions, all six example artifacts, local bundle links, unchanged contents/mtimes, no embedded command execution, invocation/read/invalid-input exit codes.

Behavior changes were introduced with observed failing tests before implementation. The final robustness pass first reproduced three failures (interruption comparison, serialization format, cached contract mistaken for history), then passed after their fixes. A stale distribution was also detected by the CLI parity check before regeneration. These tests check structure, not actual approval or test truth.

Maintainer checks: `bun run typecheck`, `bun run build`, `bun test ./tests`, `bun run verify:dist`, focused formatting/lint and both skills' standard frontmatter validation. Use `/usr/bin/python3` for the latter in this environment: the default Linuxbrew Python lacks PyYAML. No dependency was installed to work around it. See the delivered [maintenance procedure](MAINTENANCE.md).

## Behavioral Evaluations

The user explicitly authorized fictional isolated evaluators only. All 12 runs used the same general-purpose `worker` role (`gpt-6-luna`, maximum reasoning), `fork_turns: none`, without inherited parent conversation. Each evaluator could read its assigned instructions and write its own response, not inspect live projects or other runs. All required terminal final reports were received. Grading was done locally by the implementing coordinator, not blindly or by an independent reviewer.

| Comparison | Assertions with updated instructions | Baseline | Interpretation |
| --- | --- | --- | --- |
| Preparation, resumption, fresh-context routing | 12/12 | 10/12 without workflow skill | The baseline omitted manual fresh-context handoffs and exact revision/base context. Other boundaries already passed. |
| General brainstorming, standalone/approved design and exit authority | 5/5 | 5/5 before patch | No observed regression in these simulations; no demonstrated comparative gain. |
| Refused correction with workflow selected, old/new optional brainstorming | 4/4 | 4/4 with old brainstorming | Selected workflow ownership and evidence preservation survived this instruction variation. |

The first comparison does not load the global brainstorming skill. The third loads an old/new version alongside the same workflow. Both preserve the selected protocol, but this does not qualify actual harness skill discovery or instruction selection.

One run per case/configuration is not a reliability estimate. Baselines retain ambient safety instructions and the scenarios expose many expected boundaries. Token, timing and tool-call metrics were unavailable and are omitted. A refusal of a scope expansion is not automatically a new unresolved decision: both compatibility responses correctly preserve the phase and only propose `needs_decision` if an actual unknown prevents an in-scope correction. No measurable speed or intervention improvement is claimed.

Prompts live in [evals.json](evals/evals.json) and [brainstorming compatibility](evals/brainstorming-compatibility.json). The [durable graded evidence](evals/qualification-2026-09-23.json) includes assertions, findings and configuration. Raw responses, grading and static review pages remain in the adjacent ignored `mission-driven-dev-workspace/` and `brainstorming-workspace/` directories. One baseline response was written to a nested workspace by its evaluator and copied unchanged to the expected review location; its original is retained. User qualitative review remains pending.

## Remaining Qualification

- **Q1 — Codex/Pi live missions:** discovery, worktree creation/access, exact artifact availability, real fresh implementation/validation contexts and full terminal handoff have not been exercised as a development workflow. Evaluation subagents are not a mission pilot.
- **Q2 — Real delivery:** the Anti-Slop pilot, intervention burden, actual design quality, independent mission acceptance and execution reliability remain unmeasured. The user chooses and launches that pilot in its own task.
- **Q3 — Other platforms and unrelated code:** Windows/macOS runtime qualification and repository-wide tests were not run. Focused checks cover this portable bundle; existing instruction-sync/README changes are outside scope.

The validator cannot authenticate approval, actor identities, freshness claims, existing Git commits, append-only history over time, or a test reported in prose. It reads only the supplied artifact and its typed reachable references. Inspect `state.json` before dispatch; validating a historical contract alone does not establish readiness. Installation and any broader validation require their own authorization.
