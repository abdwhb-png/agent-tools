---
name: pi-test-harness
description: >
  Write deterministic tests for Pi (earendil-works/pi-coding-agent) extensions using
  @marcfargas/pi-test-harness — assert on tools, hooks, and UI without calling an LLM.
  Works with any JavaScript/TypeScript test runner (Vitest, bun:test, Jest). Use when
  the user mentions pi-test-harness, createTestSession, createMockPi, verifySandboxInstall,
  "test my pi extension", "playbook mocking", pi-coding-agent, earendil pi, or writes a
  Pi extension test in Vitest/bun:test/Jest. Prefer this over generic test-runner
  guidance whenever Pi runtime types appear (AgentSession, ExtensionRunner, ctx.ui,
  ToolResultRecord).
license: MIT
metadata:
  author: marcfargas
  source: https://github.com/marcfargas/pi-test-harness
  version: "0.6.1"
  languages: [TypeScript, JavaScript]
  category: testing
---

# pi-test-harness

`@marcfargas/pi-test-harness` is the official-style test harness for [Pi](https://github.com/earendil-works/pi-coding-agent) extensions. Its job: let you exercise **real** extension code paths (tool registration, hooks, session events, UI prompts) in any test runner with zero LLM calls and full determinism.

> **Verify before use**: this skill snapshots the README as of v0.6.1 (2026-05). If the API ends up looking subtly different, re-fetch the README from https://github.com/marcfargas/pi-test-harness before trusting any snippet here.

## The mental model: "let pi be pi"

The harness minimizes faking. Everything runs through Pi's real code (extension loader via jiti, real tool wrapping pipeline, real `ExtensionRunner` for hooks, real event system). Only three substitution points are intercepted, all at boundaries:

```
+-------------------------------------------+
|  Real Pi environment                      |
|                                           |
|  Extensions --- loaded for real           |
|  Tool registry - real hooks + wrapping    |
|  Session state - in-memory persistence    |
|                                           |
|  +-------------------------------------+  |
|  |         Agent Loop                  |  |
|  |                                     |  |
|  |  streamFn ---- REPLACED by playbook |  |
|  |  tool.execute() INTERCEPTED if mock |  |
|  |  ctx.ui.* ---- INTERCEPTED + logged |  |
|  +-------------------------------------+  |
+-------------------------------------------+
```

| Boundary        | Replaced by    | Why                                              |
|-----------------|----------------|--------------------------------------------------|
| `streamFn`      | Playbook       | The LLM is the only non-deterministic piece       |
| `tool.execute()`| Mock handler   | Control what built-in tools "return" (hooks still fire) |
| `ctx.ui.*`      | Mock UI        | Control what the user "answers"                  |

Read this as: **only the LLM is non-deterministic, so only the LLM is faked.** Real-provider smoke tests belong in app code with the provider configured, not here.

## Which layer do I need?

The package ships three independent test layers. Pick by what you want to verify:

| Goal                                              | Use                       | See reference               |
|---------------------------------------------------|---------------------------|-----------------------------|
| Test extension logic in-process (most common)     | `createTestSession`       | `references/playbook-dsl.md` + `mock-tools.md` + `mock-ui.md` |
| Verify an npm package installs + loads correctly  | `verifySandboxInstall`    | `references/sandbox-install.md` |
| Test an extension that **spawns** `pi` as a subprocess | `createMockPi`        | `references/mock-pi-cli.md` |

For type shapes (`ToolResultRecord`, `MockUIConfig`, `MockToolHandler`, `MockPiCall`, `TestSession`, `TestEvents`), see `references/api-reference.md`.

## Test runner: agnostic, not Vitest-only

The harness is **test-runner-agnostic**. Its peer dependencies are only the three `@earendil-works/*` Pi packages — no test runner is declared. Every export (`createTestSession`, `when`/`calls`/`says`, `t.events.*`, `createMockPi`, `verifySandboxInstall`, `safeRmSync`, `ToolBlockedError`) is plain TypeScript that produces promises, events, and recorded state. It runs unchanged under **Vitest**, **bun:test**, or **Jest**.

The `describe / it / expect / afterEach / beforeEach` idioms used in the snippets below are Jest-compatible names — Vitest, bun:test, and Jest all expose them with identical signatures. Only the **import line** varies:

| Stack      | Import                                                                                |
|------------|---------------------------------------------------------------------------------------|
| Vitest     | `import { describe, it, expect, afterEach } from "vitest";`                           |
| bun:test   | `import { describe, it, expect, afterEach } from "bun:test";`                         |
| Jest       | `import { describe, it, expect, afterEach } from "@jest/globals";`                    |

This skill's snippets use the Vitest import for concreteness (the upstream README uses Vitest and it's the most common Pi-extension convention). Swap that one line if your project uses a different runner.

