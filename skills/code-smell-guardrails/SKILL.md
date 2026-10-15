---
name: code-smell-guardrails
description: Audit code for design smells, arbitrate complexity trade-offs, and plan or apply behavior-preserving refactors.
disable-model-invocation: true
user-invocable: true
---

# Code Smell Guardrails

Audit code against design smells to reduce overall system complexity, preserve information hiding, and localize design knowledge. Treat smells as diagnostic signals rather than automatic refactoring obligations.

## When to Use

- When explicitly invoked by the user (`@code-smell-guardrails`) to audit a file, function, module, or pull request diff.
- When evaluating whether a proposed refactoring genuinely reduces complexity or merely relocates it.
- When reviewing newly implemented code to ensure it adheres to deep module design and clean boundary separation before final acceptance.

## When Not to Use

- Do not use for automated linting, typechecking, or syntax formatting; rely on language tooling for mechanical rules.
- Do not use for greenfield architectural ideation before any code exists; use `codebase-design`.
- Do not use for isolated bug diagnostics where code structure is not in question; use `systematic-debugging` or `tdd`.
- Do not use to justify speculative, out-of-scope refactoring across untouched modules during a targeted feature change.

## Refactoring and Audit Workflow

Follow this 4-phase sequence whenever this skill is invoked:

### Phase 1: Scope and Characterization

1. Identify the target module, component, or diff specified by the user.
2. Confirm the primary domain responsibility and interface contract of the target code.
3. Check existing test coverage. If modifying production code, ensure characterization tests exist to catch unintended behavioral regressions before changing structure.

### Phase 2: Smell Detection and Categorization

Inspect the target against the five guardrail domains below. Record each observed smell with its concrete location, the mechanism causing friction (such as shared state, leaky details, or duplicate logic), and the affected caller or maintainer path.

### Phase 3: Complexity Arbitration

Evaluate each detected smell against the five governing questions:

1. Does addressing this smell remove or localize knowledge, or does it scatter it across more files?
2. Does addressing this smell reduce the total concepts a developer must hold in memory?
3. Does addressing this smell make future modifications more localized?
4. Does the proposed change hide complexity behind an interface substantially simpler than its implementation?
5. Does it avoid introducing speculative abstractions whose value is purely hypothetical?

If a proposed refactoring fails any of these checks, retain the existing code.

### Phase 4: Verification and Execution

1. Implement the minimal change required to resolve the validated smell.
2. Run characterization and unit tests to verify behavior remains unchanged.
3. Check that the public boundary remains deep and that callers were not forced to adapt to internal implementation details.

## Guardrail Domains and Decision Conditions

### 1. Structural Complexity

- **Long Method**: Function length obscures intent or control flow. Extract only when the extracted unit represents a coherent abstraction that is independently understandable and testable. Do not extract one-line helpers that only fragment control flow.
- **Large Class / God Object**: A class aggregates multiple independent domain responsibilities and state lifecycles. Split along independent cohesive boundaries; do not split if the fields and methods frequently mutate shared state together.
- **Over-Fragmentation**: Cohesive logic is fractured across dozens of tiny files or micro-functions, forcing readers to jump repeatedly across boundaries to understand a single operation. Inline fragmented helpers when they only serve a single caller.
- **Data Clumps**: Multiple parameters repeatedly travel together across function boundaries representing a shared domain concept. Group into a dedicated value object or struct only when the group represents a meaningful invariant.

### 2. Abstraction Depth and Indirection

- **Shallow Module**: An interface exposes almost as much complexity as its underlying implementation. Redesign to hide mechanics behind a simpler API, or inline the layer entirely.
- **Middle Man & Pass-Through Methods**: A class or method merely delegates calls to another object without translating concepts, adding behavior, or enforcing a boundary. Eliminate the wrapper and expose or call the underlying collaborator directly.
- **Speculative Generality & Premature Extensibility**: Code includes generic interfaces, plugin registries, or factory factories for single implementations or hypothetical future needs. Remove indirection until multiple real usages exist.
- **Premature Configuration**: Configuration flags or environment variables are introduced for logic that has only one valid operating mode. Hardcode stable invariants locally.
- **Lazy Class & Dead Code**: Classes that no longer perform work, or unreachable code retained for history. Delete dead paths and inline dormant abstractions; rely on version control for history.

