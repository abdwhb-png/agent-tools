export const OPENCODE_MCP_BEGIN = "// >>> agent-policy mcp servers >>>";
export const OPENCODE_MCP_END = "// <<< agent-policy mcp servers <<<";
const OPENCODE_SCHEMA = "https://opencode.ai/config.json";
const OPENCODE_SERVERS_SENTINEL = "__AGENT_POLICY_OPENCODE_MCP_SERVERS__";

export interface OpenCodeConfigRender {
  desired: string;
  owned: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) throw new Error(`${label} must be an object`);
  return value;
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label}.${key} is unsupported by harness-sync`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  if (!value.isWellFormed()) throw new Error(`${label} contains invalid Unicode`);
}

function assertStrings(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
    throw new Error(`${label} must be an array of strings`);
}

function normalizeText(value: string): string {
  const normalized = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  return normalized === "" ? "" : normalized.replace(/\n*$/, "\n");
}

function stripComments(value: string): string {
  let output = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];
    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
        output += character;
      } else output += " ";
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        output += "  ";
        index += 1;
      } else output += character === "\n" ? "\n" : " ";
      continue;
    }
    if (inString) {
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      output += "  ";
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      output += "  ";
      index += 1;
      continue;
    }
    output += character;
  }
  return output;
}

function removeTrailingCommas(value: string): string {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }
    if (character === ",") {
      let lookahead = index + 1;
      while (lookahead < value.length && /\s/.test(value[lookahead])) lookahead += 1;
      if (value[lookahead] === "}" || value[lookahead] === "]") continue;
    }
    output += character;
  }
  return output;
}

export function parseJsonc(value: string, label = "OpenCode configuration"): unknown {
  try {
    return JSON.parse(removeTrailingCommas(stripComments(value.replace(/^\uFEFF/, ""))));
  } catch {
    throw new Error(`${label} is not valid JSON or JSONC`);
  }
}

const openCodeProtocols = ["legacy", "auto", "2026-07-28"] as const;
const openCodeServerTypes = ["local", "remote"] as const;
const timeoutKeys = ["startup", "catalog", "execution"] as const;
const oauthKeys = [
  "client_id",
  "client_secret",
  "scope",
  "callback_port",
  "redirect_uri",
  "auth_server_metadata_url",
] as const;
const secretName = /(api[-_]?key|token|secret|password|authorization)/i;
const envReference = /\{env:[A-Za-z_][A-Za-z0-9_]*\}/;

function assertNoLiteralSecrets(value: unknown, label: string): void {
  const entries = assertObject(value, label);
  for (const [name, entry] of Object.entries(entries)) {
    assertString(entry, `${label}.${name}`);
    if (secretName.test(name) && !envReference.test(entry))
      throw new Error(`${label}.${name} must use a {env:NAME} reference instead of a literal secret`);
  }
}

function validateTimeout(value: unknown, label: string): void {
  const timeout = assertObject(value, label);
  assertKeys(timeout, timeoutKeys, label);
  for (const [key, entry] of Object.entries(timeout)) {
    if (!Number.isInteger(entry) || (entry as number) <= 0)
      throw new Error(`${label}.${key} must be a positive integer`);
  }
}

function validateCommonServerFields(server: Record<string, unknown>, label: string): void {
  for (const key of ["disabled", "codemode", "pool"] as const) {
    if (server[key] !== undefined && typeof server[key] !== "boolean")
      throw new Error(`${label}.${key} must be boolean`);
  }
  if (server.timeout !== undefined) validateTimeout(server.timeout, `${label}.timeout`);
  if (server.protocol !== undefined) {
    if (
      typeof server.protocol !== "string" ||
      !openCodeProtocols.includes(server.protocol as (typeof openCodeProtocols)[number])
    )
      throw new Error(`${label}.protocol must be one of ${openCodeProtocols.join(", ")}`);
  }
}

function validateOpenCodeServer(value: unknown, label: string): void {
  const server = assertObject(value, label);
  if (server.type === undefined) throw new Error(`${label}.type is required`);
  if (
    typeof server.type !== "string" ||
    !openCodeServerTypes.includes(server.type as (typeof openCodeServerTypes)[number])
  )
    throw new Error(`${label}.type must be local or remote`);
  const common = ["type", "disabled", "codemode", "timeout", "protocol", "pool"];
  if (server.type === "local") {
    assertKeys(server, [...common, "command", "cwd", "environment"], label);
    assertStrings(server.command, `${label}.command`);
    if (!server.command.length || server.command.some((entry) => !entry.trim()))
      throw new Error(`${label}.command must contain at least one nonempty argument`);
    if (server.cwd !== undefined) assertString(server.cwd, `${label}.cwd`);
    if (server.environment !== undefined)
      assertNoLiteralSecrets(server.environment, `${label}.environment`);
  } else {
    assertKeys(server, [...common, "url", "headers", "oauth"], label);
    assertString(server.url, `${label}.url`);
    try {
      const url = new URL(server.url);
      if (url.protocol !== "http:" && url.protocol !== "https:")
        throw new Error("unsupported protocol");
    } catch {
      throw new Error(`${label}.url must be an absolute HTTP(S) URL`);
    }
    if (server.headers !== undefined)
      assertNoLiteralSecrets(server.headers, `${label}.headers`);
    if (server.oauth !== undefined && server.oauth !== false) {
      const oauth = assertObject(server.oauth, `${label}.oauth`);
      assertKeys(oauth, oauthKeys, `${label}.oauth`);
      for (const key of oauthKeys) {
        if (oauth[key] === undefined) continue;
        const entryLabel = `${label}.oauth.${key}`;
        if (key === "callback_port") {
          if (
            !Number.isInteger(oauth[key]) ||
            (oauth[key] as number) < 1 ||
            (oauth[key] as number) > 65535
          )
            throw new Error(`${entryLabel} must be a port between 1 and 65535`);
        } else {
          assertString(oauth[key], entryLabel);
        }
      }
      if (oauth.client_secret !== undefined && !envReference.test(oauth.client_secret as string))
        throw new Error(`${label}.oauth.client_secret must use a {env:NAME} reference`);
    }
  }
  validateCommonServerFields(server, label);
}

export function parseOpenCodeMcp(value: unknown, label = "mcp/opencode.json"): Record<string, unknown> {
  const root = assertObject(value, label);
  assertKeys(root, ["mcp"], label);
  const mcp = assertObject(root.mcp, `${label}.mcp`);
  assertKeys(mcp, ["servers"], `${label}.mcp`);
  const servers = assertObject(mcp.servers, `${label}.mcp.servers`);
  const sorted: Record<string, unknown> = {};
  for (const name of Object.keys(servers).sort()) {
    const server = servers[name];
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name))
      throw new Error(`${label}.mcp.servers.${name} must use a safe server name`);
    validateOpenCodeServer(server, `${label}.mcp.servers.${name}`);
    sorted[name] = server;
  }
  return sorted;
}

function markerIndices(lines: string[]): { begin: number; end: number } | undefined {
  const begins = lines.flatMap((line, index) => (line.trim() === OPENCODE_MCP_BEGIN ? [index] : []));
  const ends = lines.flatMap((line, index) => (line.trim() === OPENCODE_MCP_END ? [index] : []));
  if (!begins.length && !ends.length) return undefined;
  if (begins.length !== 1 || ends.length !== 1 || ends[0] < begins[0])
    throw new Error("OpenCode managed MCP markers are malformed");
  return { begin: begins[0], end: ends[0] };
}

function renderBlock(
  servers: Record<string, unknown>,
  indent: string,
  comma = "",
): string {
  const serialized = JSON.stringify(servers, null, 2);
  const entries = serialized
    .split("\n")
    .slice(1, -1)
    .map((line) => `${indent}${line}`);
  return [
    `${indent}${OPENCODE_MCP_BEGIN}`,
    `${indent}"servers": {`,
    ...entries,
    `${indent}}${comma}`,
    `${indent}${OPENCODE_MCP_END}`,
  ].join("\n");
}

export function managedOpenCodeBlock(
  existing: string,
  jsonc: boolean,
): string | undefined {
  if (jsonc) {
    const normalized = normalizeText(existing).replace(/\n$/, "");
    const markers = markerIndices(normalized.split("\n"));
    if (markers === undefined) return undefined;
    const lines = normalized.split("\n");
    return `${lines.slice(markers.begin, markers.end + 1).join("\n")}\n`;
  }
  const root = assertObject(parseJsonc(existing), "OpenCode configuration");
  const mcp = root.mcp;
  if (mcp === undefined) return undefined;
  if (!isObject(mcp)) throw new Error("OpenCode mcp must be an object");
  if (mcp.servers === undefined) return undefined;
  if (!isObject(mcp.servers)) throw new Error("OpenCode mcp.servers must be an object");
  return `${JSON.stringify(mcp.servers, null, 2)}\n`;
}

function createMarkedConfig(servers: Record<string, unknown>): OpenCodeConfigRender {
  const block = renderBlock(servers, "    ");
  return {
    desired: `{\n  "$schema": "${OPENCODE_SCHEMA}",\n  "mcp": {\n${block}\n  }\n}\n`,
    owned: `${block}\n`,
  };
}

function replaceMarkedBlock(
  existing: string,
  servers: Record<string, unknown>,
): OpenCodeConfigRender {
  const normalized = normalizeText(existing).replace(/\n$/, "");
  const lines = normalized.split("\n");
  const markers = markerIndices(lines)!;
  const indent = /^\s*/.exec(lines[markers.begin])![0];
  const closing = [...lines.slice(markers.begin, markers.end)]
    .reverse()
    .find((line) => line.trim() && !line.trim().startsWith("//"));
  const comma = closing && /,\s*$/.test(closing) ? "," : "";
  const block = renderBlock(servers, indent, comma);
  const desired = [
    ...lines.slice(0, markers.begin),
    ...block.split("\n"),
    ...lines.slice(markers.end + 1),
  ].join("\n");
  return { desired: `${desired}\n`, owned: `${block}\n` };
}

function adoptMarkedConfig(
  existing: string,
  servers: Record<string, unknown>,
): OpenCodeConfigRender {
  const root = assertObject(parseJsonc(existing), "OpenCode configuration");
  const copy = JSON.parse(JSON.stringify(root)) as Record<string, unknown>;
  if (copy.mcp !== undefined && !isObject(copy.mcp))
    throw new Error("OpenCode mcp must be an object");
  copy.mcp = { ...(isObject(copy.mcp) ? copy.mcp : {}), servers: OPENCODE_SERVERS_SENTINEL };
  const lines = `${JSON.stringify(copy, null, 2)}\n`.replace(/\n$/, "").split("\n");
  const index = lines.findIndex((line) =>
    line.includes(`"servers": "${OPENCODE_SERVERS_SENTINEL}"`),
  );
  if (index === -1) throw new Error("OpenCode mcp.servers could not be prepared for adoption");
  const match = /^(\s*)"servers": "__AGENT_POLICY_OPENCODE_MCP_SERVERS__"(,?)$/.exec(
    lines[index],
  );
  if (!match) throw new Error("OpenCode mcp.servers could not be prepared for adoption");
  const indent = match[1];
  const comma = match[2];
  const block = renderBlock(servers, indent, comma);
  lines.splice(index, 1, ...block.split("\n"));
  return { desired: `${lines.join("\n")}\n`, owned: `${block}\n` };
}

function renderJsonConfig(
  existing: string | undefined,
  servers: Record<string, unknown>,
  adoptUnmanaged: boolean,
): OpenCodeConfigRender {
  const root = existing === undefined
    ? { $schema: OPENCODE_SCHEMA }
    : assertObject(parseJsonc(existing), "OpenCode configuration");
  const mcp = root.mcp;
  if (mcp !== undefined && !isObject(mcp)) throw new Error("OpenCode mcp must be an object");
  if (mcp?.servers === undefined && existing !== undefined && !adoptUnmanaged)
    throw new Error("OpenCode mcp.servers is unmanaged; run adopt explicitly before sync");
  const next = {
    ...root,
    mcp: { ...(isObject(mcp) ? mcp : {}), servers },
  };
  return {
    desired: `${JSON.stringify(next, null, 2)}\n`,
    owned: `${JSON.stringify(servers, null, 2)}\n`,
  };
}

export function renderOpenCodeConfig(
  existing: string | undefined,
  jsonc: boolean,
  servers: Record<string, unknown>,
  adoptUnmanaged = false,
): OpenCodeConfigRender {
  let rendered: OpenCodeConfigRender;
  if (existing === undefined) {
    rendered = jsonc
      ? createMarkedConfig(servers)
      : renderJsonConfig(undefined, servers, true);
  } else if (!jsonc) {
    rendered = renderJsonConfig(existing, servers, adoptUnmanaged);
  } else {
    const managed = managedOpenCodeBlock(existing, true);
    if (managed !== undefined) rendered = replaceMarkedBlock(existing, servers);
    else if (adoptUnmanaged) rendered = adoptMarkedConfig(existing, servers);
    else throw new Error("OpenCode mcp.servers is unmanaged; run adopt explicitly before sync");
  }
  parseJsonc(rendered.desired, "Rendered OpenCode configuration");
  return rendered;
}
