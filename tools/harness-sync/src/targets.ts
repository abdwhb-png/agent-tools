import path from "node:path";
import {
  renderAntigravityAgent,
  renderCodexAgent,
  renderPiAgent,
  renderVsCodeAgent,
} from "./agents.js";
import type { HomeHarnessConfig, PolicyConfig, RenderedTarget } from "./types.js";
import {
  assertAntigravityRuleSize,
  renderAntigravityRule,
  renderCodexConfig,
  renderInstructionModules,
  renderMcpConfig,
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

export function agentDirectories(config: PolicyConfig): { id: string; directory: string; extension: string }[] {
  if (config.resources?.agents !== true) return [];
  return [
    ...(config.harnesses.pi.enabled ? [{ id: "pi", directory: path.join(config.harnesses.pi.agentDir!, "agents"), extension: ".md" }] : []),
    ...(config.harnesses.codex.enabled ? namedHomes("codex", config.harnesses.codex).map(({ id, home }) => ({ id, directory: path.join(home, "agents"), extension: ".toml" })) : []),
    ...(config.harnesses.vscode.enabled ? (config.harnesses.vscode.directories || []).map(({ id, path: directory }) => ({ id: `vscode-${id}`, directory, extension: ".agent.md" })) : []),
    ...(config.harnesses.antigravity?.enabled
      ? namedHomes("antigravity", config.harnesses.antigravity).map(({ id, home }) => ({
          id,
          directory: path.join(home, "config", "agents"),
          extension: ".md",
        }))
      : []),
  ];
}

export function renderTargets(config: PolicyConfig, sources: CanonicalSources, codexConfigs: Record<string, string | undefined> = {}, adoptUnmanaged = false): RenderedTarget[] {
  const targets: RenderedTarget[] = [];
  if (config.resources?.instructions !== false) {
    const layers = {} as Record<HarnessName, { system: string; agents: string }>;
    for (const harness of HARNESS_NAMES) {
      const modules = sources.harnessInstructions[harness] ?? { system: [], agents: [] };
      const systemModules = renderInstructionModules(modules.system);
      const agentsModules = renderInstructionModules(modules.agents);
      const introduction = systemModules || agentsModules
        ? "Follow the instructions in the tagged modules below."
        : "";
      layers[harness] = {
        system: composeInstructions([
          sources.invariants,
          introduction,
          systemModules,
        ]),
        agents: composeInstructions([
          sources.preferences,
          sources.technologyDefaults,
          agentsModules,
        ]),
      };
    }
    if (config.harnesses.pi.enabled) {
      const agentDir = config.harnesses.pi.agentDir!;
      const piInstructions = composeInstructions([layers.pi.system, sources.piAppendSystem]);
      targets.push(
        { id: "pi-system", kind: "file", path: path.join(agentDir, "SYSTEM.md"), desired: "", owned: "", operation: "delete" },
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
    if (config.harnesses.antigravity?.enabled) {
      const antigravityAgents = renderInstructionModules(
        (sources.harnessInstructions.antigravity ?? { agents: [] }).agents,
      );
      const preferencesBody = composeInstructions([sources.preferences, antigravityAgents]);
      const technologyBody = composeInstructions([sources.technologyDefaults]);
      for (const { id, home } of namedHomes("antigravity", config.harnesses.antigravity)) {
        const geminiId = `${id}-gemini`;
        const gemini = assertAntigravityRuleSize(layers.antigravity.system, geminiId);
        const preferencesId = `${id}-preferences`;
        const preferences = renderAntigravityRule(
          {
            trigger: "always_on",
            description: "Global engineering preferences, coding philosophy, TDD, and validation rules.",
          },
          preferencesBody,
          preferencesId,
        );
        const technologyId = `${id}-technology-defaults`;
        const technology = renderAntigravityRule(
          {
            trigger: "model_decision",
            description:
              "Apply when selecting a new technology stack, framework, test runner, linter, or build tool where the project has not established its own choice, or when explicitly migrating stacks.",
          },
          technologyBody,
          technologyId,
        );
        if (sources.antigravityMcp !== undefined) {
          const mcpId = `${id}-mcp-config`;
          const mcpConfig = renderMcpConfig(sources.antigravityMcp, mcpId);
          targets.push({
            id: mcpId,
            kind: "file",
            path: path.join(home, "config", "mcp_config.json"),
            desired: mcpConfig,
            owned: mcpConfig,
          });
        }
        const rulesDirectory = path.join(home, "config", "rules");
        targets.push(
          { id: geminiId, kind: "file", path: path.join(home, "GEMINI.md"), desired: gemini, owned: gemini },
          {
            id: preferencesId,
            kind: "file",
            path: path.join(rulesDirectory, "agent-policy-preferences.md"),
            desired: preferences,
            owned: preferences,
          },
          {
            id: technologyId,
            kind: "file",
            path: path.join(rulesDirectory, "agent-policy-technology-defaults.md"),
            desired: technology,
            owned: technology,
          },
        );
      }
    }
    if (config.skills?.enabled) {
      for (const entry of config.skills.targets || []) {
        const source = entry.source ?? config.skills.source!;
        targets.push({
          id: `skills-${entry.id}`,
          kind: "symlink",
          path: entry.path,
          desired: source,
          owned: source,
        });
      }
    }
  }
  if (config.resources?.agents === true) {
    for (const agent of sources.agents || []) {
      if (config.harnesses.vscode.enabled && agent.vscode) {
        const desired = renderVsCodeAgent(agent);
        for (const { id, path: directory } of config.harnesses.vscode.directories || []) {
          targets.push({ id: `vscode-${id}-agent-${agent.id}`, kind: "file", path: path.join(directory, (agent.vscode.fileName as string | undefined) ?? `${agent.id}.agent.md`), desired, owned: desired, agentDirectory: directory });
        }
      }
      if (config.harnesses.pi.enabled && agent.pi) {
        const desired = renderPiAgent(agent, config.paths);
        targets.push({ id: `pi-agent-${agent.id}`, kind: "file", path: path.join(config.harnesses.pi.agentDir!, "agents", `${agent.pi.name}.md`), desired, owned: desired, agentDirectory: path.join(config.harnesses.pi.agentDir!, "agents") });
      }
      if (config.harnesses.codex.enabled && agent.codex) {
        const desired = renderCodexAgent(agent, config.paths);
        for (const { id, home } of namedHomes("codex", config.harnesses.codex)) {
          targets.push({ id: `${id}-agent-${agent.id}`, kind: "file", path: path.join(home, "agents", `${agent.id}.toml`), desired, owned: desired, agentDirectory: path.join(home, "agents") });
        }
      }
      if (config.harnesses.antigravity?.enabled && agent.antigravity) {
        const desired = renderAntigravityAgent(agent, config.paths);
        const fileName = `${(agent.antigravity.name as string | undefined) ?? agent.id}.md`;
        for (const { id, home } of namedHomes("antigravity", config.harnesses.antigravity)) {
          const directory = path.join(home, "config", "agents");
          targets.push({
            id: `${id}-agent-${agent.id}`,
            kind: "file",
            path: path.join(directory, fileName),
            desired,
            owned: desired,
            agentDirectory: directory,
          });
        }
      }
    }
    if (config.harnesses.codex.enabled) {
      const homes = [{ id: "codex", home: config.harnesses.codex.home!, retiredAgents: config.harnesses.codex.retiredAgents }, ...(config.harnesses.codex.additionalHomes || []).map((home) => ({ ...home, id: `codex-${home.id}` }))];
      for (const home of homes) {
        for (const file of home.retiredAgents || []) targets.push({ id: `${home.id}-agent-retired-${file.slice(0, -5)}`, kind: "file", path: path.join(home.home, "agents", file), desired: "", owned: "", agentDirectory: path.join(home.home, "agents"), operation: "delete" });
      }
    }
  }
  const paths = new Set<string>();
  const ids = new Set<string>();
  for (const target of targets) {
    if (ids.has(target.id)) throw new Error(`duplicate target id: ${target.id}`);
    if (paths.has(target.path)) throw new Error(`duplicate target path: ${target.path}`);
    ids.add(target.id);
    paths.add(target.path);
  }
  return targets;
}
