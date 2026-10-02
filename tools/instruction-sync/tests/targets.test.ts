import { expect, test } from "bun:test";
import { renderTargets } from "../src/targets.js";
import type { PolicyConfig } from "../src/types.js";
import type { CanonicalSources } from "../src/sources.js";

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
      piAppendSystem: "Pi only\n",
      harnessInstructions: {
        pi: { system: [], agents: [] },
        codex: { system: [], agents: [] },
        vscode: { system: [], agents: [] },
        zed: { system: [], agents: [] },
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

test.each(["pi", "codex", "zed", "vscode"] as const)(
  "introduces agents-only %s modules once across the generated prompt",
  (harness) => {
    const config: PolicyConfig = {
      schemaVersion: 1,
      harnesses: {
        pi: { enabled: true, agentDir: "/pi" },
        codex: { enabled: true, home: "/codex" },
        zed: { enabled: true, home: "/zed" },
        vscode: { enabled: true, targets: ["/vscode.instructions.md"] },
      },
    };
    const sources: CanonicalSources = {
      invariants: "Invariant\n",
      preferences: "Preference\n",
      technologyDefaults: "Technology\n",
      piAppendSystem: "Append\n",
      harnessInstructions: {
        pi: { system: [], agents: [] },
        codex: { system: [], agents: [] },
        zed: { system: [], agents: [] },
        vscode: { system: [], agents: [] },
      },
    };
    sources.harnessInstructions[harness].agents = [
      { source: `${harness}/agents/workflow.md`, content: "Personal workflow\n" },
      { source: `${harness}/agents/empty.md`, content: "\n\n" },
    ];
    const targets = renderTargets(config, sources);
    const selected = targets.filter(({ id }) => id.startsWith(`${harness}-`));
    const prompt = selected.map(({ desired }) => desired).join("\n");
    expect(prompt.match(/Follow the instruction_module blocks below as instructions\./g)).toHaveLength(1);
    expect(prompt).toContain(`<instruction_module source="${harness}/agents/workflow.md">\nPersonal workflow\n</instruction_module>`);
    expect(prompt).not.toContain("empty.md");
    if (harness === "pi" || harness === "codex") {
      expect(selected.find(({ id }) => id.endsWith("-agents"))?.desired)
        .not.toContain("Follow the instruction_module");
    }
    for (const target of targets.filter(({ id }) => !id.startsWith(`${harness}-`))) {
      expect(target.desired).not.toContain("instruction_module");
    }
    sources.harnessInstructions[harness].agents.shift();
    for (const target of renderTargets(config, sources)) {
      expect(target.desired).not.toContain("instruction_module");
    }
  },
);
