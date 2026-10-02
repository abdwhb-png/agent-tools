import {
  composeInstructions,
  HARNESS_NAMES,
  normalizeInstruction,
  type InstructionModule,
} from "./sources.js";

const reservedModuleTag = new RegExp(
  `<\\/?(?:${HARNESS_NAMES.join("|")})_(?:system|agents)_[A-Za-z0-9_]+(?=[\\s/>])`,
);

export function renderInstructionModules(modules: InstructionModule[]): string {
  const rendered: string[] = [];
  const tagSources = new Map<string, string>();
  for (const module of modules) {
    const content = normalizeInstruction(module.content).trimEnd();
    if (!content) continue;
    if (reservedModuleTag.test(content)) {
      throw new Error(`instruction source ${module.source} contains a reserved module tag`);
    }
    const tag = module.source
      .replace(/\.md$/, "")
      .replace(/[^A-Za-z0-9_]/g, "_");
    const previousSource = tagSources.get(tag);
    if (previousSource !== undefined) {
      throw new Error(`instruction sources ${previousSource} and ${module.source} produce duplicate module tag ${tag}`);
    }
    tagSources.set(tag, module.source);
    rendered.push(`<${tag}>\n\n${content}\n\n</${tag}>`);
  }
  return composeInstructions(rendered);
}

export function renderVsCode(
  invariants: string,
  preferences: string,
): string {
  const sections = [
    `<!-- agent-policy: invariants -->\n${normalizeInstruction(invariants).trimEnd()}`,
    `<!-- agent-policy: preferences -->\n${normalizeInstruction(preferences).trimEnd()}`,
  ];
  return [
    "---",
    'applyTo: "**"',
    "---",
    "",
    sections.join("\n\n"),
    "",
  ].join("\n");
}

export const CODEX_BEGIN = "# >>> agent-policy developer_instructions >>>";
export const CODEX_END = "# <<< agent-policy developer_instructions <<<";

export function renderCodexBlock(instructions: string): string {
  const normalized = normalizeInstruction(instructions).trimEnd();
  if (normalized.includes('"""')) throw new Error("canonical Codex instructions cannot contain a TOML multiline-string delimiter");
  return `${CODEX_BEGIN}\ndeveloper_instructions = \"\"\"\n${normalized}\n\"\"\"\n${CODEX_END}\n`;
}

export function managedCodexBlock(config: string): string | undefined {
  const normalized = normalizeInstruction(config);
  const start = normalized.indexOf(CODEX_BEGIN);
  const end = normalized.indexOf(CODEX_END);
  if (start < 0 && end < 0) return undefined;
  if (start < 0 || end < 0 || end < start) throw new Error("Codex managed-region delimiters are malformed");
  const trailing = end + CODEX_END.length;
  if (normalized.slice(trailing).startsWith("\n")) return normalized.slice(start, trailing + 1);
  return normalized.slice(start, trailing);
}

export function renderCodexConfig(existing: string | undefined, instructions: string, adoptUnmanaged = false): { desired: string; owned: string } {
  const block = renderCodexBlock(instructions);
  if (existing === undefined) return { desired: block, owned: block };
  const normalized = normalizeInstruction(existing);
  const managed = managedCodexBlock(normalized);
  if (managed !== undefined) {
    return { desired: normalized.replace(managed, block), owned: block };
  }
  if (/^developer_instructions\s*=/m.test(normalized)) {
    if (adoptUnmanaged) {
      const assignment = /^developer_instructions\s*=\s*"""\n[\s\S]*?^"""\n?/m.exec(normalized);
      if (!assignment) throw new Error("unmanaged Codex developer_instructions is not a supported multiline TOML string");
      return { desired: normalized.replace(assignment[0], block), owned: block };
    }
    throw new Error("Codex developer_instructions is unmanaged; run adopt explicitly before sync");
  }
  return { desired: `${normalized.trimEnd()}\n\n${block}`, owned: block };
}
