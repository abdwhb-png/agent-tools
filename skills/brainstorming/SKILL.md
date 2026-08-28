---
name: brainstorming
description: "Research-driven brainstorming and design for new features, components, or behavior modifications. Use this skill whenever the user wants to implement a new feature, change existing logic, design a system, compare approaches, or asks 'how should I approach X'. It mandates discovery in the actual codebase and verification of decision-critical assumptions before recommending a design."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

**Crucial Mindset:** You are a **Research-Driven Designer**, not a guesser. Your goal is to ground every hypothesis in empirical evidence from the codebase. Prevent "Narrative Lock-in" by replacing plausible theories with verified facts. Minimize false confidence by proactively researching before proposing or questioning.

**Question Tool:** "The question tool" refers to your interactive question tool (e.g., `askQuestions`, `ask_user_question`, `AskUserQuestion`).

Start by understanding the current project context, then use the question tool to ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## When to Use

Use this skill when the user wants to design a feature, component, system, workflow, or behavior change and the right implementation path still requires discovery or trade-off decisions. It is especially useful when the destination is understandable but parts of the route remain uncertain.

## When Not to Use

Do not use this skill for direct edits with an already-decided outcome, straightforward debugging with a concrete failure, simple code explanations, package installation, or implementation of an approved design. Route those requests to the narrower execution or debugging workflow.

## The Process

**Discovery Phase (Mandatory):**
Before asking questions or proposing designs, you MUST perform a discovery phase to understand the technical reality of the project.

- Use `semantic_search`, `grep_search`, and `read_file` to explore relevant modules, data structures, and existing patterns.
- Do not guess how a feature is implemented; find the code that implements it.
- **Mandatory Research Summary:** Before moving to any other phase, you must provide a "Research Summary" that includes:
  1. **Files Accessed:** A list of the specific files you read.
  2. **Key Findings:** Concrete facts found in the code (e.g., "The `LoanService` handles repayments in `app/Services/LoanService.php` using a `repay()` method").
  3. **Gaps:** What you were unable to find or what remains ambiguous.
- Only proceed to the "Understanding the idea" phase once you have presented this factual foundation. Proposing options before this summary is a failure of the skill.

If no relevant implementation exists, state that as an observed gap after searching the plausible scope. Ground greenfield discovery in the supplied requirements, nearby project conventions, domain constraints, and authoritative external sources when the decision depends on them. Do not fabricate a codebase pattern to satisfy the discovery phase.

**Set the Destination:**

After the Research Summary, state the destination in one sentence: the end state, decision, or design artifact this brainstorming effort must make possible. The destination bounds the discussion and gives every option a common evaluation target.

- Base it on verified context and the user's stated intent.
- Mark it as provisional when a missing success criterion or scope choice could materially change the design.
- If it is provisional, use the question tool to ask one precise question that sharpens it before proposing approaches.
- Do not silently choose a success metric, user priority, or scope boundary for the user.

**Understanding the idea:**

- Use the facts gathered during the Discovery Phase to inform your understanding.
- Use the question tool to ask questions one at a time to refine the idea, focusing on gaps in your research or user-specific intent.
- **Avoid Narrative Lock-in:** Do not immediately validate the user's premise. Probe for "why" and "what if" to uncover root causes/needs, but always cross-reference these with codebase reality.
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Navigate uncertainty:**

Keep a lightweight working state throughout the conversation:

- **Decisions and known facts:** Verified evidence and explicit choices that current reasoning may rely on.
- **Not yet specified:** Relevant uncertainty that should remain visible rather than receive a plausible default.
- **Out of scope:** A path or concern excluded by the destination, with a one-line reason.

An uncertainty is ready for active resolution when its deciding question can be stated precisely now, even if the answer is not yet known. If the question is still vague, sharpen it before generating solutions.

Route each precise question to the narrowest reliable source of truth:

- **User intent or trade-off:** Use the question tool; the user must speak for their own priorities.
- **Empirical behavior:** Inspect the relevant code, tests, runtime, API, measurement, or authoritative documentation.
- **Experiential behavior:** When dialogue and existing evidence cannot settle how something should look or feel, propose a minimal reversible prototype or spike and define what observation would decide the question.
- **Future contingency:** Keep it in **Not yet specified** with its trigger condition; do not treat it as a present fact.

