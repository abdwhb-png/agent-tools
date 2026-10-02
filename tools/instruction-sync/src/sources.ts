import fs from "node:fs/promises";
import path from "node:path";

export const HARNESS_NAMES = ["pi", "codex", "vscode", "zed"] as const;
export type HarnessName = (typeof HARNESS_NAMES)[number];

export interface CanonicalSources {
  invariants: string;
  preferences: string;
  technologyDefaults: string;
  harnessInstructions: Record<HarnessName, { system: string[]; agents: string[] }>;
  piAppendSystem: string;
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

async function loadInstructionModules(directory: string): Promise<string[]> {
  const entries = await readOptionalDirectory(directory);
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  return Promise.all(
    filenames.map((filename) => readInstruction(path.join(directory, filename))),
  );
}

export async function loadCanonicalSources(root: string): Promise<CanonicalSources> {
  const instructionPath = (...parts: string[]) =>
    path.join(root, "instructions", ...parts);
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
            system: await loadInstructionModules(instructionPath(harness, "system")),
            agents: await loadInstructionModules(instructionPath(harness, "agents")),
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
  return {
    invariants: await readInstruction(instructionPath("invariant.md")),
    preferences: await readInstruction(instructionPath("preferences.md")),
    technologyDefaults: await readInstruction(
      instructionPath("technology-defaults.md"),
    ),
    harnessInstructions,
    piAppendSystem,
  };
}
