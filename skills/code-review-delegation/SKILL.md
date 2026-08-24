---
name: code-review-delegation
description: Run a comprehensive code review on a diff, branch, pull request, or modified files, delegating review lanes to parallel subagents when the harness supports it. Use whenever the user asks for a code review, PR review, diff inspection, quality or security assessment, or merge-readiness evaluation.
---

# Code Review Delegation

Ensure code changes are thoroughly examined for spec compliance, security vulnerabilities, regression risks, and architectural integrity before merge. Independent review catches defects early and prevents regressions from reaching production.

## When to Use

- The user asks for a code review, PR review, diff check, or quality/security assessment.
- A feature, bug fix, or refactor is completed and ready for merge verification.
- Validating changes across multiple files or evaluating complex system interactions.

## When Not to Use

- **Implementation or editing**: Use an implementation workflow or worker subagent instead.
- **Pre-implementation planning**: Use `plan-feature` or `brainstorming` instead.
- **Trivial standalone reads**: Inspect directly with read/grep tools for single-line questions.

---

## Inputs & Scoping

Gather the exact review boundaries before launching reviewers to keep analysis grounded and prevent scope drift.

1. **Inspect repository state**:
   ```sh
   git status --short
   git diff --stat
   git diff -- <scope>
   ```
2. **Clarify review scope**: Identify modified files, target branch, and relevant specifications or acceptance criteria.
3. **Deep discovery (optional)**: For large diffs or multi-repo changes, run a `scout` subagent first to map data flow, touched boundaries, and key risk surfaces.

---

> **Harness-specific delegation:** this skill delegates review lanes to parallel subagents. The generic flow below is harness-agnostic. If you are running in:
> - the **pi** harness (earendil-works/pi-coding-agent): read [references/pi-harness.md](references/pi-harness.md) before delegating — it defines the `subagent` / `workflowScript` orchestration pattern and pi reviewer agents.
> - **Codex** (OpenAI Codex CLI/IDE/desktop): read [references/codex-harness.md](references/codex-harness.md) before delegating — it covers spawn prompts, custom reviewer agents (TOML), model/reasoning choices, and sandbox controls.
>
> On other platforms, delegate to whatever parallel subagent mechanism exists, or run the lanes sequentially in-context if none does.

### Reviewer Selection Decision Matrix

`code-reviewer` is always launched as the primary baseline lane. Select specialized companion reviewers based on the nature of the changes identified during scoping or scout discovery:

| Reviewer | Trigger Conditions & Scope | Key Focus Areas |
|---|---|---|
| **`code-reviewer`** *(Always)* | Default lane for every review | Spec compliance, logic errors, edge cases, error handling, tests |
| **`security-reviewer`** | Auth, tokens, crypto, user input, queries, file I/O, network endpoints, dependencies | OWASP Top 10, injection, permission escalation, secrets, unsanitized inputs |
| **`architect`** | Major refactoring, new module seams, dependency direction changes, new subsystems | Boundary integrity, interface coupling, long-term maintenance, devil's advocate |
| **`api-reviewer`** | Changes to public functions, exported types, REST/RPC endpoints, CLI flags, configs | Backward compatibility, breaking changes, schema consistency, API ergonomics |
| **`performance-reviewer`** | High-frequency loops, caching, database indexing, concurrency, large payload parsing | CPU/memory bottlenecks, resource leaks, algorithmic complexity ($O(N)$ regressions) |
| **`style-reviewer`** | Large formatting overhauls, convention migrations, doc updates | Codebase idioms, naming rules, documentation completeness |

### Orchestration Pattern

Delegate review lanes to parallel subagents with clean context and read-only tool access. Run `code-reviewer` plus the companion reviewers chosen via the decision matrix concurrently; collect all results before synthesizing the verdict. The exact spawn mechanism is harness-specific (see the harness references above).

**Success criteria**: All selected lanes launched in parallel, each with a read-only mandate and the scout context attached.

---

## Finding Taxonomy & Severity Rating

Classify every finding into one of four objective severity tiers:

| Severity | Definition | Merge Impact |
|---|---|---|
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
   - `architect` status is **BLOCK**.
   - A required independent review lane failed or was unavailable.
2. **COMMENT**:
   - Only **MEDIUM** or **LOW** findings exist.
   - `architect` status is **WATCH** with no blocking findings.
3. **APPROVE**:
   - All review lanes completed with verified evidence.
   - No CRITICAL or HIGH issues.
   - `architect` status is `CLEAR` (when architect lane is run).

*Never substitute self-review for a failed delegation lane. If a lane fails, report the review as incomplete.*

---

## Report Output Format

Always synthesize findings into a structured, evidence-led report:

```markdown
# Code Review Report

**Scope:** `<target files / diff>`  
**Verdict:** `APPROVE` | `REQUEST CHANGES` | `COMMENT`  
**Review Lanes:** `code-reviewer` (plus any active specialized reviewers)

## Summary
- **CRITICAL:** 0
- **HIGH:** 0
- **MEDIUM:** 0
- **LOW:** 0
- **Architectural Status:** `CLEAR` | `WATCH` | `BLOCK` (if architect lane ran)

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
- **code-reviewer:** `APPROVE` | `REQUEST CHANGES` | `COMMENT`
- **architect (if run):** `CLEAR` | `WATCH` | `BLOCK`

## Final Recommendation
**<VERDICT>**: One-line summary justifying the decision and outlining next steps.
```