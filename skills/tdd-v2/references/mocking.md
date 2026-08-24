# Mocking Boundaries

Mocks isolate dependencies that make a test slow, nondeterministic, external, destructive, or impractical to control. They should not replace the behavior the test is meant to verify.

## Decide Whether a Mock Is Needed

Prefer real collaborators when they are fast and deterministic. Consider a mock, fake, or controllable adapter for:

- Remote APIs, email, payment, or other external services
- Time, randomness, process state, or external event delivery
- Destructive operations that cannot run safely in a test
- Slow infrastructure when an integration test or test instance is not practical

Do not mock an internal collaborator just to assert that it was called. If the mock replaces a side effect the test needs, move it lower in the dependency chain or use the real component.

## Preserve the Tested Behavior

List the real dependency's side effects before replacing it. Keep the effects the test relies on real, and replace only the slow or uncontrollable operation below them.

```typescript
// The dependency is supplied at a seam rather than created inside the module.
function processPayment(order: Order, paymentClient: PaymentClient) {
  return paymentClient.charge(order.total);
}
```

Dependency injection makes the external adapter controllable without exposing internal behavior as a test surface.

## Make Doubles Honest

A double must match the real dependency's relevant contract, including data shape and error behavior. Give success, failure, and malformed input their own fixtures when a wrong branch could otherwise satisfy the same assertion.

Assert calls, arguments, counts, or ordering only when they are externally observable parts of the module contract, such as a command adapter whose documented job is to issue a particular request. Otherwise assert the module result or side effect.

Do not use assertions that prove only a mock was rendered, configured, or called. They describe the test setup, not the product behavior.

## Test Utilities Stay Outside Production

Cleanup helpers and fixtures used only by tests belong in test utilities. Do not add public `reset`, `destroy`, or inspection methods to production modules solely for tests.

If mock setup becomes larger than the behavior under test, use a real integration setup or simplify the interface. The excess setup is usually a design signal, not a reason to add more mocks.
