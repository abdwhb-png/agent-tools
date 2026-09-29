---
name: review-delegation
description: Run a code review as parallel independent review lanes when the host can delegate. Use whenever the user asks for a code review, PR review, diff inspection, quality or security assessment, or merge-readiness evaluation.
---

# Review Delegation

Ensure code changes are examined for spec compliance, security, regression risk, and architectural integrity before merge. Independent lanes catch defects early and prevent regressions from reaching production.

## When to Use

- The user asks for a code review, PR review, diff check, or quality/security assessment.
- A feature, bug fix, or refactor is completed and ready for merge verification.
- Validating changes across multiple files or evaluating complex system interactions.

## When Not to Use

- **Implementation or editing**: Use an implementation workflow or worker agent instead.
- **Pre-implementation planning**: Use a planning or design-review workflow instead.
- **Trivial standalone reads**: Inspect directly with read/grep tools for single-line questions.

---

## Inputs & Scoping

Gather the exact review boundaries before proposing lanes, so the proposal is grounded and the user is choosing between real options.

1. **Inspect repository state**:
   ```sh
   git status --short
   git diff --stat
   git diff -- <scope>
   ```
2. **Clarify review scope**: Identify modified files, target branch, and relevant specifications or acceptance criteria.
3. **Propose the lane set** from the review angle matrix below, with one line of reasoning per lane. Drop any angle the change does not actually trigger.
4. **Confirm with the user before launching anything.** Ask which lanes to run using the host's question tool, presenting the recommended set as the default. A single-lane run is a valid answer. Do not launch a fan-out on your own judgment when the host can ask.

> **Harness-specific delegation:** this skill expresses review *angles*, not agent names or tool names. Agent identity and read-only tool access belong to the host. If you are running in:
> - the **pi** harness (earendil-works/pi-coding-agent): read [references/pi-harness.md](references/pi-harness.md) before delegating — it covers how to resolve lanes to agents, child tool contracts, and deadlines.
> - **Codex** (OpenAI Codex CLI/IDE/desktop): read [references/codex-harness.md](references/codex-harness.md) before delegating.
>
> On other platforms, delegate to whatever parallel mechanism exists, or run the lanes sequentially in-context if none does.

### Review Angle Decision Matrix

Pick angles from the change, then resolve each chosen angle to a reviewer the host actually exposes. The baseline angle is the one that covers spec compliance and logic.

| Angle | Trigger Conditions & Scope | Key Focus Areas |
| --- | --- | --- |
| **Correctness & spec** *(baseline)* | Every review | Spec compliance, logic errors, edge cases, error handling, tests |
| **Security** | Auth, tokens, crypto, user input, queries, file I/O, network endpoints, dependencies | Injection, permission escalation, secret exposure, unsanitized inputs |
| **Architecture & boundaries** | Major refactoring, new module seams, dependency direction changes, new subsystems | Boundary integrity, interface coupling, long-term maintenance, devil's advocate |
| **Interface & compatibility** | Changes to public functions, exported types, REST/RPC endpoints, CLI flags, configs | Backward compatibility, breaking changes, schema consistency, ergonomics |
| **Performance** | High-frequency loops, database indexing, concurrency, large payload parsing, large payload or file expansion | CPU/memory bottlenecks, resource leaks, algorithmic complexity, `O(N)` regressions |
| **Style & docs** | Large formatting overhauls, convention migrations, doc updates | Codebase idioms, naming rules, documentation completeness |

### Orchestration Pattern

Delegate one lane per chosen angle, concurrently, each with clean context and read-only tool access. Collect every lane result before synthesizing the verdict. The spawn mechanism is harness-specific; see the harness references above.

**Success criteria**: every confirmed angle ran on a real reviewer, each lane had a read-only mandate, and the discovery context or scope you scoped in step 1 reached every lane.

---

## Finding Taxonomy & Severity Rating

Classify every finding into one of four objective severity tiers:

| Severity | Definition | Merge Impact |
| --- | --- | --- |
| **CRITICAL** | Security exploit, data loss, auth bypass, or fatal crash | Hard merge blocker |
| **HIGH** | Spec violation, logic bug, regression, or unhandled error path | Hard merge blocker |
| **MEDIUM** | Performance issue, missing test coverage, or anti-pattern | Important improvement |
| **LOW** | Minor style nitpick, naming suggestion, or documentation typo | Non-blocking comment |

Every finding must provide:
1. **Location**: `file:line` citation.
2. **Issue**: Concrete description of what is wrong.
3. **Risk & Impact**: What fails, breaks, or leaks if unfixed.
4. **Concrete Fix**: Code snippet or clear actionable remediation.

---

## Decision Gate & Verdict Synthesis

Combine findings and lane recommendations into a deterministic verdict:

1. **REQUEST CHANGES**:
   - Any **CRITICAL** or **HIGH** severity finding exists.
   - The architecture lane reports **BLOCK**.
   - A confirmed lane failed or no reviewer was available for it.
2. **COMMENT**:
   - Only **MEDIUM** or **LOW** findings exist.
   - The architecture lane reports **WATCH** with no blocking findings.
3. **APPROVE**:
   - All confirmed lanes completed with verified evidence.
   - No CRITICAL or HIGH issues.
   - The architecture lane reports **CLEAR** (when that lane ran).

*Never substitute self-review for a failed lane. If a lane fails, report the review as incomplete.*

---

## Lane Failures

A lane that reports an unavailable tool, provider, or model is a lane failure, not a review result.

- Record which lane failed, the exact error, and what it means for coverage.
- Do not re-launch the same lane with different settings silently. Tell the user what changed and why.
- Do not let a failed lane silently shrink the report: state the missing dimension in the verdict.

---

## Report Output Format

Always synthesize findings into a structured, evidence-led report:

```markdown
# Code Review Report

**Scope:** `<target files / diff>`
**Verdict:** `APPROVE` | `REQUEST CHANGES` | `COMMENT`
**Review Lanes:** `<resolved agent names for the confirmed angles>`

## Summary
- **CRITICAL:** 0
- **HIGH:** 0
- **MEDIUM:** 0
- **LOW:** 0
- **Architectural Status:** `CLEAR` | `WATCH` | `BLOCK` | `NOT RUN`

## Findings

### [CRITICAL | HIGH | MEDIUM | LOW] Finding Title
- **Location:** `path/to/file.ts:123`
- **Issue:** Description of the problem.
- **Risk:** Consequences if left unfixed.
- **Suggested Fix:**
  ```typescript
  // Recommended correction
  ```

*(If no issues found: "No blocking issues identified.")*

## Lane Recommendations
- **<lane angle>:** `APPROVE` | `REQUEST CHANGES` | `COMMENT` | `FAILED`

## Final Recommendation
**<VERDICT>**: One-line summary justifying the decision and outlining next steps.
```
