---
name: documentation-maintenance
description: >
  Audit, consolidate, and maintain repository documentation when documents
  proliferate, authority becomes unclear, requirements drift, or generated
  documentation becomes stale. Preserve requirements and evidence, clarify
  ownership, remove redundant material, and verify links and generated outputs
  using the repository's existing policy and tools.
---

# Documentation Maintenance

Make current documentation easy to find, trust, and maintain. Reduce competing sources of truth without losing requirements, rationale, evidence, or unfinished work. File count and word count are diagnostic signals, not success criteria.

## When to Use

Use for documentation audits, consolidation, cleanup, ownership clarification, maintenance after an accepted change, or investigation of stale generated documentation.

## When Not to Use

Use the relevant domain workflow for product design, implementation, or a single new decision record. This skill does not authorize product changes, redefine repository policy, or require a full documentation audit for a small correction.

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

Use existing documents first. Create a new document only for a distinct, durable responsibility allowed by repository policy. Do not create extra plans, reports, ADRs, or indexes merely to narrate the cleanup.

## 5. Verify and Prevent Recurrence

Mechanical checks catch broken structure; semantic review protects meaning. Both are needed.

Run the smallest applicable documentation checks: paths, links, heading anchors, required structure, and whitespace. Search for retired locations and references affected by renames. Review requirement preservation, ownership conflicts, and delivery claims separately.

For generated documentation, inspect its generator and installed tool instructions. Regenerate through the owner. Verify actual freshness with the native checker where available, and confirm that a second unchanged generation preserves output. Do not disguise stale content by changing a date or editing generated files directly.

Reuse existing guardrails. When authorized tooling changes are needed, reproduce the observed defect first and verify its correction. Keep policy in one maintained source. Size thresholds should warn, never justify dropping requirements. Documentation edits alone do not require application tests or a build.

Finish when applicable checks pass, the semantic review is complete, unrelated work is preserved, and remaining limitations are explicit.

## Handoff

Report the important consolidations or removals, where current requirements live, exact checks and results, and unresolved work. Distinguish executable validation from manual review. Do not create a separate report unless requested or required by repository policy.