**Things to verify if you go off-script (bun:test in particular)**: process-exit timing for `safeRmSync`'s `EPERM`/`EBUSY` swallow (the harness assumes Node-like exit behavior — bun's process-exit timing can differ for SQLite lock release); and the `createMockPi` PATH-shim mechanism uses `child_process.spawn` under the hood, which bun handles via Node-compat but is worth a smoke test. Both work in theory; neither is in the package's upstream CI matrix (which is Vitest-only).

## Quick start

A full first test, ~15 lines:

```typescript
import { describe, it, expect, afterEach } from "vitest"; // <- swap for "bun:test" or "@jest/globals"
import {
  createTestSession,
  when, calls, says,
  type TestSession,
} from "@marcfargas/pi-test-harness";

describe("my extension", () => {
  let t: TestSession;
  afterEach(() => t?.dispose());

  it("calls a tool and responds", async () => {
    t = await createTestSession({
      extensions: ["./src/index.ts"],
      mockTools: {
        bash: (params) => `$ ${params.command}\nfile1.txt\nfile2.txt`,
        read: "file contents here",
        write: "written",
        edit: "edited",
      },
    });

    await t.run(
      when("List files in the project", [
        calls("bash", { command: "ls" }),
        says("Found 2 files: file1.txt and file2.txt."),
      ]),
    );

    expect(t.events.toolResultsFor("bash")).toHaveLength(1);
    expect(t.events.toolResultsFor("bash")[0].text).toContain("file1.txt");
    expect(t.events.toolResultsFor("bash")[0].mocked).toBe(true);
  });
});
```

Read it like this: `createTestSession` boots a real Pi session, loads `./src/index.ts` as the extension under test, and intercepts the four built-in tools listed in `mockTools`. The playbook passed to `t.run(...)` **is** what the model "says" — first a user prompt, then the model calls `bash` with `{ command: "ls" }`, then the model emits the text `"Found 2 files..."`. After the run, you assert against the recorded events.

## The playbook DSL in one paragraph

A playbook is one or more **turns**, each built with `when(prompt, actions)`. An action is either `calls(tool, params)` (the model invokes a tool) or `says(text)` (the model emits text and the turn ends). Multi-turn conversations are just multiple `when(...)` passed to `run()`. When one tool's output feeds the next call, chain `.then(result => ...)` to capture it and pass a `() => params` function for late binding. Full coverage including `multi-turn`, `.then()`, late-bound params, and playbook-exhaustion diagnostics lives in `references/playbook-dsl.md`.

```typescript
await t.run(
  when("What files are in the project?", [
    calls("bash", { command: "ls" }),
    says("Found 3 files."),
  ]),
  when("Now read the README", [
    calls("read", { path: "README.md" }),
    says("Here's what it says..."),
  ]),
);
```

## Mocking tools

`mockTools` intercepts `tool.execute()` for **specific tools only**. Extension-registered tools still execute for real — that's how you test your own tool logic while keeping the built-ins deterministic. Each value can be one of three forms:

```typescript
mockTools: {
  // 1. Static string → becomes `{ content: [{ type: "text", text: "..." }] }`
  bash: "command output here",

  // 2. Dynamic function → receives params, returns string or full ToolResult
  read: (params) => `contents of ${params.path}`,

  // 3. Full ToolResult for precise control
  write: {
    content: [{ type: "text", text: "Written successfully" }],
    details: { bytesWritten: 42 },
  },
}
```

### Critical correctness note

Pi's `tool_call` and `tool_result` hooks **still fire** for mocked tools through the real `ExtensionRunner`. This means extension-side gating (plan mode, allowlists, block-on-dangerous-command) works correctly even when the tool itself is mocked. If your extension blocks a call, the mock handler never runs and you'll see a `ToolBlockedError`.

### Error propagation

