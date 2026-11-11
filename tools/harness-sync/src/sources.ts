import fs from "node:fs/promises";
import path from "node:path";
import { loadAgentSources, type AgentSource } from "./agents.js";

export const HARNESS_NAMES = ["pi", "codex", "vscode", "zed", "antigravity", "opencode"] as const;
export type HarnessName = (typeof HARNESS_NAMES)[number];

export interface InstructionModule {
  source: string;
  content: string;
}

export interface CanonicalSources {
  invariants: string;
  preferences: string;
  technologyDefaults: string;
  harnessInstructions: Record<
    HarnessName,
    { system: InstructionModule[]; agents: InstructionModule[] }
  >;
  piAppendSystem: string;
  antigravityMcp?: unknown;
  codexMcp?: unknown;
  opencodeMcp?: unknown;
  agents?: AgentSource[];
}

export function normalizeInstruction(source: string): string {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  return normalized === "" ? "" : normalized.replace(/\n*$/, "\n");
}

export function composeInstructions(sources: string[]): string {
  const content = sources
    .map((source) => normalizeInstruction(source).trimEnd())
    .filter(Boolean);
  return content.length === 0 ? "" : `${content.join("\n\n")}\n`;
}

async function readInstruction(filePath: string): Promise<string> {
  return normalizeInstruction(await fs.readFile(filePath, "utf8"));
}

async function readOptionalDirectory(
  directory: string,
): Promise<Array<{ isFile(): boolean; name: string }>> {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
    return [];
  }
}

async function loadInstructionModules(
  directory: string,
  sourcePrefix: string,
): Promise<InstructionModule[]> {
  const entries = await readOptionalDirectory(directory);
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  return Promise.all(
    filenames.map(async (filename) => ({
      source: `${sourcePrefix}/${filename}`,
      content: await readInstruction(path.join(directory, filename)),
    })),
  );
}

export async function loadCanonicalSources(root: string, resources: { instructions?: boolean; agents?: boolean } = { agents: true }): Promise<CanonicalSources> {
  const instructionPath = (...parts: string[]) =>
    path.join(root, "instructions", ...parts);
  if (resources.instructions === false) return {
    invariants: "", preferences: "", technologyDefaults: "", piAppendSystem: "",
    // SAFETY: Object.fromEntries widens the key type to string, while the mapped entries are
    // exactly HARNESS_NAMES, so the record is exhaustive over HarnessName.
    harnessInstructions: Object.fromEntries(HARNESS_NAMES.map((harness) => [harness, { system: [], agents: [] }])) as unknown as CanonicalSources["harnessInstructions"],
    agents: resources.agents === false ? [] : await loadAgentSources(root),
  };
  const harnessInstructions = Object.fromEntries(
    await Promise.all(
      HARNESS_NAMES.map(async (harness) => {
        const directory = instructionPath(harness);
        const entries = await readOptionalDirectory(directory);
        const misplaced = entries
          .filter(
            (entry) => entry.isFile() && entry.name.endsWith(".md") &&
              !(harness === "pi" && entry.name === "APPEND_SYSTEM.md"),
          )
          .map((entry) => entry.name)
          .sort();
        if (misplaced.length > 0) {
          const appendHint = harness === "pi"
            ? "; Pi append content belongs in APPEND_SYSTEM.md"
            : "";
          throw new Error(
            `misplaced instruction source: ${path.join(directory, misplaced[0])}; move Markdown modules into system/ or agents/${appendHint}`,
          );
        }
        return [
          harness,
          {
            system: await loadInstructionModules(
              instructionPath(harness, "system"), `${harness}/system`,
            ),
            agents: await loadInstructionModules(
              instructionPath(harness, "agents"), `${harness}/agents`,
            ),
          },
        ];
      }),
    ),
  ) as CanonicalSources["harnessInstructions"];
  let piAppendSystem = "";
  try {
    piAppendSystem = await readInstruction(instructionPath("pi", "APPEND_SYSTEM.md"));
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  let antigravityMcp: unknown;
  const mcpSource = path.join(root, "mcp", "antigravity.json");
  let mcpText: string | undefined;
  try {
    mcpText = await fs.readFile(mcpSource, "utf8");
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (mcpText !== undefined) {
    try {
      antigravityMcp = JSON.parse(mcpText);
    } catch {
      throw new Error("mcp/antigravity.json is not valid JSON");
    }
  }
  let opencodeMcp: unknown;
  const openCodeMcpSource = path.join(root, "mcp", "opencode.json");
  let openCodeMcpText: string | undefined;
  try {
    openCodeMcpText = await fs.readFile(openCodeMcpSource, "utf8");
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (openCodeMcpText !== undefined) {
    try {
      opencodeMcp = JSON.parse(openCodeMcpText);
    } catch {
      throw new Error("mcp/opencode.json is not valid JSON");
    }
  }
  let codexMcp: unknown;
  const codexMcpSource = path.join(root, "mcp", "codex.json");
  let codexMcpText: string | undefined;
  try {
    codexMcpText = await fs.readFile(codexMcpSource, "utf8");
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (codexMcpText !== undefined) {
    try {
      codexMcp = JSON.parse(codexMcpText);
    } catch {
      throw new Error("mcp/codex.json is not valid JSON");
    }
  }
  return {
    invariants: await readInstruction(instructionPath("invariant.md")),
    preferences: await readInstruction(instructionPath("preferences.md")),
    technologyDefaults: await readInstruction(
      instructionPath("technology-defaults.md"),
    ),
    harnessInstructions,
    piAppendSystem,
    antigravityMcp,
    codexMcp,
    opencodeMcp,
    agents: resources.agents === false ? [] : await loadAgentSources(root),
  };
}
