---
name: clarify-prd
description: "Use when reviewing, refining, or clarifying PRD documentation to uncover ambiguities, gaps, missing acceptance criteria, or conflicting requirements. Triggers on: clarify prd, review requirements, analyze prd, prd gap analysis, requirements elicitation."
---

# PRD Clarifier

Systematically analyze PRD documentation to identify ambiguities, gaps, and areas requiring clarification through structured, adaptive questioning with progress tracking.

---

## When to Use

- PRD has vague or undefined acceptance criteria
- Requirements feel incomplete or conflict with each other
- Before starting implementation to catch gaps early
- Stakeholders want structured requirements review

**Not for:** Generating a new PRD from scratch (use `prd-generator`), converting specs, or implementation planning.

---

## User Interaction Tool

**CRITICAL:** If an `askQuestions` or `askUserQuestions` tool is available in your environment, you **MUST** use that tool for ALL questions posed to the user. This ensures a proper visual selection UI and structured response collection.

When the tool is **not** available, fall back to formatted multiple-choice questions in your message (lettered options, one question per message).

---

## Initialization Protocol

Complete these steps **IN ORDER** before any questioning begins:

### Step 1: Locate the PRD

Identify the PRD file path. This determines where the tracking document will live.

### Step 2: Create the Tracking Document

Create a tracking file in the **same directory** as the PRD, named `{prd-filename}-clarification-session.md`:

```markdown
# PRD Clarification Session

**Source PRD**: [filename]
**Session Started**: [date/time]
**Depth Selected**: [TBD]
**Total Questions**: [TBD]
**Progress**: 0/[TBD]

---

## Session Log
```

### Step 3: Ask Depth Preference

Use the `askQuestions`/`askUserQuestions` tool (if available) to present:

| Depth     | Questions | Use Case                           |
| --------- | --------- | ---------------------------------- |
| Quick     | 5         | Surface-level critical ambiguities |
| Medium    | 10        | Balanced key requirement areas     |
| Long      | 20        | Comprehensive detailed exploration |
| Ultralong | 35        | Exhaustive deep-dive               |

Example tool payload:
```json
{
  "questions": [{
    "question": "What depth of PRD analysis would you like?",
    "header": "Analysis Depth",
    "multiSelect": false,
    "options": [
      {"label": "Quick (5 questions)", "description": "Surface-level review of critical ambiguities"},
      {"label": "Medium (10 questions)", "description": "Balanced analysis of key requirement areas"},
      {"label": "Long (20 questions)", "description": "Comprehensive review with detailed exploration"},
      {"label": "Ultralong (35 questions)", "description": "Exhaustive deep-dive leaving no stone unturned"}
    ]
  }]
}
```

### Step 4: Update Tracking Document

After depth selection, update the header with the selected depth and total count.

---

## Question Strategy

### Prioritization Framework (by impact)

1. **Critical Path Items** — Block other features, safety/security implications
2. **High-Ambiguity Areas** — Vague language, missing criteria, undefined terms
3. **Integration Points** — External systems, APIs, third-party interfaces
4. **Edge Cases** — Error handling, boundary conditions, exceptions
5. **Non-Functional Requirements** — Performance, scalability, accessibility
6. **User Journey Gaps** — Missing steps, undefined states, incomplete flows

### Adaptive Questioning

After each answer, reassess your question queue:
- **New ambiguities revealed?** → Prioritize them
- **Related areas clarified?** → Skip redundant questions
- **Contradictions found?** → Address the conflict next
- **New scope introduced?** → Flag for inclusion

### Question Quality Standards

Each question **MUST** be:
- **Specific** — Reference exact PRD sections, features, or statements
- **Actionable** — Answer directly informs a requirement update
- **Non-leading** — Don't suggest the "right" answer
- **Singular** — One clear question per turn
- **Contextual** — Acknowledge relevant previous answers

---

## Question Categories

Distribute across these areas (adjust based on PRD content and previous answers):

1. **User/Stakeholder Clarity** — Who are the users? What are their goals?
2. **Functional Requirements** — What should the system do? Success criteria?
3. **Non-Functional Requirements** — Performance, security, scalability
4. **Technical Constraints** — Platform limits, integrations, dependencies
5. **Edge Cases & Error Handling** — What happens when things go wrong?
6. **Data Requirements** — What data? Where from? Privacy concerns?
7. **Business Rules** — What logic governs behavior?
8. **Acceptance Criteria** — How do we know a requirement is met?
9. **Scope Boundaries** — What is explicitly out of scope?
10. **Dependencies & Risks** — What could block or derail this?

---

## Execution Rules

1. **CREATE TRACKING DOC FIRST** — Before asking ANY questions
2. **ALWAYS use `askQuestions`/`askUserQuestions` tool** if available; ALWAYS provide 2-4 `options` per question for visual selection UI
3. **Complete ALL questions** — Must ask the full count for selected depth
4. **Track progress** — Update the tracking file after EVERY answer
5. **Adapt continuously** — Each question reflects learnings from previous answers
6. **Stay focused** — Questions must relate to PRD content
7. **Be efficient** — Skip clearly-defined areas; target genuine ambiguities

---

## Tracking Document Format

After each Q&A pair, append to the tracking document:

```markdown
## Question [N]
**Category**: [e.g., Edge Cases, Technical Constraints]
**Ambiguity Identified**: [Brief gap description]
**Question Asked**: [Your question]
**User Response**: [Their answer]
**Requirement Clarified**: [How this resolves the ambiguity]

---
```

Always update the `**Progress**` header line (e.g., `5/20`).

---

## Session Completion

After all questions are answered:

1. **Summarize** key clarifications made
2. **List** remaining unresolved ambiguities
3. **Prioritize** unresolved items by impact
4. **Offer** to update the PRD with clarified requirements

---

## Common Mistakes

| Mistake                         | Fix                                              |
| ------------------------------- | ------------------------------------------------ |
| Asking compound questions       | One question per turn, always                    |
| Skipping tracking updates       | Update file after EVERY answer                   |
| Leading questions               | Present balanced options, no "right answer" bias |
| Forgetting `askQuestions` tool  | Check tool availability first, always prefer it  |
| Asking about well-defined areas | Focus only on genuine ambiguities and gaps       |
| Not adapting to answers         | Reassess queue after every response              |
