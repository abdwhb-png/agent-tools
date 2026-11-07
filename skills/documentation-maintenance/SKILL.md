---
name: documentation-maintenance
description: Review proposed additions to repository documentation before creating a file, section, or status entry, including at the end of coding work. Update the existing owner in place when information changes. Audit and consolidate existing documentation, resolve ownership and drift, and verify links and generated outputs while preserving requirements and evidence.
---

# Documentation Maintenance

Make current documentation easy to find, trust, and maintain. Reduce competing sources of truth without losing requirements, rationale, evidence, or unfinished work. File count and word count are diagnostic signals, not success criteria.

## When to Use

Use before adding persistent repository documentation or appending a status entry, even when the primary task is implementation. Also use for audits, consolidation, ownership clarification, and stale generated documentation.

## When Not to Use

Use the relevant domain workflow to design or implement behavior and to draft the chosen artifact. Apply the check below to a proposed addition. Use the full workflow only when the task requires an audit, consolidation, or broader maintenance.

## Decide What Belongs in Documentation

Check the repository's documentation policy and the affected source before writing. Identify what a future reader needs and where they would look for it. A quick check of the likely owner and its references is enough for a routine change.

- **No durable change.** Keep routine implementation details, repeated test results, and task narration in the task report or existing execution record. Record verification when it changes the known delivery status, qualifies a new environment, or exposes a limitation that affects a decision.
- **An existing owner covers the information.** Revise the relevant passage in place. Replace superseded current guidance and link to durable evidence where needed. Preserve history in documents that explicitly own historical records.
- **A separate record is justified.** Create it when requested, required by repository policy, or needed for a distinct durable responsibility or evidence that must remain independently retrievable. Identify its owner and audience and link it from the existing entry point where appropriate.

## Inputs and Authority

Infer the target, requested outcome, and authorization from the user's request and session. Ask only for missing decisions that block safe progress. Audit and planning requests remain read-only. An authorized cleanup permits scoped edits without repeated approval.

Follow applicable repository instructions. Local conventions belong in their existing owner, not in this skill. Work directly by default. Do not delegate, commit, publish, install dependencies, or change application behavior merely to maintain documentation.

## 1. Establish the Current State

A cleanup needs an accurate baseline so existing work and current requirements survive.

Read repository instructions and the documentation authority policy first. Inspect working-tree changes before editing. Locate authored documents, generated outputs, source owners, and existing checks with scoped file searches. Exclude vendor material and raw evidence from prose cleanup.

For routine maintenance, inspect affected owners and their inbound references. For consolidation, inventory the relevant documentation surface before reading historical material in depth. Read history only when needed to establish rationale, supersession, or requirement preservation.

Proceed when the affected files, existing changes, source owners, and authorized scope are known.

## 2. Establish Ownership and Conflicts

Readers need to distinguish current obligations from context, proposals, historical decisions, evidence, and generated material.

Classify documents using the repository's actual policy. Never infer authority from filenames, age, or an earlier acceptance alone. Do not impose a fixed number of reference documents, directory layout, or word limit.

Identify duplicate rules, conflicting requirements, obsolete instructions, stale delivery claims, and generated files without a clear owner. Present the findings in conversation rather than creating another index or report. If authority is undefined, propose the smallest responsibility map in the existing instruction surface.

For conflicting current requirements, identify the exact disagreement and obtain a decision before changing that requirement. Continue unaffected work. Do not silently choose the version that matches the implementation.

## 3. Prepare a Lossless Change Set

Shorter documents help only if their responsibilities remain complete.

For each affected document or section, choose whether to preserve, update, merge, move, mark historical, or retire it. Explain the destination of every displaced requirement and unresolved task. Keep this mapping in the working plan or conversation unless a persistent artifact is requested.

Keep each maintained rule in one authoritative location and link to it elsewhere. Shorten long documents by removing duplication, obsolete narrative, and incidental implementation listings before considering a split. Preserve necessary contracts, exceptions, and acceptance criteria.

Before deletion or replacement, verify that the latest content is recoverable from an identified Git revision or another agreed archive. Check the actual stored content. An older commit does not preserve uncommitted edits or untracked evidence. A checkpoint commit requires explicit authorization.

Proceed when requirements have destinations, removals are authorized and recoverable, and unresolved decisions remain visible.

## 4. Apply the Authorized Changes

Update the owning references, then repair affected links, anchors, navigation, and tooling references. Use the repository's language and formatting conventions. Keep documents understandable without conversation aliases or session history.

Keep requirements, verified delivery, and remaining work distinct. Update the delivery record from observed evidence rather than treating an approved plan as completed work. Before retiring a plan, transfer outstanding work to its established owner.

Preserve dated outcomes and raw evidence. Where policy allows, label superseded prose and link to its replacement without rewriting past results. Identify local-only artifacts accurately.

## 5. Verify and Prevent Recurrence

Mechanical checks catch broken structure; semantic review protects meaning. Both are needed.

Run the smallest applicable documentation checks: paths, links, heading anchors, required structure, and whitespace. Search for retired locations and references affected by renames. Review requirement preservation, ownership conflicts, and delivery claims separately.

For generated documentation, inspect its generator and installed tool instructions. Regenerate through the owner. Verify actual freshness with the native checker where available, and confirm that a second unchanged generation preserves output. Do not disguise stale content by changing a date or editing generated files directly.

Reuse existing checks. If a repository has explicit documentation rules that can be checked mechanically or recurring structural errors, recommend a small project-level `docs:check` command or its equivalent. Read policy from its existing owner. Fail on objective violations such as broken local links, missing heading anchors, or paths forbidden by the repository policy. Keep size thresholds advisory.

When authorized to add or change a check, reproduce the violation first, then verify that the check rejects the violation and accepts a valid example. Integrate it with the repository's existing validation command. Documentation edits alone do not require application tests or a build.

Finish when applicable checks pass, the semantic review is complete, unrelated work is preserved, and remaining limitations are explicit.

## Handoff

Report the important consolidations or removals, where current requirements live, exact checks and results, and unresolved work. Distinguish executable validation from manual review. Do not create a separate report unless requested or required by repository policy.