By default, real tool errors abort the test (`propagateErrors: true`) with a diagnostic pointing to the exact playbook step. Set `propagateErrors: false` to capture them as `isError: true` results instead — useful when your extension logic is supposed to recover from tool errors.

```typescript
const t = await createTestSession({ propagateErrors: false, /* ... */ });
```

Full decision tree for "what do I mock vs leave real", plus `ToolBlockedError` patterns and the two diagnostic modes, is in `references/mock-tools.md`.

## Mocking the UI

Extensions that call `ctx.ui.confirm()`, `ctx.ui.select()`, `ctx.ui.input()`, `ctx.ui.editor()` get controlled responses. All calls are recorded for assertions afterwards. Each field accepts a static value (same answer every time) or a function (dynamic per prompt).

```typescript
const t = await createTestSession({
  extensions: ["./src/index.ts"],
  mockUI: {
    confirm: false,                    // deny all confirmations
    select: 0,                         // always pick first item
    input: "user input text",          // return a fixed string
    editor: "edited content",          // return a fixed string
  },
});

// ...run playbook...

expect(t.events.uiCallsFor("confirm")).toHaveLength(1);
expect(t.events.uiCallsFor("confirm")[0].returnValue).toBe(false);
```

Defaults when no `mockUI` is provided: `confirm → true`, `select → first item`, `input → ""`, `editor → ""`.

Dynamic handlers are also supported, e.g. to return `false` only for prompts mentioning "Delete":

```typescript
mockUI: {
  confirm: (title, _message) => !title.includes("Delete"),
  select: (_title, items) => items.find(i => i.includes("staging")),
}
```

Full signatures and decision guidance are in `references/mock-ui.md`.

## Reading what happened: the events API

Every interaction is collected in `t.events`.

```typescript
// Tool interaction
t.events.toolCallsFor("bash")         // ToolCallRecord[] (has .params — read what was asked)
t.events.toolResultsFor("bash")       // ToolResultRecord[] (has .mocked, .isError, .text)
t.events.blockedCalls()               // tool calls that hooks blocked (e.g. plan mode)

// UI interaction
t.events.uiCallsFor("notify")         // UICallRecord[]
t.events.uiCallsFor("confirm")

// Raw history
t.events.messages                     // AgentMessage[]
t.events.all                          // AgentSessionEvent[] (everything)
```

### Reading call params and pairing with results

Use `toolCallsFor(name)` when you want to assert on what was *asked* (the params passed to `calls(...)`), and pair via `toolCallId` if you also need the result:

```typescript
const call   = t.events.toolCallsFor("summarize_doc")[0];
const result = t.events.toolResultsFor("summarize_doc")[0];

expect(call.params).toEqual({ path: "README.md" });
expect(result.mocked).toBe(false);     // extension's real code ran
expect(result.isError).toBe(false);
```

For `ToolCallRecord`, `ToolResultRecord`, and `UICallRecord` shapes — and the pairing pattern in full — see `references/api-reference.md`.

## Handling blocked tools

When an extension hook blocks a mocked tool, the harness throws `ToolBlockedError` (exported from the package). Use `instanceof` to assert a *block* rather than an *error*:

```typescript
import { ToolBlockedError } from "@marcfargas/pi-test-harness";

try {
  await t.run(when("Try write", [
    calls("bash", { command: "rm -rf /" }),
    says("Done."),
  ]));
} catch (err) {
  if (err instanceof ToolBlockedError) {
    // Expected: extension hook blocked the call
  } else {
    throw err;
  }
}

// Or assert via the event record after the fact
const result = t.events.toolResultsFor("bash")[0];
expect(result.isError).toBe(true);
```

## Verifying a publishable package

Before publishing an extension package, `verifySandboxInstall` does a real `npm pack` → temp-dir install → dynamic import and checks that extensions/tools/skills load cleanly. This catches broken `exports`, missing dependencies, and bad `main`/`types` fields that only bite *after* install.

```typescript
import { verifySandboxInstall } from "@marcfargas/pi-test-harness";

const result = await verifySandboxInstall({
  packageDir: "./packages/my-extension",
  expect: {
    extensions: 1,
    tools: ["my_tool", "my_other_tool"],
    skills: 0,
  },
});

expect(result.loaded.extensionErrors).toEqual([]);
expect(result.loaded.tools).toContain("my_tool");
```

