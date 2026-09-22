---
name: ralph-spec-converter
description: "Convert spec-kit tasks.md to prd.json format for the Ralph autonomous agent system. Use when you have a tasks.md file from spec-kit and need to execute it with Ralph. Triggers on: convert this spec, turn tasks.md into ralph format, create prd.json from tasks, update prd from tasks, add tasks to prd."
---

# Ralph Spec Converter (Phase-Based)

Converts spec-kit's `tasks.md` to the ralph's `prd.json` format, grouping tasks by **Phase** to optimize for efficiency and cost.

---

## The Job

Take a `specs/[feature-branch-name]/tasks.md` file and convert it to `scripts/ralph/prd.json`. Instead of 1-to-1 mapping, group all tasks under the same Phase header into a single User Story.

---

## Output Format (prd.json)

```json
{
  "project": "[Project Name]",
  "branchName": "ralph/[feature-branch-name]",
  "description": "[Feature description]",
  "userStories": [
    {
      "id": "PHASE-01",
      "title": "[Phase Name]",
      "description": "Goal: [Goal text from Phase header]",
      "acceptanceCriteria": [
        "T001 [Task 1 Description]",
        "T002 [Task 2 Description]",
        "Typecheck passes",
        "Tests pass"
      ],
      "priority": 1,
      "passes": false,
      "notes": "",
      "dependsOn": []
    }
  ]
}
```

---

---

## CRITICAL: Schema Anti-Patterns (DO NOT USE)

The following patterns are INVALID and will cause validation errors:

### ❌ WRONG: Wrapper object

```json
{
  "prd": {
    "name": "...",
    "userStories": [...]
  }
}
```

This wraps everything in a "prd" object. **DO NOT DO THIS.** The "name" and "userStories" fields must be at the ROOT level.

### ❌ WRONG: Using "tasks" instead of "userStories"

```json
{
  "name": "...",
  "tasks": [...]
}
```

The array is called **"userStories"**, not "tasks".

### ❌ WRONG: Complex nested structures

```json
{
  "metadata": {...},
  "overview": {...},
  "migration_strategy": {
    "phases": [...]
  }
}
```

### ❌ WRONG: Using "status" instead of "passes"

```json
{
  "userStories": [{
    "id": "US-001",
    "status": "open"  // WRONG!
  }]
}
```

Use `"passes": false` for incomplete stories, `"passes": true` for completed.

---

## Story Size: Phase Validation

**Rule: Each PHASE must be completable in ONE iteration.**

While we group tasks by phase to save costs, a phase that is too large (e.g., 20+ tasks or multiple complex UI pages) will still overflow the context window.

1. **Verify Phase size:** If a phase looks too large, split it in `tasks.md` first (e.g., "Phase 2a: Core Schema", "Phase 2b: Core Logic").
2. **Right-sizing:** A phase is "right-sized" if it covers a logical group of related work (Setup, Database Schema, or a single CRUD feature).

---

## Conversion Rules

1. **Project Name**: Use the current project name or derive from folder.
2. **Branch Name**: Take the `Feature` value from `tasks.md` header and prefix with `ralph/`.
3. **User Stories**: Map one-to-one from **Phases** (## headers).
   - **ID**: Use `PHASE-NN` (e.g., `PHASE-01`, `PHASE-02`).
   - **Title**: The name of the Phase.
   - **Description**: The "*Goal: ...*" text from the phase.
   - **Priority**: Sequential order of phases.
   - **DependsOn**: Array containing the ID of the immediately preceding phase (e.g., `["PHASE-01"]` for `PHASE-02`). Empty for the first phase.
4. **Acceptance Criteria**:
   - List every **- [ ] Txxx** item from that phase as an individual criterion.
   - **Always add**: "Typecheck passes".
   - **Always add**: "Tests pass" (for backend/logic phases).
   - **Always add**: "Verify in browser using dev-browser skill" (for frontend/UI phases).

---

## Output Location

Default: `./scripts/ralph/prd.json`

---

## Example

**Input tasks.md:**
```markdown
# Tasks: Market Data
**Feature**: `003-market-data`

## Phase 1: Setup
*Goal: Initialize project.*

- [ ] T001 Install math lib
- [ ] T002 Create config file
```

**Output prd.json:**
```json
{
  "project": "CryptoLoan",
  "branchName": "ralph/003-market-data",
  "description": "Market Data Feature",
  "userStories": [
    {
      "id": "PHASE-01",
      "title": "Setup",
      "description": "Goal: Initialize project.",
      "acceptanceCriteria": [
        "T001 Install math lib",
        "T002 Create config file",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": "",
      "dependsOn": []
    }
  ]
}
```

---

## Managing State (Sync vs Switch)

Before generating the output, check if `prd.json` already exists.

### Case 1: different Feature (Context Switch)
**Condition**: The `branchName` in existing `prd.json` DOES NOT MATCH the new feature branch.

**Action**: Archive the old context before starting fresh.
1. **Create Archive**: `scripts/ralph/archive/YYYY-MM-DD-[old-feature-name]/`.
2. **Move Files**: Move existing `prd.json` and `progress.txt` to the archive folder.
3. **Reset**: Create a fresh `progress.txt` with header `# Ralph Progress Log`.
4. **Create**: Generate the new `prd.json` from scratch (Overwrite).
5. **Update Pointer**: Write the new branch name to `scripts/ralph/.last-branch` (to sync with ralph.sh).

### Case 2: Same Feature (Sync Mode)
**Condition**: The `branchName` matches.

**Action**: Merge changes into `prd.json`.
1. **Match Phases**: Pair phases from `tasks.md` to stories in `prd.json` (by **Title**).
2. **Handle Updates**:
   - **New Phase**: Append to `userStories`.
   - **Existing Phase**:
     - **Update Criteria**: Output the full updated list of criteria.
     - **Reset Status**: If criteria changed, set `passes: false`.
     - **Preserve Data**: Keep existing `id`, `priority`, and `notes`.
3. **Re-calculate Dependencies**: Ensure `dependsOn` is correct.

---

## Checklist Before Saving

- [ ] **Previous run archived** (if prd.json exists with different branchName)
- [ ] **Phase ID** used (PHASE-01, etc.)
- [ ] **All Tasks included** in acceptance criteria for each phase.
- [ ] **Context Included**: Phase Goal is in the description.
- [ ] **Standard Criteria**: Verified "Typecheck passes", "Tests pass", "Browser verification" are present where applicable.
- [ ] Each story completable in one iteration
- [ ] Stories ordered by dependency (schema → backend → UI)
- [ ] `dependsOn` correctly set for each story (if applicable)
- [ ] Standard criteria appended to every story's acceptance criteria
- [ ] UI stories have browser verification (if specified in Quality Gates)
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] No circular dependencies
- [ ] **Standard Criteria**: "Typecheck passes" included for ALL phases.