# Behavior-Focused Tests

A test is useful when it demonstrates a caller-visible behavior and fails for a realistic defect. It should survive a refactor that preserves the module interface.

## Test Through the Interface

Exercise the owning module through its interface. Do not test private methods, internal collaborators, or database state through a side channel when the module offers a caller-visible result.

```typescript
// Behavior through the module interface
const result = await checkout(cart, paymentMethod);
expect(result.status).toBe("confirmed");
```

A test may make several assertions when they together describe one outcome, such as a returned result and its observable persisted effect. Split unrelated outcomes into separate tests.

## Derive Expectations Independently

The expected value must be able to disagree with the implementation. Use a literal, a worked example, or a trusted specification.

```typescript
// Incorrect: expectation repeats the implementation approach
const expected = items.reduce((total, item) => total + item.price, 0);
expect(calculateTotal(items)).toBe(expected);

// Correct: independently known result
expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
```

Do not create change detectors that only assert constants, exact private text, removed symbols, or source files. Test the caller-visible behavior that depends on the decision.

## Separate Presentation Ownership from Wiring

Do not duplicate mutable labels, widget text, status copy, separators, or full configuration defaults in fixtures. First identify which module owns the behavior:

- Test an owning formatter or renderer with independently known semantic expectations. Prefer structured segments, values, order, visibility, and style roles over incidental prose.
- Test a consumer or integration by importing the production-owned formatter, builder, or constant, then separately asserting the semantic state or input passed across the seam. This proves the wiring without making the test another owner of the copy.

Exact text remains appropriate when wording or syntax is the contract, including protocol values, security warnings, actionable errors, accessibility labels, and CLI grammar. Broad snapshots are appropriate only when the complete output is intentionally stable.

Do not use a formatter to compute the expected value in that formatter's own unit test. That comparison cannot detect a broken formatter.

## Choose the Right Scope

Select the test surface using a two-tier rule so tests neither bloat into pass-through unit slop nor degenerate into a single lazy happy-path check:

1. **Integration boundary for workflows and wiring:** When a behavior coordinates multiple internal collaborators (such as request handling, state transitions, caching, or persistence), test through the workflow's entry point with real internal collaborators. Assert the complete caller-visible outcome—returned data, persisted state, and side effects—not just a status code or absence of errors.
2. **Narrow module interface for combinatorial or pure logic:** When a module owns complex branching calculations, parsers, state machines, or boundary validation where testing every permutation through the full workflow would be slow or noisy, test those permutations directly at that module's interface.

```typescript
// Pass-through unit slop: mocks internal steps and proves only test wiring
const parseSpy = vi.spyOn(parser, "parse").mockReturnValue(parsedOrder);
await submitOrder(rawInput);
expect(parseSpy).toHaveBeenCalledWith(rawInput);

// Shallow/lazy integration test: exercises the workflow but misses real effects and failure modes
const response = await submitOrder(rawInput);
expect(response.ok).toBe(true);

// High-signal integration test: real collaborators, complete observable outcome
const response = await submitOrder(rawInput, { clock, paymentGateway: fakeGateway });
expect(response).toEqual({ ok: true, orderId: "ord_1", chargedCents: 1500 });
expect(await orderStore.get("ord_1")).toMatchObject({ status: "paid", totalCents: 1500 });
```

Once an integration test covers the workflow and its wiring, do not write separate unit tests for intermediate pass-through functions that only forward arguments or map fields along that same path. Conversely, do not stop at a single happy-path integration test: add focused tests (at the integration boundary or narrow pure-logic module) for each realistic error branch, boundary condition, and invalid input.

Test the behavior your code owns, not mechanics promised by a framework or dependency. When an upstream assumption is important and uncertain, add one narrow characterization test at your module's interface.

## Fast Gate

Before committing a test, ask:

1. What realistic regression should make this fail, and is that regression already caught by another test?
2. Does it observe the complete caller-visible outcome (value and state/side effects) rather than a shallow smoke check or internal mock call?
3. Can a correct internal refactor keep it green?
4. Is the expected value independent of the behavior under test, or intentionally sourced from a separately owned presentation boundary?

If any answer is no, redesign or prune the test before finishing.
