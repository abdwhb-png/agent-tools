import { TextEncoder } from "node:util";
import {
  tomlKey,
  tomlValue,
  validateCodexMcp,
  type NativeValue,
} from "./agents.js";
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

const SECRET_KEYS = new Set(["apikey", "token", "secret", "password"]);
const SECRET_KEY_PATTERN = /(api[-_]?key|token|secret|password|authorization)/i;
// Codex fields that hold environment variable names, never secret values.
const ENV_REFERENCE_KEYS = new Set(["bearer_token_env_var", "env_http_headers", "env_vars"]);
const ENV_REFERENCE_VALUE = /^(?:\$\{[A-Za-z_][A-Za-z0-9_]*\}|\{env:[A-Za-z_][A-Za-z0-9_]*\})$/;

function assertNoSecretKeys(entry: unknown, entryLabel: string): void {
  if (entry === null || typeof entry !== "object") return;
  for (const [key, nested] of Object.entries(entry as Record<string, unknown>)) {
    if (ENV_REFERENCE_KEYS.has(key)) continue;
    if (SECRET_KEYS.has(key.toLowerCase()))
      throw new Error(`${entryLabel} contains a secret-like key: ${key}`);
    if (
      SECRET_KEY_PATTERN.test(key) &&
      typeof nested === "string" &&
      !ENV_REFERENCE_VALUE.test(nested)
    )
      throw new Error(
        `${entryLabel} contains a secret-like key with a literal value: ${key}; use an environment reference`,
      );
    assertNoSecretKeys(nested, `${entryLabel}.${key}`);
  }
}

