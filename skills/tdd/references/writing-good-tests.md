# Writing Good Tests

Good tests name the regression they prevent and exercise the real module behavior needed to prevent it. TDD proves that a test can fail; these gates ensure it fails for a useful reason.

## Name the Break

Before writing a test body, state the production change that should make it fail. Good answers include a missing validation branch, wrong payload field, incorrect retry count, unexpected default, or missing side effect.

Redesign the test when the answer is only a private implementation detail, a source-text change, or an intentional product decision that has no caller-visible consequence.

## Test Effects, Not Source Text

Run scripts and tools against controlled input and assert output, exit status, or observable side effects. Do not test them by searching their source text.

Human-facing prose does not need an automated test. Instructions consumed by another system should be tested through that consumer's observable behavior where feasible.

## Cover Every Distinct Regression Once

Every test kept in the repository carries permanent maintenance cost, yet skipping edge cases leaves real defects unguarded. Balance rigor and conciseness by mapping tests to distinct failure modes rather than to internal functions or arbitrary input variations:

- **Cover each distinct failure mode:** Ensure there is an executable test for the primary workflow outcome, each boundary or invariant, malformed/unauthorized input handling, and failure or rollback behavior.
- **Avoid redundant layers:** When an integration test already exercises `handler -> service -> repository` and asserts the resulting state, do not add separate pass-through unit tests for `service` or `repository` that merely repeat the same scenario with mocks.
- **Avoid duplicate permutations:** Do not write multiple tests with different literals that traverse the exact same code branch and assertion unless they represent meaningful boundary values.
- **Prune scaffolding during refactor:** If you wrote a narrow micro-test while building a helper and a higher-level integration test now catches the exact same regression with equal diagnostic clarity, consolidate or remove the redundant micro-test.

## Mutation Check

Before finishing, mentally change the production code in a realistic wrong way. At least one test should fail for each important mutation:

- Wrong value, argument, or mapping
- Wrong branch or missing validation
- Missing state transition or side effect
- Empty/default result
- Malformed, empty, unauthorized, or boundary input handled incorrectly

A mutation no test detects indicates an uncovered behavior or a shallow test that is insensitive to the defect. A single mutation that breaks five tests across three layers for the exact same reason indicates redundant pass-through tests.

## Warning Signs

Revisit a test when:

- Setup computes the assertion's expected value.
- A fixture restates mutable presentation copy or mirrors current production configuration.
- The test fails on refactors that preserve module behavior.
- The test checks a mock's presence or internal call wiring rather than a product effect.
- The test is a shallow integration check (such as asserting only `status === 200` or "did not throw") that misses state transitions, side effects, or error branches.
- Multiple tests exercise the exact same code path with different arbitrary inputs or across redundant mocked layers.
- A test-only production method is required for observation or cleanup.
- A dependency mock hides a side effect needed by the test.
- Setup is larger or more complex than the behavior being specified.

The remedy is usually to test at the integration seam with real internal collaborators, drop down to a narrow module interface only for combinatorial pure logic, prune duplicate permutations, or import the separately owned production formatter in a wiring test. Never use a formatter to calculate its own unit-test expectation.
