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

## Choose the Right Scope

Prefer the narrowest existing interface that expresses the requested behavior. A test that needs to reach past the interface is evidence that either the test surface or the module design needs reconsideration.

Test the behavior your code owns, not mechanics promised by a framework or dependency. When an upstream assumption is important and uncertain, add one narrow characterization test at your module's interface.

## Fast Gate

Before committing a test, ask:

1. What realistic defect should make this fail?
2. Does it observe a behavior a caller relies on?
3. Can a correct internal refactor keep it green?
4. Is the expected value independent of the code under test?

If any answer is no, redesign the test before implementing production code.
