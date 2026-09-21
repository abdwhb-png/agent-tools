import { expect, test } from "bun:test";
import { renderTargets } from "../src/targets.js";
import type { PolicyConfig } from "../src/types.js";

test("merges technology defaults into every preferences target", () => {
  const config: PolicyConfig = {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: true, agentDir: "/pi/agent" },
      codex: { enabled: true, home: "/codex" },
      vscode: {
        enabled: true,
        targets: ["/vscode/agent-policy.instructions.md"],
      },
    },
  };
  const targets = renderTargets(
    config,
    {
      invariants: "Invariant\n",
      preferences: "General preference\n",
      technologyDefaults: "Technology default\n",
      harnessInstructions: {
        pi: ["Pi only\n"],
        codex: ["Codex only\n"],
        vscode: [],
      },
    },
    {},
  );
  const merged = "General preference\n\nTechnology default\n";

  expect(targets.find(({ id }) => id === "pi-agents")?.desired).toBe(merged);
  expect(targets.find(({ id }) => id === "codex-agents")?.desired).toBe(
    merged,
  );
  expect(targets.find(({ id }) => id === "vscode-0")?.desired).toContain(
    `<!-- agent-policy: preferences -->\n${merged}`,
  );
});
