import path from "node:path";
import type { PolicyConfig, RenderedTarget } from "./types.js";
import {
  renderCodexConfig,
  renderVsCode,
} from "./renderers.js";
import {
  composeInstructions,
  type CanonicalSources,
} from "./sources.js";

export function renderTargets(config: PolicyConfig, sources: CanonicalSources, codexConfig?: string, adoptUnmanaged = false): RenderedTarget[] {
  const targets: RenderedTarget[] = [];
  const preferences = composeInstructions([
    sources.preferences,
    sources.technologyDefaults,
  ]);
  if (config.harnesses.pi.enabled) {
    const agentDir = config.harnesses.pi.agentDir!;
    const piInstructions = composeInstructions(
      sources.harnessInstructions.pi,
    );
    targets.push(
      { id: "pi-system", kind: "file", path: path.join(agentDir, "SYSTEM.md"), desired: sources.invariants, owned: sources.invariants },
      { id: "pi-agents", kind: "file", path: path.join(agentDir, "AGENTS.md"), desired: preferences, owned: preferences },
      { id: "pi-append-system", kind: "file", path: path.join(agentDir, "APPEND_SYSTEM.md"), desired: piInstructions, owned: piInstructions },
    );
  }
  if (config.harnesses.codex.enabled) {
    const instructions = composeInstructions([
      sources.invariants,
      ...sources.harnessInstructions.codex,
    ]);
    const target = renderCodexConfig(codexConfig, instructions, adoptUnmanaged);
    targets.push({ id: "codex-config", kind: "codex", path: path.join(config.harnesses.codex.home!, "config.toml"), ...target });
    targets.push({ id: "codex-agents", kind: "file", path: path.join(config.harnesses.codex.home!, "AGENTS.md"), desired: preferences, owned: preferences });
  }
  if (config.harnesses.vscode.enabled) {
    const output = renderVsCode(
      sources.invariants,
      preferences,
      composeInstructions(sources.harnessInstructions.vscode),
    );
    for (const [index, target] of config.harnesses.vscode.targets!.entries()) {
      targets.push({ id: `vscode-${index}`, kind: "file", path: target, desired: output, owned: output });
    }
  }
  return targets;
}
