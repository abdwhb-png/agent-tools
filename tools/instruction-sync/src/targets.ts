import path from "node:path";
import type { HomeHarnessConfig, PolicyConfig, RenderedTarget } from "./types.js";
import {
  renderCodexConfig,
  renderVsCode,
} from "./renderers.js";
import {
  composeInstructions,
  HARNESS_NAMES,
  type HarnessName,
  type CanonicalSources,
} from "./sources.js";

function namedHomes(name: string, config: HomeHarnessConfig): { id: string; home: string }[] {
  return [
    { id: name, home: config.home! },
    ...(config.additionalHomes || []).map(({ id, home }) => ({ id: `${name}-${id}`, home })),
  ];
}

export function renderTargets(config: PolicyConfig, sources: CanonicalSources, codexConfigs: Record<string, string | undefined> = {}, adoptUnmanaged = false): RenderedTarget[] {
  const targets: RenderedTarget[] = [];
  const layers = {} as Record<HarnessName, { system: string; agents: string }>;
  for (const harness of HARNESS_NAMES) {
    layers[harness] = {
      system: composeInstructions([
        sources.invariants,
        ...sources.harnessInstructions[harness].system,
      ]),
      agents: composeInstructions([
        sources.preferences,
        sources.technologyDefaults,
        ...sources.harnessInstructions[harness].agents,
      ]),
    };
  }
  if (config.harnesses.pi.enabled) {
    const agentDir = config.harnesses.pi.agentDir!;
    const piInstructions = composeInstructions([sources.piAppendSystem]);
    targets.push(
      { id: "pi-system", kind: "file", path: path.join(agentDir, "SYSTEM.md"), desired: layers.pi.system, owned: layers.pi.system },
      { id: "pi-agents", kind: "file", path: path.join(agentDir, "AGENTS.md"), desired: layers.pi.agents, owned: layers.pi.agents },
      { id: "pi-append-system", kind: "file", path: path.join(agentDir, "APPEND_SYSTEM.md"), desired: piInstructions, owned: piInstructions },
    );
  }
  if (config.harnesses.codex.enabled) {
    for (const { id, home } of namedHomes("codex", config.harnesses.codex)) {
      const target = renderCodexConfig(codexConfigs[id], layers.codex.system, adoptUnmanaged);
      targets.push({ id: `${id}-config`, kind: "codex", path: path.join(home, "config.toml"), ...target });
      targets.push({ id: `${id}-agents`, kind: "file", path: path.join(home, "AGENTS.md"), desired: layers.codex.agents, owned: layers.codex.agents });
    }
  }
  if (config.harnesses.zed?.enabled) {
    const instructions = composeInstructions([
      layers.zed.system,
      layers.zed.agents,
    ]);
    for (const { id, home } of namedHomes("zed", config.harnesses.zed)) {
      targets.push({ id: `${id}-agents`, kind: "file", path: path.join(home, "AGENTS.md"), desired: instructions, owned: instructions });
    }
  }
  if (config.harnesses.vscode.enabled) {
    const output = renderVsCode(
      layers.vscode.system,
      layers.vscode.agents,
    );
    for (const [index, target] of config.harnesses.vscode.targets!.entries()) {
      targets.push({ id: `vscode-${index}`, kind: "file", path: target, desired: output, owned: output });
    }
  }
  const paths = new Set<string>();
  for (const target of targets) {
    if (paths.has(target.path)) throw new Error(`duplicate target path: ${target.path}`);
    paths.add(target.path);
  }
  return targets;
}
