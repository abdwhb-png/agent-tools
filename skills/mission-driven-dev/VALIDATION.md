# Qualification — 2026-09-23

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
