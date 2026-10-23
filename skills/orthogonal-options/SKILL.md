---
name: orthogonal-options
description: Generate divergent, architecturally orthogonal options and trade-offs for technical decisions. Breaks LLM typicality bias, mode collapse, and token fixation using morphological analysis (Zwicky Box), implicit axiom inversion, and verbalized sampling. Use when deciding between approaches, choosing architecture patterns, or whenever options appear too similar or conventional.
---

# Orthogonal Options

## The Problem

When asked to provide implementation options, language models suffer from mode collapse and typicality bias induced by preference alignment, alongside autoregressive token fixation where early generated tokens anchor subsequent thoughts. The resulting proposals cluster tightly around predictable industry averages—frequently presenting brand or syntax swaps (such as choosing between three client-side state libraries) as distinct options while leaving core architectural assumptions unexamined.

## The Result

A structured spectrum of 3 to 5 architecturally orthogonal options generated through morphological decomposition and distribution sampling, each bound to distinct technical coordinates, explicit failure conditions, and negated axioms, produced before committing to an implementation path.

## Why Orthogonality Matters

Superficial variations within the same architectural quadrant hide real trade-offs, preserve unexamined complexity, and produce false consensus. Genuine divergence shifts fundamental boundaries—such as execution timing, state authority, lifecycle coupling, or elimination of unnecessary indirection—ensuring the evaluation covers the true possibility space rather than the median industry habit.

## When to Use

Use this skill when:

- Evaluating architectural approaches, system boundaries, state topologies, or implementation strategies for a new feature, component, or refactor.
- Proposed options feel homogeneous, predictable, or like brand substitutions of the same underlying pattern.
- High-stakes or hard-to-reverse decisions require stress-testing assumptions against unconventional or contrarian designs.
- Running option generation where the technical seam or pattern must explore genuinely distinct solutions.

## When Not to Use

Do not use this skill when:

- The architectural seam, pattern, and design are already decided and the task is direct execution or code editing.
- Diagnosing a concrete bug with a reproducible stack trace or failing test (use systematic debugging instead).
- Performing routine mechanical refactoring where existing tests and module contracts strictly dictate the implementation.
- Installing or updating packages without an architectural design choice.

## Procedure

### 1. Surface Implicit Axioms

Extract the core technical objective without solution baggage. State 3 implicit axioms taken for granted in the problem framing (e.g., "State must persist in a relational database", "The client initiates all data queries", "This requires a dedicated service layer").

### 2. Construct the Morphological Matrix (Zwicky Box)

Identify 3 to 4 orthogonal technical dimensions governing the problem space, each with 2 to 4 distinct values:

- **Execution Timing**: Build-time | Synchronous runtime | Asynchronous background | Deferred / Lazy
- **State Topology & Authority**: Local client ephemeral | Central authoritative DB | Distributed / Event-sourced | Zero-state derived
- **Coordination & Coupling**: Direct in-process | Brokered event / message | Inverted dependency injection | Shared immutable contract
- **Boundary & Abstraction Depth**: Embedded in existing deep module | Dedicated standalone layer | Completely eliminated / YAGNI

### 3. Generate Candidate Theses (Two-Stage Skeletization Gate)

Generate candidate options across the probability distribution simultaneously. Write only a one-line title and a one-sentence mechanical thesis for each option before generating any prose, pros/cons, or code:

- **Option A — Idiomatic Baseline ($p \approx 0.60$)**: Direct path using existing codebase patterns, framework primitives, and lowest friction conventions.
- **Option B — Structural Boundary Shift ($p \approx 0.25$)**: Shifts responsibility across boundaries (e.g., push vs. pull, compile-time vs. runtime, server-orchestrated vs. client-driven).
- **Option C — Axiom Inversion ($p \approx 0.10$)**: Explicitly negates one of the surfaced implicit axioms ("What if axiom X is completely false?").
- **Option D — Asymmetric Constraint / Radical Deletion ($p < 0.05$)**: Solves the problem under an extreme constraint (e.g., zero new dependencies, zero runtime overhead, or eliminating the feature/layer entirely).