### 3. Coupling and Knowledge Boundaries

- **Information Leakage**: Internal representation details, data formats, or storage assumptions leak into callers. Enforce strict encapsulation so that changing internal format does not require edits in consumers.
- **Leaky Abstraction**: Callers must understand implementation quirks or call ordering to use an interface correctly. Make interfaces robust against incorrect call sequences.
- **Shotgun Surgery**: A single conceptual change forces coordinated edits across many unrelated files. Consolidate the distributed knowledge into a single authoritative module.
- **Divergent Change**: A single module must change frequently for completely unrelated business reasons. Separate the module along the distinct axes of change.
- **Inappropriate Intimacy & Message Chains**: Module A directly reaches deep into Module B's internal object graphs (`a.getB().getC().doThing()`). Move the operation into the collaborator that owns the data.
- **Feature Envy**: A function queries another object repeatedly to perform calculations that belong on that object. Relocate the method closer to the data it operates on.
- **Parallel Inheritance**: Adding a subclass in one hierarchy requires matching subclasses in another hierarchy. Consolidate the hierarchies or replace inheritance with composition.

### 4. Control Flow and Invariants

- **Conditional Proliferation**: The same `switch` or `if/else` check on a type/mode is duplicated across multiple functions. Centralize the branch in one place or use polymorphism if variations are distinct.
- **Temporary Field & Conditional State**: Fields in an object are valid only during specific phases or calls. Encapsulate multi-phase state into explicit state machines or pass temporary context explicitly via parameters.
- **Flag Argument Abuse**: Boolean flags drastically alter a function's execution path, turning one function into two distinct procedures. Split into separate, explicitly named functions.
- **Primitive Obsession**: Raw primitives represent domain concepts with specific validation rules (e.g., email strings, monetary amounts). Wrap in a domain type when validation or invariants are scattered across callers.
- **Unnecessary Custom Implementation**: Writing custom utilities for algorithms, data manipulation, or networking already solved by the language or established dependencies. Use standard libraries.

### 5. Communication and Scope Boundaries

- **Narrating Comments**: Comments that rephrase obvious code syntax. Replace with clear identifier naming and self-explanatory code structure. Reserve comments for non-obvious intent, constraints, or rationale.
- **Stale or Misleading Comments**: Comments describing outdated behavior. Update or delete immediately upon modifying implementation.
- **Generic Naming**: Identifiers using vague suffixes like `Manager`, `Helper`, `Processor`, `Handler`, or `Utils`. Rename to reflect the specific domain concept or mechanism owned.
- **Scope Creep**: Modifying surrounding code, formatting, or unrelated architecture during a focused task. Confine edits strictly to the requested boundary.

## Contrastive Examples

### Example 1: Long Method vs Over-Fragmentation

- **Bad extraction (Over-Fragmentation)**: A 30-line cohesive data parser is split into six 5-line functions (`parseHeaderPartOne`, `parseHeaderPartTwo`, `validateField`). Readers must navigate six locations to understand a single linear sequence.
- **Good balance**: Keep the linear flow together in one readable method. Extract only if an inner block has an independent lifecycle, distinct error handling, or clear reuse (e.g., extracting `verifySignature(bytes)` from a protocol parser).

### Example 2: Middle Man vs Deep Module

- **Bad abstraction (Middle Man)**: `UserService` has a method `getUser(id)` that does nothing except return `userRepository.findById(id)`. The service layer adds ceremony without hiding complexity.
- **Good abstraction (Deep Module)**: `UserService` encapsulates credentials verification, session token generation, rate limiting, and audit logging behind `login(credentials)`. Callers interact with a single simple method while substantial complexity is encapsulated.

### Example 3: Primitive Obsession vs Speculative Generality

- **Bad generalization**: Creating a generic `ValueWrapper<T, V extends Validator<T>>` for a simple phone number string used in one place.
- **Good domain type**: Introducing a `PhoneNumber` value object that parses, validates E.164 formatting, and normalizes country codes, replacing duplicated regex validation scattered across three controllers.