After resolving a question, update the working state and address the next uncertainty that most directly blocks the destination. Keep this inside the conversation and design artifact; do not create issue maps, ticket graphs, branches, or multi-session orchestration.

**Exploring approaches:**

- Propose 2-3 materially different approaches only after the central deciding question and destination are sharp enough to compare them.
- For each approach, identify assumptions that could change the recommendation and conditions that would make the approach fail.

Classify each decision-critical assumption:

- **Empirical:** Can be checked against code, tests, runtime behavior, measurements, APIs, or authoritative documentation.
- **Design choice:** Depends on an explicit trade-off or user preference rather than factual verification.
- **Future contingency:** Cannot be resolved until a stated future condition occurs.

Do not stop after listing uncertainty. Investigate empirical assumptions before recommending an approach:

1. Use the narrowest reliable check available: inspect the real code path, run focused tests or deterministic commands, query the relevant API, measure behavior, or consult official documentation.
2. Keep the observed result separate from your interpretation of what it means for each approach.
3. Treat failed searches, stale sources, synthesized summaries, and unsupported opinions as insufficient proof.
4. Treat user answers as preferences or approvals, not evidence of technical behavior.
5. Keep contradictory evidence visible and explain how it changes confidence.

Execution or analysis without an identifiable source is a derived conclusion, not direct evidence. Verify its underlying input before relying on it. Absence of evidence is not evidence of absence unless the searched scope is demonstrably complete.

For each important empirical assumption, state whether it is:

- **Verified:** Relevant evidence supports it.
- **Falsified:** Relevant evidence contradicts it.
- **Unresolved:** Evidence is missing, conflicting, stale, or insufficient.

Do not turn an unresolved critical assumption into a confident recommendation. Explain its impact and mitigation, then ask the user whether to investigate further, choose another approach, or knowingly accept the risk.

For high-impact decisions, contradictory evidence, or accepted unresolved risk, seek an independent critical review when another agent or reviewer is available. Ask it to inspect the same primary evidence and challenge the recommendation. Reviewer prose is not a substitute for the underlying code, test, measurement, API response, or authoritative source.

Before recommending an option, summarize the observed evidence, verified/falsified/unresolved assumptions, effect on trade-offs, conditions for failure, and residual risks. Compare each path by its fit to the destination, complexity, reversibility, and failure conditions.

Present options conversationally with your recommendation and reasoning. Lead with your recommended option, but remain open to being wrong.

When converging, record:

- **Selected path:** The decision and why it best fits the destination.
- **Ruled-out paths:** One line per rejected option explaining why it lost.
- **Remaining uncertainties:** Unresolved items, their impact, and the next reliable way to settle them.

Do not silently revive a ruled-out path later. Reconsider it only when new evidence, a changed destination, or an explicit user decision invalidates the earlier reason.

**Presenting the design:**

- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense
- Keep brainstorming plan-only. Prototypes may answer a design question, but do not turn the session into production implementation.

## After the Design

**Documentation:**

- Write the validated design to `docs/brainstorming-decisions/YYYY-MM-DD-<topic>.md` or based on project convention
- Include the destination, research evidence, selected path, ruled-out paths, not-yet-specified items, architecture, components, data flow, error handling, testing, and implementation handoff boundary.
- Follow project conventions and documentation guidelines for writing and formatting
- Commit the design document to git

**Implementation (if continuing):**

- Ask: "Ready to set up for implementation?"
- Follow project conventions and workflows for creating implementation plans

## Key Principles

- **Hypothesis Generator** - You generate possibilities, you do not dictate truth.
- **Minimize False Confidence** - Explicitly state what is an assumption versus a known fact.
- **Name the Destination** - Keep exploration anchored to the end state it must enable.
- **Preserve the Unknown** - Visible uncertainty is safer than an invented default.
- **Sharpen Before Solving** - Resolve a question only after it can be stated precisely.
- **Use the Right Source of Truth** - Route preference, evidence, experience, and future contingencies differently.
- **Verify Before Recommending** - Investigate decision-critical empirical assumptions instead of merely listing uncertainties.
- **Separate Evidence from Interpretation** - Report what was observed before explaining what it means for the design.
- **Record Convergence** - Preserve selected, rejected, and unresolved paths so the discussion does not drift backward.
- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense

## Mandatory Use

Always ask user questions through your harness's interactive question tool (`askQuestions`, `ask_user_question`, `AskUserQuestion`, etc.) rather than plain text.
