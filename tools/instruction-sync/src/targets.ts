import path from "node:path";
import type { PolicyConfig, RenderedTarget } from "./types.js";
import { renderCodexConfig, renderVsCode } from "./renderers.js";

export interface CanonicalSources {
  invariants: string;
  preferences: string;
  piAppend: string;
}

export function renderTargets(config: PolicyConfig, sources: CanonicalSources, codexConfig?: string, adoptUnmanaged = false): RenderedTarget[] {
  const targets: RenderedTarget[] = [];
  if (config.harnesses.pi.enabled) {
    const agentDir = config.harnesses.pi.agentDir!;
    targets.push(
      { id: "pi-system", kind: "file", path: path.join(agentDir, "SYSTEM.md"), desired: sources.invariants, owned: sources.invariants },
      { id: "pi-agents", kind: "file", path: path.join(agentDir, "AGENTS.md"), desired: sources.preferences, owned: sources.preferences },
      { id: "pi-append-system", kind: "file", path: path.join(agentDir, "APPEND_SYSTEM.md"), desired: sources.piAppend, owned: sources.piAppend },
    );
  }
  if (config.harnesses.codex.enabled) {
    const target = renderCodexConfig(codexConfig, sources.invariants, adoptUnmanaged);
    targets.push({ id: "codex-config", kind: "codex", path: path.join(config.harnesses.codex.home!, "config.toml"), ...target });
    targets.push({ id: "codex-agents", kind: "file", path: path.join(config.harnesses.codex.home!, "AGENTS.md"), desired: sources.preferences, owned: sources.preferences });
  }
  if (config.harnesses.vscode.enabled) {
    const output = renderVsCode(sources.invariants, sources.preferences);
    for (const [index, target] of config.harnesses.vscode.targets!.entries()) {
      targets.push({ id: `vscode-${index}`, kind: "file", path: target, desired: output, owned: output });
    }
  }
  return targets;
}
