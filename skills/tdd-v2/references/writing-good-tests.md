# Writing Good Tests

Good tests name the regression they prevent and exercise the real module behavior needed to prevent it. TDD proves that a test can fail; these gates ensure it fails for a useful reason.

## Name the Break

Before writing a test body, state the production change that should make it fail. Good answers include a missing validation branch, wrong payload field, incorrect retry count, unexpected default, or missing side effect.

Redesign the test when the answer is only a private implementation detail, a source-text change, or an intentional product decision that has no caller-visible consequence.

## Test Effects, Not Source Text

Run scripts and tools against controlled input and assert output, exit status, or observable side effects. Do not test them by searching their source text.

Human-facing prose does not need an automated test. Instructions consumed by another system should be tested through that consumer's observable behavior where feasible.

## Mutation Check

Before finishing, mentally change the production code in a realistic wrong way. At least one test should fail for each important mutation:

- Wrong value, argument, or mapping
- Wrong branch or missing validation
- Missing state transition or side effect
- Empty/default result
- Malformed, empty, unauthorized, or boundary input handled incorrectly

A mutation no test detects indicates an uncovered behavior or a test that is insensitive to the defect.

## Warning Signs

Revisit a test when:

- Setup computes the assertion's expected value.
- The test fails on refactors that preserve module behavior.
- The test checks a mock's presence rather than a product effect.
- A test-only production method is required for observation or cleanup.
- A dependency mock hides a side effect needed by the test.
- Setup is larger or more complex than the behavior being specified.

The remedy is usually to choose a better module interface, use a more realistic collaborator, or narrow the behavior under test.