### 4. Enforce the Orthogonality Gate

Map all candidate options against the Morphological Matrix. If any two candidates occupy the same coordinate quadrant (e.g., both use synchronous runtime + central database), discard or mutate one candidate before proceeding. Do not elaborate overlapping candidates.

### 5. Elaborate Options Using the Uniform Schema

Expand each surviving option using this strict schema:

- **Causal Mechanism**: Concrete data flow, execution sequence, and module boundary (no analogies or hand-waving).
- **Matrix Coordinates**: The exact values occupied on the morphological axes.
- **Negated Axiom / Contrarian Lever**: The specific assumption this option rejects or inverts.
- **Optimal Conditions**: The specific operational reality or scale where this option is superior.
- **Failure Mode & Kill Condition**: The exact technical failure condition, volume threshold, or edge case that breaks this option.
- **Complexity & Reversibility**: Structural blast radius, new concepts introduced, and cost to revert or migrate away.

### 6. Contrast and Decision Trade-offs

Summarize the options in a comparative decision matrix. Evaluate fit against the objective, blast radius, maintenance burden, and reversibility. Do not force an artificial compromise; let each option stand on its genuine structural merits.

## Output Schema

Format the completed brief using this structure:

```markdown
# Problem Framing & Implicit Axioms

**Objective**: [One sentence describing the technical end-state required]

**Implicit Axioms**:

1. [Unstated default assumption 1]
2. [Unstated default assumption 2]
3. [Unstated default assumption 3]

# Morphological Matrix (Zwicky Box)

| Dimension        | Value 1               | Value 2            | Value 3            |
| ---------------- | --------------------- | ------------------ | ------------------ |
| Execution Timing | Synchronous           | Asynchronous       | Build-time         |
| State Authority  | Central DB            | Client Ephemeral   | Zero-State Derived |
| Boundary Depth   | Deep Module Extension | Standalone Service | Eliminated (YAGNI) |

# Candidate Theses (Skeletization)

- **Option A (Baseline, p ≈ 0.60)**: [Title] — [One-sentence mechanical thesis]
- **Option B (Boundary Shift, p ≈ 0.25)**: [Title] — [One-sentence mechanical thesis]
- **Option C (Axiom Inversion, p ≈ 0.10)**: [Title] — [One-sentence mechanical thesis]
- **Option D (Asymmetric Constraint / Deletion, p < 0.05)**: [Title] — [One-sentence mechanical thesis]

---

# Detailed Orthogonal Options

## Option A: [Title]

- **Causal Mechanism**: [Data flow, execution path, component interactions]
- **Matrix Coordinates**: [Axis 1 Value] × [Axis 2 Value] × [Axis 3 Value]
- **Optimal Conditions**: [When this is the best technical choice]
- **Failure Mode & Kill Condition**: [Exact condition that invalidates this option]
- **Complexity & Reversibility**: [Blast radius, new abstractions, migration cost]

## Option B: [Title]

...

---

# Comparison Matrix

| Option                       | Primary Strength | Critical Failure Mode | Reversibility | Maintenance Overhead |
| ---------------------------- | ---------------- | --------------------- | ------------- | -------------------- |
| **A: Baseline**              | ...              | ...                   | High / Low    | Minimal              |
| **B: Boundary Shift**        | ...              | ...                   | ...           | ...                  |
| **C: Axiom Inversion**       | ...              | ...                   | ...           | ...                  |
| **D: Deletion / Constraint** | ...              | ...                   | ...           | ...                  |
```

## Anti-Patterns

1. **Brand / Tool Substitution**: Swapping library names (e.g., Zustand vs. Redux vs. Recoil) while maintaining identical state ownership and execution timing.
2. **Token Anchoring**: Fully drafting Option A before formulating Options B, C, and D, allowing Option A's tokens to bias the remaining options.
3. **Strawman Long-Tail Options**: Proposing absurd or unworkable parodies for Option C or D rather than legitimate, rigorous contrarian paths.
4. **Silent Axiom Retention**: Retaining all unstated constraints and merely changing syntax or wrapper layers.
