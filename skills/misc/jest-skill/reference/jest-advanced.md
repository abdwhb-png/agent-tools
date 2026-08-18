# Jest — Advanced Testing Features & Patterns

This reference covers sophisticated testing techniques for complex scenarios and large test suites, extending beyond the core configuration.

## §1 — Custom Matchers

Domain-specific matchers improve test readability and provide tailored error messages.

### Synchronous Custom Matcher
```javascript
// matchers/toBeWithinRange.js
export function toBeWithinRange(received, floor, ceiling) {
  const pass = received >= floor && received <= ceiling;
  if (pass) {
    return {
      message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
      pass: true
    };
  } else {
    return {
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass: false
    };
  }
}

// jest.setup.js
import { toBeWithinRange } from './matchers/toBeWithinRange';
expect.extend({ toBeWithinRange });
```

### Async Custom Matcher
```javascript
// matchers/toResolveWithin.js
export async function toResolveWithin(received, timeout) {
  const startTime = Date.now();
  try {
    await received;
    const duration = Date.now() - startTime;
    const pass = duration <= timeout;

    return {
      message: () => pass
          ? `expected promise not to resolve within ${timeout}ms (resolved in ${duration}ms)`
          : `expected promise to resolve within ${timeout}ms (took ${duration}ms)`,
      pass
    };
  } catch (error) {
    return {
      message: () => `expected promise to resolve but it rejected with ${error}`,
      pass: false
    };
  }
}

// Usage
expect.extend({ toResolveWithin });
it('should resolve quickly', async () => {
  await expect(fetchData()).toResolveWithin(1000);
});
```

### Type-Safe Matchers (TypeScript)
```typescript
interface CustomMatchers<R = unknown> {
  toBeWithinRange(floor: number, ceiling: number): R;
  toHaveValidEmail(): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

export function toBeWithinRange(
  this: jest.MatcherContext,
  received: number,
  floor: number,
  ceiling: number
): jest.CustomMatcherResult { ... }
```

## §2 — Parameterized Tests (`test.each`)

Reduce duplication by driving your tests with data.

```javascript
// test.each with Arrays
describe('Addition', () => {
  test.each([
    [1, 1, 2],
    [1, 2, 3],
  ])('add(%i, %i) should equal %i', (a, b, expected) => {
    expect(add(a, b)).toBe(expected);
  });
});

// test.each with Objects
describe('User validation', () => {
  test.each([
    { email: 'test@example.com', valid: true },
    { email: 'invalid', valid: false },
  ])('validateEmail($email) should return $valid', ({ email, valid }) => {
    expect(validateEmail(email)).toBe(valid);
  });
});

// test.each with Template Literals
describe('String operations', () => {
  test.each`
    input        | method      | expected
    ${'hello'}   | ${'upper'}  | ${'HELLO'}
    ${'WORLD'}   | ${'lower'}  | ${'world'}
  `('transform $input using $method should return $expected', ({ input, method, expected }) => {
      expect(transform(input, method)).toBe(expected);
  });
});
```

## §3 — Advanced Mocking

### Mock Implementations with Different Return Values
```javascript
const mockFn = jest.fn()
  .mockReturnValueOnce(1)
  .mockReturnValueOnce(2)
  .mockReturnValue(3);
```

### Mock Module Factories
Inject dynamically generated mocks like specific random values or dynamically built stubs.
```javascript
jest.mock('./api', () => {
  const actual = jest.requireActual('./api');
  return {
    ...actual,
    fetchUser: jest.fn(),
    getDefaultUser: jest.fn(() => ({ id: Math.random(), name: 'Test User' }))
  };
});
```

### Mocking ES6 Classes
```javascript
import { Database } from './Database';
jest.mock('./Database');

describe('Database mock', () => {
  it('should mock class constructor', () => {
    const mockConnect = jest.fn();
    const mockQuery = jest.fn().mockResolvedValue([{ id: 1 }]);

    Database.mockImplementation(() => ({
      connect: mockConnect,
      query: mockQuery
    }));

    const db = new Database({ host: 'localhost' });
    expect(Database).toHaveBeenCalledWith({ host: 'localhost' });
    db.connect();
    expect(mockConnect).toHaveBeenCalled();
  });
});
```

## §4 — Advanced Assertions & Asymmetric Matchers

Use asymmetric matchers to validate complex payloads when exact primitive equality is too strict or impossible (e.g., Dates, IDs).
```javascript
expect(user).toEqual({
  id: expect.any(Number),
  name: 'John',
  email: expect.stringContaining('@'),
  createdAt: expect.any(Date)
});

// Objects and Arrays
expect(arr).toEqual(expect.arrayContaining([2, 4]));
expect(obj).toEqual(expect.objectContaining({ a: 1, c: 3 }));
```

### Contract Testing
Match large structures using the exact same asymmetric contract on every test.
```javascript
const userContract = {
  id: expect.any(Number),
  email: expect.stringMatching(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/),
  roles: expect.arrayContaining([expect.any(String)])
};
expect(await fetchUser(1)).toMatchObject(userContract);
```

## §5 — Test Isolation and Cleanup

### Resetting Module Registry
```javascript
beforeEach(() => { jest.resetModules(); });
```

### Cleanup methods explained
- `jest.clearAllMocks()`: Removes call history but keeps implementation.
- `jest.resetAllMocks()`: Removes call history AND implementation.
- `jest.restoreAllMocks()`: Restores original implementation (for mocked `jest.spyOn`).

## §6 — Performance & CI Scaling

### Selective Test Execution
```json
{
  "scripts": {
    "test:changed": "jest --onlyChanged",
    "test:related": "jest --findRelatedTests src/modified-file.js"
  }
}
```

### Sharding & Tuning
```bash
# Split tests across multiple CI machines
jest --shard=1/3  # Run first third
jest --shard=2/3  # Run second third
jest --shard=3/3  # Run last third
```

```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%', // Use 50% of available CPU cores
  maxConcurrency: 5, // Parallelize tests within a file
  bail: 1, // Stop after first failure
  cacheDirectory: '.jest-cache',
};
```

## §7 — Coverage Config & Custom Reporters

Override global thresholds for specific paths and build custom logic triggered upon test finish.

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
    './src/core/': { branches: 90, functions: 95, lines: 95, statements: 95 }
  },
  coverageReporters: [
    'text',
    ['./custom-reporter.js', { webhook: 'https://example.com/coverage' }]
  ]
};
```

```javascript
// custom-reporter.js
class CustomCoverageReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }
  onRunComplete(contexts, results) {
    const summary = results.coverageMap.getCoverageSummary();
    console.log(`Lines: ${summary.lines.pct}%`);
    if (this._options.webhook) this.sendToWebhook(summary, this._options.webhook);
  }
}
module.exports = CustomCoverageReporter;
```

## Best Practices & Pitfalls
- **Don't over-parameterize**: Too many `test.each` cases reduces readability.
- **Set realistic coverage**: 100% block coverage requirements slow down development.
- **Module state**: Forgetting to use `jest.resetModules()` leaves state leaking between tests!
- **Run fast**: Use `jest --onlyChanged` (`-o`) locally so you aren't waiting on un-matched suites.