export function renderMcpConfig(value: unknown, label: string): string {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const servers = (value as Record<string, unknown>).mcpServers;
  if (servers === null || typeof servers !== "object" || Array.isArray(servers))
    throw new Error(`${label}.mcpServers must be an object`);
  const sortedServers: Record<string, unknown> = {};
  for (const name of Object.keys(servers as Record<string, unknown>).sort()) {
    const server = (servers as Record<string, unknown>)[name];
    if (server === null || typeof server !== "object" || Array.isArray(server))
      throw new Error(`${label}.mcpServers.${name} must be a server object`);
    assertNoSecretKeys(server, `${label}.mcpServers.${name}`);
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
export const CODEX_MCP_BEGIN = "# >>> agent-policy mcp_servers >>>";
export const CODEX_MCP_END = "# <<< agent-policy mcp_servers <<<";

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

function codexMcpMarkers(lines: string[]): { begin: number; end: number } | undefined {
  const begins = lines.flatMap((line, index) =>
    line.trim() === CODEX_MCP_BEGIN ? [index] : [],
  );
  const ends = lines.flatMap((line, index) =>
    line.trim() === CODEX_MCP_END ? [index] : [],
  );
  if (!begins.length && !ends.length) return undefined;
  if (begins.length !== 1 || ends.length !== 1 || ends[0] < begins[0])
    throw new Error("Codex mcp_servers managed-region delimiters are malformed");
  return { begin: begins[0], end: ends[0] };
}

export function parseCodexMcp(
  value: unknown,
  label = "mcp/codex.json",
): Record<string, NativeValue> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const root = value as Record<string, unknown>;
  for (const key of Object.keys(root))
    if (key !== "mcp_servers")
      throw new Error(`${label}.${key} is unsupported by harness-sync`);
  const servers = root.mcp_servers;
  if (servers === null || typeof servers !== "object" || Array.isArray(servers))
    throw new Error(`${label}.mcp_servers must be an object`);
  return servers as Record<string, NativeValue>;
}

export function renderCodexMcpBlock(mcpServers: unknown): string {
  validateCodexMcp(mcpServers, "Codex mcp_servers");
  const servers = mcpServers as Record<string, Record<string, NativeValue>>;
  const tables: string[] = [];
  for (const name of Object.keys(servers).sort()) {
    const server = servers[name];
    if (!server || typeof server !== "object" || Array.isArray(server))
      throw new Error(`Codex mcp_servers.${name} must be a server object`);
    if (server.command === undefined && server.url === undefined)
      throw new Error(`Codex mcp_servers.${name} requires command or url`);
    assertNoSecretKeys(server, `Codex mcp_servers.${name}`);
    const fields = Object.keys(server)
      .sort()
      .map((key) => `${tomlKey(key)} = ${tomlValue(server[key])}`);
    tables.push(`[mcp_servers.${tomlKey(name)}]\n${fields.join("\n")}`);
  }
  return `${CODEX_MCP_BEGIN}\n${tables.join("\n\n")}${tables.length ? "\n" : ""}${CODEX_MCP_END}\n`;
}

export function managedCodexMcpBlock(config: string): string | undefined {
  const normalized = normalizeInstruction(config);
  if (!normalized.includes(CODEX_MCP_BEGIN) && !normalized.includes(CODEX_MCP_END))
    return undefined;
  const lines = normalized.replace(/\n$/, "").split("\n");
  const markers = codexMcpMarkers(lines)!;
  return `${lines.slice(markers.begin, markers.end + 1).join("\n")}\n`;
}

function composeCodexOwned(instructions: string, mcpServers: string | undefined): string {
  return mcpServers === undefined ? instructions : `${instructions}\u0000${mcpServers}`;
}

export function managedCodexContent(config: string): string | undefined {
  const instructions = managedCodexBlock(config);
  if (instructions === undefined) return undefined;
  return composeCodexOwned(instructions, managedCodexMcpBlock(config));
}

function parseTomlKeyPath(value: string): string[] | undefined {
  const keys: string[] = [];
  let index = 0;
  while (index < value.length) {
    while (value[index] === " " || value[index] === "\t") index += 1;
    if (index >= value.length) break;
    let key = "";
    if (value[index] === '"') {
      index += 1;
      let escaped = false;
      while (index < value.length) {
        const character = value[index++];
        if (escaped) {
          key += character;
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          break;
        } else key += character;
      }
    } else if (value[index] === "'") {
      index += 1;
      while (index < value.length) {
        const character = value[index++];
        if (character === "'") break;
        key += character;
      }
    } else {
      const start = index;
      while (
        index < value.length &&
        value[index] !== "." &&
        value[index] !== " " &&
        value[index] !== "\t"
      )
        index += 1;
      key = value.slice(start, index);
    }
    if (!key) return undefined;
    keys.push(key);
    while (value[index] === " " || value[index] === "\t") index += 1;
    if (index >= value.length) break;
    if (value[index] !== ".") return undefined;
    index += 1;
  }
  return keys.length ? keys : undefined;
}

interface CodexMcpTableSpan {
  name: string;
  start: number;
  end: number;
}

const CODEX_MARKERS = new Set([CODEX_BEGIN, CODEX_END, CODEX_MCP_BEGIN, CODEX_MCP_END]);

/**
 * Lines that carry TOML structure: managed-region markers and anything that is
 * neither inside a multiline string nor a comment. Comments are skipped so a
 * quoted delimiter inside one cannot desynchronize multiline tracking.
 */
function structuralCodexLines(lines: string[]): { index: number; line: string }[] {
  const result: { index: number; line: string }[] = [];
  let multiline: '"""' | "'''" | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (multiline !== undefined) {
      if (line.includes(multiline)) multiline = undefined;
      continue;
    }
    if (CODEX_MARKERS.has(line.trim())) {
      result.push({ index, line });
      continue;
    }
    if (/^\s*#/.test(line)) continue;
    const doubleDelimiter = line.indexOf('"""');
    const singleDelimiter = line.indexOf("'''");
    if (doubleDelimiter !== -1 || singleDelimiter !== -1) {
      const delimiter = doubleDelimiter !== -1 ? '"""' : "'''";
      if ((line.split(delimiter).length - 1) % 2 === 1) multiline = delimiter;
      continue;
    }
    result.push({ index, line });
  }
  return result;
}

const TOML_TABLE_HEADER = /^\s*\[\[?(.+?)\]\]?\s*(?:#.*)?$/;

function firstCodexTableIndex(lines: string[]): number | undefined {
  return structuralCodexLines(lines).find(
    ({ line }) => line.trim() === CODEX_MCP_BEGIN || TOML_TABLE_HEADER.test(line),
  )?.index;
}

function codexMcpTableSpans(lines: string[]): CodexMcpTableSpan[] {
  const spans: CodexMcpTableSpan[] = [];
  let current: CodexMcpTableSpan | undefined;
  const close = (index: number): void => {
    if (current === undefined) return;
    current.end = index - 1;
    spans.push(current);
    current = undefined;
  };
  for (const { index, line } of structuralCodexLines(lines)) {
    if (CODEX_MARKERS.has(line.trim())) {
      close(index);
      continue;
    }
    const header = TOML_TABLE_HEADER.exec(line);
    if (!header) continue;
    close(index);
    const keys = parseTomlKeyPath(header[1].trim());
    if (keys?.[0] === "mcp_servers")
      current = { name: keys[1] ?? "", start: index, end: index };
  }
  if (current !== undefined) {
    (current as CodexMcpTableSpan).end = lines.length - 1;
    spans.push(current);
  }
  return spans;
}

function removeCodexSpans(config: string, spans: CodexMcpTableSpan[]): string {
  const normalized = normalizeInstruction(config).replace(/\n$/, "");
  const lines = normalized.split("\n");
  const remove = new Set<number>();
  for (const span of spans)
    for (let index = span.start; index <= span.end; index += 1) remove.add(index);
  return `${lines.filter((_, index) => !remove.has(index)).join("\n")}\n`;
}

function appendCodexMcpBlock(config: string, block: string): string {
  const normalized = normalizeInstruction(config).trimEnd();
  return normalized === "" ? block : `${normalized}\n\n${block}`;
}

function replaceCodexMcpBlock(config: string, block: string): string {
  const normalized = normalizeInstruction(config).replace(/\n$/, "");
  const lines = normalized.split("\n");
  const markers = codexMcpMarkers(lines)!;
  const blockLines = block.replace(/\n$/, "").split("\n");
  return `${[
    ...lines.slice(0, markers.begin),
    ...blockLines,
    ...lines.slice(markers.end + 1),
  ].join("\n")}\n`;
}

function renderCodexDeveloperRegion(
  existing: string | undefined,
  block: string,
  adoptUnmanaged: boolean,
): string {
  if (existing === undefined) return block;
  const normalized = normalizeInstruction(existing);
  if (normalized.includes(CODEX_BEGIN) || normalized.includes(CODEX_END)) {
    const stripped = stripCodexMarkers(normalized);
    const bounds = codexAssignmentBounds(stripped);
    if (bounds === undefined) throw new Error("Codex managed-region delimiters are malformed");
    return `${stripped.slice(0, bounds.start)}${block}${stripped.slice(bounds.end)}`;
  }
  const bounds = codexAssignmentBounds(normalized);
  if (bounds !== undefined) {
    if (!adoptUnmanaged)
      throw new Error("Codex developer_instructions is unmanaged; run adopt explicitly before sync");
    return `${normalized.slice(0, bounds.start)}${block}${normalized.slice(bounds.end)}`;
  }
  // developer_instructions must be a root key: appended after a [table] header it
  // would be scoped to that table, so insert it before the first table instead.
  const lines = normalized.replace(/\n$/, "").split("\n");
  const boundary = firstCodexTableIndex(lines);
  if (boundary === undefined) return `${normalized.trimEnd()}\n\n${block}`;
  const head = lines.slice(0, boundary).join("\n").trimEnd();
  const tail = lines.slice(boundary).join("\n");
  return `${head === "" ? "" : `${head}\n\n`}${block}\n${tail}\n`;
}

export function renderCodexConfig(
  existing: string | undefined,
  instructions: string,
  adoptUnmanaged = false,
  mcpServers?: unknown,
): { desired: string; owned: string; unmanaged?: boolean } {
  const block = renderCodexBlock(instructions);
  let desired = renderCodexDeveloperRegion(existing, block, adoptUnmanaged);
  if (mcpServers === undefined) {
    const managedMcp = managedCodexMcpBlock(desired);
    return { desired, owned: composeCodexOwned(block, managedMcp) };
  }
  const mcpBlock = renderCodexMcpBlock(mcpServers);
  const canonicalNames = new Set(Object.keys(mcpServers as Record<string, unknown>));
  const lines = normalizeInstruction(desired).replace(/\n$/, "").split("\n");
  const markers = codexMcpMarkers(lines);
  const spans = codexMcpTableSpans(lines);
  const collisions = spans.filter(
    (span) =>
      (canonicalNames.has(span.name) || span.name === "") &&
      (markers === undefined || span.start < markers.begin || span.end > markers.end),
  );
  const unmanaged = collisions.length > 0;
  if (unmanaged && !adoptUnmanaged)
    throw new Error(
      "Codex mcp_servers contains unmanaged canonical-name tables; run adopt explicitly before sync",
    );
  if (unmanaged) desired = removeCodexSpans(desired, collisions);
  const hasMarkers = codexMcpMarkers(
    normalizeInstruction(desired).replace(/\n$/, "").split("\n"),
  );
  desired = hasMarkers
    ? replaceCodexMcpBlock(desired, mcpBlock)
    : appendCodexMcpBlock(desired, mcpBlock);
  return {
    desired,
    owned: composeCodexOwned(block, mcpBlock),
    ...(unmanaged ? { unmanaged: true } : {}),
  };
}