You can also run a smoke playbook inside the sandbox install to make sure tools actually execute when the package is loaded from disk — see `references/sandbox-install.md`.

## Testing subprocess-spawning extensions

If your extension shells out to `pi --mode json -p` (typical for subagent orchestrators, parallel-task runners, etc.), `createMockPi` puts a fake `pi` binary on PATH that returns controllable responses. The full lifecycle is install → queue responses → run test → uninstall.

```typescript
import { createMockPi } from "@marcfargas/pi-test-harness";

const mockPi = createMockPi();
mockPi.install();                       // create shim, prepend to PATH

mockPi.onCall({ output: "Hello from agent", exitCode: 0 });
mockPi.onCall({ stderr: "agent crashed", exitCode: 1 });
mockPi.onCall({
  jsonl: [
    { type: "tool_execution_start", toolName: "bash" },
    { type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "done" }] } },
  ],
});

expect(mockPi.callCount()).toBe(0);

// ...run playbook that triggers those subprocesses...

mockPi.uninstall();                     // restore PATH, delete temp dir
```

The response shape (`output`, `exitCode`, `stderr`, `delay`, `jsonl`, `writeFiles`), the concurrency caveat (serial spawns only), and the safety features (exit handler auto-restores PATH; 30s timeout; key validation that throws on typos like `{ ouptut: ... }`) are documented in `references/mock-pi-cli.md`.

## Windows + SQLite: use `safeRmSync` in `afterEach`

This is the single biggest Windows footgun, and it always bites users who haven't seen it before. `session.dispose()` does **not** fire `session_shutdown`; that event fires on Node process exit. Extensions that open SQLite databases in `session_start` (memory extensions, brainiac, etc.) keep those files locked for the entire test runner lifetime.

On Windows, `rmSync(dbPath)` in `afterEach` will throw `EPERM` because the file is still locked. Use the bundled `safeRmSync` instead, which swallows only `EPERM`/`EBUSY`:

```typescript
import { safeRmSync } from "@marcfargas/pi-test-harness";

let dbPath: string;

afterEach(() => {
  t?.dispose();                 // dispose session first
  safeRmSync(dbPath);
  safeRmSync(dbPath + "-wal");
  safeRmSync(dbPath + "-shm");
});
```

Files get cleaned up by the OS when the test process exits anyway. For isolation across tests, give each one a unique DB path (typically `mkdtempSync` + the test name).

`safeRmSync` only suppresses `EPERM` and `EBUSY` — every other error still propagates.

## Test-layer summary

| Function              | Replaces                  | Use case                                   |
|-----------------------|---------------------------|--------------------------------------------|
| `createTestSession`   | LLM (`streamFn`)          | Testing extension logic in-process         |
| `verifySandboxInstall`| Nothing (real install)    | Verifying the npm package works            |
| `createMockPi`        | `pi` CLI binary           | Testing subprocess-spawning extensions     |

## Install

```bash
npm install --save-dev @marcfargas/pi-test-harness
```

Peer dependencies (matched minor lines `0.74.x` and `0.75.x` currently supported):

- `@earendil-works/pi-coding-agent` >= 0.74.0
- `@earendil-works/pi-ai` >= 0.74.0
- `@earendil-works/pi-agent-core` >= 0.74.0

## Reference index

For deeper coverage without bloating this entrypoint, read:

- `references/playbook-dsl.md` — full playbook DSL: multi-turn, `.then()`, late-bound params, both exhaustion diagnostic modes and their fixes.
- `references/mock-tools.md` — MockToolHandler union, hook interaction under mocking, error propagation modes, `ToolBlockedError` patterns, what-to-mock decision tree.
- `references/mock-ui.md` — `MockUIConfig` full reference, static-vs-dynamic form signatures, when to override defaults.
- `references/sandbox-install.md` — `verifySandboxInstall` options, the smoke sub-config, pre-publish CI integration patterns.
- `references/mock-pi-cli.md` — `createMockPi` full lifecycle, every `MockPiCall` response field, safety features, concurrency caveat.
- `references/api-reference.md` — type definitions (`ToolResultRecord`, `MockUIConfig`, `MockToolHandler`, `MockPiCall`, `TestSession`, `TestEvents`) and the complete event-collection API.
