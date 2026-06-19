---
name: ai-testing
description: Mandatory instructions for AI agents generating Vitest tests — context requirements, prompt rules, code standards, and review checklist.
---

# AI Agent Instructions: Writing Vitest Tests

> ⚠️ **These are YOUR instructions, AI agent.** Read and apply every section below when generating or modifying Vitest test files. Do not skip steps.

## 1. Gather Context First

Before writing a single test, collect ALL of the following:

1. **The source file** — Read the full implementation the tests will cover, including imports and types. Never guess what a function does.
2. **Existing test files in the project** — Study them to match the project's conventions: `test` vs `it`, `describe` block structure, fixture patterns (`test.extend` vs `beforeEach`), import style (globals or explicit imports), and naming conventions.
3. **The Vitest config** — Check for `globals: true`, custom `environment`, and `setupFiles`. If globals are enabled, do NOT generate `import { test, expect } from 'vitest'`. If globals are off, ALWAYS include the imports.
4. **Dependency signatures** — For code that needs mocking, read the type signatures of external dependencies (DB clients, API modules, etc.). Don't guess at mock shapes.
5. **Project conventions files** — Check for `AGENTS.md`, `.instructions.md`, or any coding guidelines that apply.

## 2. Follow These Prompt Rules (When Deciding What to Generate)

When the user gives a vague request, fill in the gaps yourself:

- **Cover edge cases.** Always include tests for: empty inputs, `null`/`undefined`, boundary values, error paths, network failures, and empty collections. Do NOT stop at happy-path.
- **Choose the right Vitest API.** Prefer `vi.fn()` over `jest.fn()`, `vi.mock()` over `jest.mock()`, `vi.spyOn()` over `jest.spyOn()`. Never generate Jest APIs.
- **For async code** — use `async`/`await` and appropriate matchers: `.resolves`, `.rejects`.
- **Never over-mock.** Favor testing real behavior over asserting that internal methods were called in a specific order. A test is too coupled if it breaks when internals change but output stays the same.
- **Use `test.extend`** for shared fixtures instead of `beforeEach` when feasible.
- **Keep test names short.** Bad: `'should correctly return the formatted price string when given a valid positive number and a supported currency code'`. Good: `'formats USD prices'`, `'throws for negative amounts'`.
- **Use parameterized tests** with `test.each` instead of duplicating test blocks for similar inputs.

## 3. Mocking Rules

- **Use `vi.mock(import('./module.js'))`** (the import() form) for type-safe, refactorable module mocking. Avoid the string-path form `vi.mock('./module.js')`.
- **Restore mocks.** Either enable `restoreMocks: true` in the vitest config, or call `vi.restoreAllMocks()` in `afterEach`. Never let spies leak between tests.
- **Don't mock everything.** If the test can work against the real implementation, let it. Over-mocking produces brittle tests.

## 4. Your Output Format

When generating a test file, ALWAYS:

1. Use `// @vitest-environment <env>` if a non-default environment is needed (e.g., `jsdom`, `happy-dom`).
2. Include or omit imports based on the project's `globals` config setting.
3. Group tests logically using `describe` blocks — one `describe` per function or component.
4. Name each `test`/`it` with a short behavior-descriptive label (imperative style).
5. Assert on output/behavior, not on implementation internals.

## 5. Review Checklist (Run This on Every Test File You Generate)

Before finishing, verify each of these:

- [ ] Do the tests assert meaningful properties (e.g., `toMatchObject`, `toBeTypeOf`) instead of just `.toBeDefined()`?
- [ ] Are tests testing **behavior**, not implementation details? (Would they break on a refactor that preserves output?)
- [ ] Are all Jest APIs replaced with Vitest equivalents? (`jest.fn` → `vi.fn`, `jest.mock` → `vi.mock`, etc.)
- [ ] Are mocks properly cleaned up? (No leaked spies between tests.)
- [ ] Are test names short and scannable? (No verbose "should correctly..." style.)
- [ ] Are edge cases covered? (Null, empty, error, boundary, network failure.)
- [ ] Would this file actually **run** without import errors? (Verify imports match the project's export names.)

## 6. When Running Tests

When executing tests, use:

```bash
vitest run                    # run all tests once (exits after finish)
vitest run --reporter=verbose # with detailed output
```

Do NOT use bare `vitest` (which starts watch mode) unless the user explicitly asks for it. Watch mode does not exit and will hang in CI or agent environments.
