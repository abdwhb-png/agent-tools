# Live Verification and Real-Data Benchmarks

Some outcomes—performance, resource usage, caching efficiency, live external protocol behavior, and visual/UI fidelity—cannot be proven by synthetic unit tests with mocked collaborators. Manufacturing fake-timer or call-count unit tests for these changes creates brittle noise while leaving the real outcome unverified.

Pair focused behavioral regression tests with real-data measurements or live runtime verification so both correctness and the real-world outcome are proven.

## Separate Behavioral Regression from Outcome Measurement

When changing performance, resource usage, caching, or live runtime behavior, split verification into two parts:

1. **Automated integration regression test (for correctness and invariants):** Write a focused integration-style test that exercises the real workflow and proves behavioral correctness—for example, that a cached path returns the same result as an uncached path, invalidates on mutation, and avoids redundant work across a realistic operation.
2. **Real-data benchmark or live runtime check (for the non-unit outcome):** Measure or observe the actual runtime effect against realistic data and environment conditions rather than asserting internal mock call counts in a unit test.

Do not add fragile timing thresholds (such as `expect(durationMs).toBeLessThan(10)`) to standard CI test suites where machine load causes flakiness. Keep deterministic invariant checks in the test suite and run timing or resource benchmarks as controlled before/after comparisons.

## Measure Performance with Real Data

When a change claims to improve latency, throughput, CPU, memory, query volume, or spawned processes, prove the improvement with a controlled before-and-after measurement:

1. **Seed realistic workload and state:** Use representative data sizes, concurrency, or thread/session counts (for example, a dev server seeded from a real install or realistic dataset) rather than a single empty or trivial fixture.
2. **Compare baseline (`main`) against the change under identical conditions:** Run the exact same workload against both versions. When system noise can affect timing or CPU, alternate runs between baseline and the change (or average multiple runs) after warm-up.
3. **Record concrete metrics:** Capture the specific quantities the change targets—such as wall-clock latency percentiles, CPU usage, peak memory, database queries executed, or child processes spawned—and report the before/after delta.

## Verify Live Integrations and Visual Outcomes Directly

When the behavior under test depends on a live server, external protocol, or rendered UI presentation:

- **Live server and protocol boundaries:** Keep automated integration tests focused on deterministic contract handling (request construction, response parsing, state updates, and error recovery). Verify end-to-end connectivity, latency, and live handshake behavior against a real local or staging instance when available.
- **Visual and interactive UI changes:** Use automated tests for stateful interactive behavior (user actions, form submission, state transitions, accessibility roles). Verify layout, spacing, motion, and visual polish by rendering the real interface and capturing before-and-after screenshots or short recordings rather than asserting CSS class strings or DOM tree snapshots in unit tests.
