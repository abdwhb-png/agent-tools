import { TextEncoder } from "node:util";
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

export const ANTIGRAVITY_RULE_BYTE_LIMIT = 24000;const antigravityTriggers = ["always_on", "model_decision", "glob", "manual"] as const;
export type AntigravityRuleTrigger = (typeof antigravityTriggers)[number];

export interface AntigravityRuleFrontmatter {
  trigger: AntigravityRuleTrigger;
  description?: string;
  globs?: string;
}

export function renderMcpConfig(value: unknown, label: string): string {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const servers = (value as Record<string, unknown>).mcpServers;
  if (servers === null || typeof servers !== "object" || Array.isArray(servers))
    throw new Error(`${label}.mcpServers must be an object`);
  const secretKeys = new Set(["apikey", "token", "secret", "password"]);
  const assertNoSecrets = (entry: unknown, entryLabel: string): void => {
    if (entry === null || typeof entry !== "object") return;
    for (const [key, nested] of Object.entries(entry as Record<string, unknown>)) {
      if (secretKeys.has(key.toLowerCase()))
        throw new Error(`${entryLabel} contains a secret-like key: ${key}`);
      assertNoSecrets(nested, `${entryLabel}.${key}`);
    }
  };
  const sortedServers: Record<string, unknown> = {};
  for (const name of Object.keys(servers as Record<string, unknown>).sort()) {
    const server = (servers as Record<string, unknown>)[name];
    if (server === null || typeof server !== "object" || Array.isArray(server))
      throw new Error(`${label}.mcpServers.${name} must be a server object`);
    assertNoSecrets(server, `${label}.mcpServers.${name}`);
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(server as Record<string, unknown>).sort()) {
      sorted[key] = (server as Record<string, unknown>)[key];
    }
    sortedServers[name] = sorted;
  }
  return `${JSON.stringify({ mcpServers: sortedServers }, null, 2)}\n`;
}

export function assertAntigravityRuleSize(content: string, label: string): string {
  const bytes = new TextEncoder().encode(content).byteLength;
  if (bytes > ANTIGRAVITY_RULE_BYTE_LIMIT) {
    throw new Error(
      `Antigravity target ${label} (${bytes} bytes) exceeds Antigravity ${ANTIGRAVITY_RULE_BYTE_LIMIT}-byte rule limit`,
    );
  }
  return content;
}

export function renderAntigravityRule(
  frontmatter: AntigravityRuleFrontmatter,
  body: string,
  label = "antigravity-rule",
): string {
  if (!antigravityTriggers.includes(frontmatter.trigger)) {
    throw new Error(
      `Antigravity rule ${label} trigger must be one of ${antigravityTriggers.join(", ")}`,
    );
  }
  if (frontmatter.trigger === "model_decision" && !frontmatter.description?.trim()) {
    throw new Error(`Antigravity rule ${label} with trigger model_decision requires description`);
  }
  if (frontmatter.trigger === "glob" && !frontmatter.globs?.trim()) {
    throw new Error(`Antigravity rule ${label} with trigger glob requires globs`);
  }
  const fields: Record<string, string> = { trigger: frontmatter.trigger };
  if (frontmatter.globs !== undefined) fields.globs = frontmatter.globs;
  if (frontmatter.description !== undefined) fields.description = frontmatter.description;
  const header = Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  const normalized = normalizeInstruction(body);
  const rendered = `---\n${header}\n---\n\n${normalized}`;
  return assertAntigravityRuleSize(rendered, label);
}

export const CODEX_BEGIN = "# >>> agent-policy developer_instructions >>>";
export const CODEX_END = "# <<< agent-policy developer_instructions <<<";

const CODEX_ASSIGNMENT = /^developer_instructions\s*=\s*"""\n[\s\S]*?^"""\n?/gm;

function codexAssignmentBounds(config: string): { start: number; end: number } | undefined {
  let found: { start: number; end: number } | undefined;
  for (const match of config.matchAll(CODEX_ASSIGNMENT)) {
    if (found) throw new Error("Codex managed-region delimiters are malformed");
    found = { start: match.index, end: match.index + match[0].length };
  }
  return found;
}

function stripCodexMarkers(config: string): string {
  return config
    .split("\n")
    .filter((line) => line !== CODEX_BEGIN && line !== CODEX_END)
    .join("\n");
}

export function renderCodexBlock(instructions: string): string {
  const normalized = normalizeInstruction(instructions).trimEnd();
  if (normalized.includes('"""')) throw new Error("canonical Codex instructions cannot contain a TOML multiline-string delimiter");
  return `${CODEX_BEGIN}\ndeveloper_instructions = \"\"\"\n${normalized}\n\"\"\"\n${CODEX_END}\n`;
}

export function managedCodexBlock(config: string): string | undefined {
  const normalized = normalizeInstruction(config);
  if (!normalized.includes(CODEX_BEGIN) && !normalized.includes(CODEX_END)) return undefined;
  const bounds = codexAssignmentBounds(normalized);
  if (bounds === undefined) throw new Error("Codex managed-region delimiters are malformed");
  const assignment = normalized.slice(bounds.start, bounds.end).replace(/\n?$/, "\n");
  return `${CODEX_BEGIN}\n${assignment}${CODEX_END}\n`;
}

export function renderCodexConfig(existing: string | undefined, instructions: string, adoptUnmanaged = false): { desired: string; owned: string } {
  const block = renderCodexBlock(instructions);
  if (existing === undefined) return { desired: block, owned: block };
  const normalized = normalizeInstruction(existing);
  if (normalized.includes(CODEX_BEGIN) || normalized.includes(CODEX_END)) {
    const stripped = stripCodexMarkers(normalized);
    const bounds = codexAssignmentBounds(stripped);
    if (bounds === undefined) throw new Error("Codex managed-region delimiters are malformed");
    return {
      desired: `${stripped.slice(0, bounds.start)}${block}${stripped.slice(bounds.end)}`,
      owned: block,
    };
  }
  const bounds = codexAssignmentBounds(normalized);
  if (bounds !== undefined) {
    if (!adoptUnmanaged) throw new Error("Codex developer_instructions is unmanaged; run adopt explicitly before sync");
    return {
      desired: `${normalized.slice(0, bounds.start)}${block}${normalized.slice(bounds.end)}`,
      owned: block,
    };
  }
  return { desired: `${normalized.trimEnd()}\n\n${block}`, owned: block };
}
