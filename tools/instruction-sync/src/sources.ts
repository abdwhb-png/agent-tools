import fs from "node:fs/promises";
import path from "node:path";

export const HARNESS_NAMES = ["pi", "codex", "vscode", "zed"] as const;
export type HarnessName = (typeof HARNESS_NAMES)[number];

export interface CanonicalSources {
  invariants: string;
  preferences: string;
  technologyDefaults: string;
  harnessInstructions: Record<HarnessName, string[]>;
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

async function loadHarnessInstructions(
  root: string,
  harness: HarnessName,
): Promise<string[]> {
  const directory = path.join(root, "instructions", harness);
  let entries: Array<{ isFile(): boolean; name: string }> = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
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
      HARNESS_NAMES.map(async (harness) => [
        harness,
        await loadHarnessInstructions(root, harness),
      ]),
    ),
  ) as Record<HarnessName, string[]>;
  return {
    invariants: await readInstruction(instructionPath("invariant.md")),
    preferences: await readInstruction(instructionPath("preferences.md")),
    technologyDefaults: await readInstruction(
      instructionPath("technology-defaults.md"),
    ),
    harnessInstructions,
  };
}
