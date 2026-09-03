---
name: tdd
description: Drive production features, bug fixes, behavior changes, and refactors with focused executable coverage. For behavior changes, use a verified RED -> GREEN -> REFACTOR loop; for behavior-preserving refactors, establish mutation-sensitive characterization tests and keep them green.
---

# Test-Driven Development

TDD turns a requested behavior into an executable contract before implementation biases the design. The result is a focused test that can catch a realistic regression, not a test that merely reflects the current implementation.

## When to Use

Use this skill for production features, bug fixes, behavior changes, and refactors whose safety depends on preserved observable behavior.

Use it before changing production code. For a feature, behavior change, or existing defect, reproduce the requested behavior in a failing test before implementation or repair. For a behavior-preserving refactor, establish or improve passing characterization coverage before changing the implementation.

## When Not to Use

Do not manufacture a failing test for prose-only documentation changes. For configuration, build tooling, generated code, or throwaway prototypes, use the smallest feasible executable before-and-after validation and follow any repository-specific policy.

Do not use this skill solely to explain a testing concept, select a test framework, or review tests already written. Use the relevant framework or review skill instead.

## Select the Test Surface

A test should cross the owning module's existing interface and observe behavior a caller relies on. This preserves locality: a change to implementation details should not break a correct test.

Start at the narrowest existing module interface that can express the requested behavior. Do not add a public method, test-only production code, or an adapter only to make testing convenient.

When the appropriate interface or seam is materially ambiguous, consult `codebase-design` before changing the design. Use its vocabulary: a module's interface is the test surface and a seam is where that interface lives. Ask the user only when the plausible seams imply different observable contracts, user workflows, or scope.

Read [references/tests.md](references/tests.md) when choosing a test surface or judging whether an assertion is behavior-focused.

## RED: Specify One Behavior

Write one minimal test that describes one behavior at the selected interface. Give it a name that states the observable outcome and the condition that produces it.

Before writing the body, name the realistic production change that should make it fail. If the answer is only "the source text changed" or "the implementation was refactored", redesign the test around a caller-visible outcome.

Derive expected values independently with known literals, worked examples, or a trusted specification. Do not reuse the code under test or its helpers to calculate the expectation.

Run the focused test. It must fail because the behavior is missing or incorrect, not because of a typo, broken fixture, import failure, or invalid test setup. Fix the test setup and rerun it until the intended failure is observed.

## GREEN: Make the Behavior Work

Implement only the smallest production change that satisfies the failing behavior. Do not add speculative options, unrelated cleanup, or future behavior.

Run the same focused test and confirm it passes. Then run the relevant nearby test suite. If either fails, repair the production behavior or the test setup; do not weaken a correct assertion merely to make it pass.

## REFACTOR: Improve Without Changing Behavior

After the relevant tests are green, improve duplication, names, or internal structure when it makes the design clearer. Preserve the selected interface and behavior unless the task explicitly changes the contract.

Rerun the focused test and relevant suite after each refactor. Start the next behavior only after they remain green.

For a pure refactor with no requested behavior change, do not invent a RED failure. First establish passing characterization tests at the selected interface, confirm they would detect realistic mutations of the preserved behavior, then perform the refactor while those tests stay green.

## Test Quality Gates

A useful test catches a specific bug rather than restating an implementation decision. It exercises real module behavior through the selected interface, uses independently derived expectations, and survives internal refactors that preserve the contract.

Prefer real collaborators when they are fast and deterministic. Mock only the external, slow, nondeterministic, destructive, or otherwise impractical dependency below the behavior under test. Keep every side effect the test relies on real.

Assert a collaborator's arguments, call count, or ordering only when those interactions are part of the module's observable contract. Do not assert merely that a mock exists or that an internal collaborator was called.

Read [references/mocking.md](references/mocking.md) before adding a mock, fake, spy, or test-only helper. Read [references/writing-good-tests.md](references/writing-good-tests.md) for test-quality gates, mutation checks, and warning signs.

## Existing Code and Bugs

TDD cannot recreate the history of existing code. Do not delete or hide working implementation simply because it predates a test.

For a bug, add a minimal regression test that demonstrates the current failure, verify that failure, then make the smallest repair. For an untested behavior that must be changed, characterize the current contract where necessary, then add a failing test for the requested change.

## Completion

Before declaring a feature, bug fix, or behavior change complete:

- The focused RED test failed for the intended missing or incorrect behavior.
- The focused test passes after the production change.
- The relevant test suite passes.
- Tests cover meaningful observable behavior, not private structure, mock existence, or source text.
- Expected values are independent of the code under test.
- Mocks and test helpers are justified and preserve the behavior under test.
- Run the repository's available typecheck, lint, and broader test commands when the change warrants them.

For a pure refactor, replace the RED requirement with passing characterization tests that cover the preserved behavior and detect realistic mutations.

Use one behavior per cycle. A test may contain multiple assertions when together they specify a single outcome and prevent a false positive.
