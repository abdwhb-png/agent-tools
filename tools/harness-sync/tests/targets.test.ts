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
        antigravity: { system: [], agents: [] },
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

test.each(["pi", "codex", "zed", "vscode", "antigravity"] as const)(
  "introduces agents-only %s modules once across the generated prompt",
  (harness) => {
    const config: PolicyConfig = {
      schemaVersion: 1,
      harnesses: {
        pi: { enabled: true, agentDir: "/pi" },
        codex: { enabled: true, home: "/codex" },
        zed: { enabled: true, home: "/zed" },
        vscode: { enabled: true, targets: ["/vscode.instructions.md"] },
        antigravity: { enabled: true, home: "/antigravity" },
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
        antigravity: { system: [], agents: [] },
      },
    };
    sources.harnessInstructions[harness].agents = [
      { source: `${harness}/agents/workflow.md`, content: "Personal workflow\n" },
      { source: `${harness}/agents/empty.md`, content: "\n\n" },
    ];
    const targets = renderTargets(config, sources);
    const selected = targets.filter(({ id }) => id.startsWith(`${harness}-`));
    const prompt = selected.map(({ desired }) => desired).join("\n");
    expect(prompt.match(/Follow the instructions in the tagged modules below\./g)).toHaveLength(1);
    expect(prompt).toContain(`<${harness}_agents_workflow>\n\nPersonal workflow\n\n</${harness}_agents_workflow>`);
    expect(prompt).not.toContain(`<${harness}_agents_empty>`);
    expect(prompt).not.toContain("instruction_module");
    expect(prompt).not.toContain("source=");
    if (harness === "pi" || harness === "codex" || harness === "antigravity") {
      expect(
        selected.find(({ id }) => id.endsWith("-agents") || id.endsWith("-preferences"))?.desired,
      ).not.toContain("Follow the instructions in the tagged modules");
    }
    for (const target of targets.filter(({ id }) => !id.startsWith(`${harness}-`))) {
      expect(target.desired).not.toContain("Follow the instructions in the tagged modules");
      expect(target.desired).not.toContain(`<${harness}_`);
    }
    sources.harnessInstructions[harness].agents.shift();
    for (const target of renderTargets(config, sources)) {
      expect(target.desired).not.toContain("Follow the instructions in the tagged modules");
      expect(target.desired).not.toContain(`<${harness}_`);
    }
  },
);

test("renders hybrid Antigravity GEMINI.md and modular config/rules targets across homes", () => {
  const config: PolicyConfig = {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: false },
      vscode: { enabled: false },
      antigravity: {
        enabled: true,
        home: "/home/dev/.gemini",
        additionalHomes: [{ id: "windows", home: "/mnt/c/Users/dev/.gemini" }],
      },
    },
  };
  const targets = renderTargets(config, {
    invariants: "Core invariant\n",
    preferences: "Core preference\n",
    technologyDefaults: "Tech default\n",
    piAppendSystem: "",
    harnessInstructions: {
      pi: { system: [], agents: [] },
      codex: { system: [], agents: [] },
      vscode: { system: [], agents: [] },
      zed: { system: [], agents: [] },
      antigravity: {
        system: [{ source: "antigravity/system/shell.md", content: "Shell rule\n" }],
        agents: [{ source: "antigravity/agents/style.md", content: "Style rule\n" }],
      },
    },
  });

  expect(targets.map(({ id, path }) => ({ id, path }))).toEqual([
    { id: "antigravity-gemini", path: "/home/dev/.gemini/GEMINI.md" },
    {
      id: "antigravity-preferences",
      path: "/home/dev/.gemini/config/rules/agent-policy-preferences.md",
    },
    {
      id: "antigravity-technology-defaults",
      path: "/home/dev/.gemini/config/rules/agent-policy-technology-defaults.md",
    },
    { id: "antigravity-windows-gemini", path: "/mnt/c/Users/dev/.gemini/GEMINI.md" },
    {
      id: "antigravity-windows-preferences",
      path: "/mnt/c/Users/dev/.gemini/config/rules/agent-policy-preferences.md",
    },
    {
      id: "antigravity-windows-technology-defaults",
      path: "/mnt/c/Users/dev/.gemini/config/rules/agent-policy-technology-defaults.md",
    },
  ]);

  const gemini = targets.find(({ id }) => id === "antigravity-gemini")!;
  expect(gemini.desired).toBe(
    "Core invariant\n\nFollow the instructions in the tagged modules below.\n\n<antigravity_system_shell>\n\nShell rule\n\n</antigravity_system_shell>\n",
  );
  expect(targets.find(({ id }) => id === "antigravity-windows-gemini")!.desired).toBe(gemini.desired);

  const prefs = targets.find(({ id }) => id === "antigravity-preferences")!;
  expect(Bun.YAML.parse(prefs.desired.split("---\n")[1]).trigger).toBe("always_on");
  expect(prefs.desired.split("---\n")[2]).toBe(
    "\nCore preference\n\n<antigravity_agents_style>\n\nStyle rule\n\n</antigravity_agents_style>\n",
  );

  const tech = targets.find(({ id }) => id === "antigravity-technology-defaults")!;
  expect(Bun.YAML.parse(tech.desired.split("---\n")[1]).trigger).toBe("model_decision");
  expect(tech.desired.split("---\n")[2]).toBe("\nTech default\n");
});
