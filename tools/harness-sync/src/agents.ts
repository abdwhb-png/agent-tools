import fs from "node:fs/promises";
import path from "node:path";
import { composeInstructions, normalizeInstruction } from "./sources.js";

type Scalar = string | number | boolean;
export type NativeValue = Scalar | NativeValue[] | { [key: string]: NativeValue };
export type NativeConfig = Record<string, NativeValue>;
export interface AgentSource {
  id: string;
  description: string;
  role: string;
  pi?: NativeConfig;
  codex?: NativeConfig;
  vscode?: NativeConfig;
  piInstructions: string;
  codexInstructions: string;
  vscodeInstructions?: string;
}

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function assertKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label}.${key} is unsupported by harness-sync`);
  }
}

function assertString(value: unknown, label: string): void {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  if (!value.isWellFormed()) throw new Error(`${label} contains invalid Unicode`);
}

function assertStrings(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) throw new Error(`${label} must be an array of strings`);
}

function validateNativeValue(value: unknown, label: string): void {
  if (typeof value === "string") { assertString(value, label); return; }
  if (typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateNativeValue(entry, `${label}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(assertObject(value, label))) {
    assertString(key, `${label} key`);
    validateNativeValue(entry, `${label}.${key}`);
  }
}

const piLists = new Set(["tools", "excludeTools", "skills", "skill", "skillPath", "allowedAgents", "defaultReads", "aliases", "alias", "extensions", "subagentOnlyExtensions", "mutationTools"]);
const piBooleans = new Set(["inheritProjectContext", "inheritGlobalContext", "inheritSkills", "defaultProgress", "interactive", "async", "advertise", "fast", "allowNestedSubagents", "completionGuard"]);

function validatePi(config: Record<string, unknown>, label: string): void {
  for (const [key, value] of Object.entries(config)) {
    if (!/^[\w-]+$/.test(key)) throw new Error(`${label}.${key} is not a Pi frontmatter key`);
    if (piLists.has(key)) {
      if (Array.isArray(value)) {
        assertStrings(value, `${label}.${key}`);
        if (value.some((item) => !item.trim() || /[,\r\n]/.test(item))) throw new Error(`${label}.${key} contains an unrepresentable list item`);
      } else assertString(value, `${label}.${key}`);
    } else if (piBooleans.has(key)) {
      if (typeof value !== "boolean" && value !== "true" && value !== "false") throw new Error(`${label}.${key} must be boolean`);
    } else if (!["string", "boolean", "number"].includes(typeof value) || value === null) {
      throw new Error(`${label}.${key} must be a scalar; encode extension JSON as a string`);
    }
    if (typeof value === "string" && /\r|\n---/.test(value)) throw new Error(`${label}.${key} contains an unrepresentable frontmatter delimiter`);
    if (typeof value === "string" && value.includes("\n") && /^\s/.test(value)) throw new Error(`${label}.${key} contains unrepresentable leading indentation`);
  }
}

function validateVsCode(config: Record<string, unknown>, label: string): void {
  const strings = ["name", "description", "argument-hint", "fileName"];
  const booleans = ["user-invocable", "disable-model-invocation"];
  assertKeys(config, [...strings, ...booleans, "tools", "agents", "model"], label);
  for (const key of strings) if (config[key] !== undefined) assertString(config[key], `${label}.${key}`);
  if (config.name !== undefined && (!(config.name as string).trim() || /[\x00-\x1f\x7f]/.test(config.name as string)))
    throw new Error(`${label}.name must be a non-empty display name without control characters`);
  if (config.fileName !== undefined && !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.agent\.md$/.test(config.fileName as string))
    throw new Error(`${label}.fileName must be a safe basename ending in .agent.md`);
  for (const key of booleans) if (config[key] !== undefined && typeof config[key] !== "boolean")
    throw new Error(`${label}.${key} must be boolean`);
  for (const key of ["tools", "agents", "model"]) {
    const value = config[key];
    if (value === undefined || (key === "agents" && value === "*")) continue;
    if (key === "model" && typeof value === "string") {
      if (!value.trim()) throw new Error(`${label}.model must not be empty`);
      continue;
    }
    assertStrings(value, `${label}.${key}`);
    if ((key === "model" && value.length === 0) || value.some((item) => !item.trim()))
      throw new Error(`${label}.${key} contains an empty selection`);
  }
  if ((config.agents === "*" || (Array.isArray(config.agents) && config.agents.length > 0)) &&
      Array.isArray(config.tools) && !config.tools.includes("agent"))
    throw new Error(`${label}.agents requires the agent tool in tools`);
}

const codexStrings = ["name", "description", "model", "model_provider", "model_reasoning_effort", "model_reasoning_summary", "model_verbosity", "sandbox_mode", "service_tier", "web_search"];
const mcpStrings = ["command", "cwd", "url", "auth", "bearer_token_env_var", "http_headers_helper", "default_tools_approval_mode", "oauth_resource", "experimental_environment"];
const mcpLists = ["args", "enabled_tools", "disabled_tools", "scopes"];
const mcpNumbers = ["startup_timeout_sec", "startup_timeout_ms", "tool_timeout_sec"];
const approvalModes = ["auto", "prompt", "writes", "approve"];

function assertOneOf(value: unknown, allowed: string[], label: string): void {
  if (typeof value !== "string" || !allowed.includes(value)) throw new Error(`${label} must be one of ${allowed.join(", ")}`);
}

function validateMcp(value: unknown, label: string): void {
  for (const [name, raw] of Object.entries(assertObject(value, label))) {
    const serverLabel = `${label}.${name}`;
    const server = assertObject(raw, serverLabel);
    assertKeys(server, [...mcpStrings, ...mcpLists, ...mcpNumbers, "env", "env_vars", "http_headers", "env_http_headers", "enabled", "required", "tools", "oauth"], serverLabel);
    for (const [key, entry] of Object.entries(server)) {
      const field = `${serverLabel}.${key}`;
      if (mcpStrings.includes(key)) assertString(entry, field);
      else if (mcpLists.includes(key)) assertStrings(entry, field);
      else if (mcpNumbers.includes(key)) {
        if (typeof entry !== "number" || entry < 0) throw new Error(`${field} must be a nonnegative number`);
      } else if (["enabled", "required"].includes(key)) {
        if (typeof entry !== "boolean") throw new Error(`${field} must be boolean`);
      } else if (["env", "http_headers", "env_http_headers"].includes(key)) {
        for (const [name, value] of Object.entries(assertObject(entry, field))) assertString(value, `${field}.${name}`);
      } else if (key === "env_vars") {
        if (!Array.isArray(entry)) throw new Error(`${field} must be an array`);
        for (const variable of entry) {
          if (typeof variable === "string") continue;
          const mapping = assertObject(variable, field);
          assertKeys(mapping, ["name", "source"], field);
          assertString(mapping.name, `${field}.name`);
          assertString(mapping.source, `${field}.source`);
        }
      } else if (key === "tools") {
        for (const [name, rawTool] of Object.entries(assertObject(entry, field))) {
          const tool = assertObject(rawTool, `${field}.${name}`);
          assertKeys(tool, ["approval_mode", "output_token_limit"], `${field}.${name}`);
          if (tool.approval_mode !== undefined) assertOneOf(tool.approval_mode, approvalModes, `${field}.${name}.approval_mode`);
          if (tool.output_token_limit !== undefined && (!Number.isInteger(tool.output_token_limit) || (tool.output_token_limit as number) <= 0)) throw new Error(`${field}.${name}.output_token_limit must be a positive integer`);
        }
      } else if (key === "oauth") {
        const oauth = assertObject(entry, field);
        assertKeys(oauth, ["client_id", "callback_url", "callback_port"], field);
        for (const [key, value] of Object.entries(oauth)) {
          if (key === "callback_port") {
            if (!Number.isInteger(value) || (value as number) <= 0 || (value as number) > 65535) throw new Error(`${field}.callback_port must be a port`);
          } else assertString(value, `${field}.${key}`);
        }
      }
    }
    if (server.default_tools_approval_mode !== undefined) assertOneOf(server.default_tools_approval_mode, approvalModes, `${serverLabel}.default_tools_approval_mode`);
    if (server.auth !== undefined) assertOneOf(server.auth, ["oauth", "chatgpt"], `${serverLabel}.auth`);
    if (server.command !== undefined && server.url !== undefined) throw new Error(`${serverLabel} cannot combine command and url`);
  }
}

function validateCodex(config: Record<string, unknown>, label: string): void {
  assertKeys(config, [...codexStrings, "nickname_candidates", "approval_policy", "tools", "skills", "mcp_servers", "sandbox_workspace_write", "model_context_window", "model_max_output_tokens"], label);
  for (const key of codexStrings) if (config[key] !== undefined) assertString(config[key], `${label}.${key}`);
  if (config.nickname_candidates !== undefined) assertStrings(config.nickname_candidates, `${label}.nickname_candidates`);
  if (config.model_reasoning_effort !== undefined) assertOneOf(config.model_reasoning_effort, ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"], `${label}.model_reasoning_effort`);
  if (config.sandbox_mode !== undefined) assertOneOf(config.sandbox_mode, ["read-only", "workspace-write", "danger-full-access"], `${label}.sandbox_mode`);
  if (config.web_search !== undefined) assertOneOf(config.web_search, ["disabled", "cached", "live"], `${label}.web_search`);
  if (config.approval_policy !== undefined) {
    if (typeof config.approval_policy === "string") assertOneOf(config.approval_policy, ["never", "on-request", "on-failure"], `${label}.approval_policy`);
    else {
      const policy = assertObject(config.approval_policy, `${label}.approval_policy`);
      assertKeys(policy, ["granular"], `${label}.approval_policy`);
      const granular = assertObject(policy.granular, `${label}.approval_policy.granular`);
      assertKeys(granular, ["sandbox_approval", "rules", "mcp_elicitations", "request_permissions", "skill_approval"], `${label}.approval_policy.granular`);
      for (const value of Object.values(granular)) if (typeof value !== "boolean") throw new Error(`${label}.approval_policy.granular values must be boolean`);
    }
  }
  if (config.tools !== undefined) {
    const tools = assertObject(config.tools, `${label}.tools`);
    assertKeys(tools, ["web_search", "view_image"], `${label}.tools`);
    for (const value of Object.values(tools)) if (typeof value !== "boolean") throw new Error(`${label}.tools values must be boolean`);
  }
  if (config.skills !== undefined) {
    const skills = assertObject(config.skills, `${label}.skills`);
    assertKeys(skills, ["config"], `${label}.skills`);
    if (!Array.isArray(skills.config)) throw new Error(`${label}.skills.config must be an array`);
    for (const raw of skills.config) {
      const entry = assertObject(raw, `${label}.skills.config entry`);
      assertKeys(entry, ["path", "enabled"], `${label}.skills.config entry`);
      assertString(entry.path, `${label}.skills.config.path`);
      if (typeof entry.enabled !== "boolean") throw new Error(`${label}.skills.config.enabled must be boolean`);
    }
  }
  if (config.sandbox_workspace_write !== undefined) {
    const sandbox = assertObject(config.sandbox_workspace_write, `${label}.sandbox_workspace_write`);
    assertKeys(sandbox, ["writable_roots", "network_access", "exclude_tmpdir_env_var", "exclude_slash_tmp"], `${label}.sandbox_workspace_write`);
    for (const [key, value] of Object.entries(sandbox)) {
      if (key === "writable_roots") assertStrings(value, `${label}.sandbox_workspace_write.${key}`);
      else if (typeof value !== "boolean") throw new Error(`${label}.sandbox_workspace_write.${key} must be boolean`);
    }
  }
  for (const key of ["model_context_window", "model_max_output_tokens"]) {
    if (config[key] !== undefined && (!Number.isInteger(config[key]) || (config[key] as number) <= 0)) throw new Error(`${label}.${key} must be a positive integer`);
  }
  if (config.mcp_servers !== undefined) validateMcp(config.mcp_servers, `${label}.mcp_servers`);
}

async function optionalMarkdown(file: string): Promise<string> {
  try { return normalizeInstruction(await fs.readFile(file, "utf8")); }
  catch (error: any) { if (error?.code === "ENOENT") return ""; throw error; }
}

export async function loadAgentSources(root: string): Promise<AgentSource[]> {
  const directory = path.join(root, "agents");
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error: any) { if (error?.code === "ENOENT") return []; throw error; }
  const sharedInstructions = {
    pi: await optionalMarkdown(path.join(directory, "pi.md")),
    codex: await optionalMarkdown(path.join(directory, "codex.md")),
    vscode: await optionalMarkdown(path.join(directory, "vscode.md")),
  };
  const agents: AgentSource[] = [];
  for (const entry of entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!/^[a-z][a-z0-9-]*$/.test(entry.name)) throw new Error(`invalid canonical agent directory: ${entry.name}`);
    const source = path.join(directory, entry.name);
    const definitionPath = path.join(source, "agent.json");
    const definitionText = await fs.readFile(definitionPath, "utf8");
    let parsed: unknown;
    try { parsed = JSON.parse(definitionText); }
    catch { throw new Error(`${definitionPath} is not valid JSON`); }
    const raw = assertObject(parsed, source);
    assertKeys(raw, ["description", "pi", "codex", "vscode"], source);
    assertString(raw.description, `${source}.description`);
    if (!(raw.description as string).trim()) throw new Error(`${source}.description must not be empty`);
    const role = normalizeInstruction(await fs.readFile(path.join(source, "role.md"), "utf8"));
    if (!role.trim()) throw new Error(`${source}/role.md must not be empty`);
    if (raw.pi === undefined && raw.codex === undefined && raw.vscode === undefined) throw new Error(`${source} requires a native pi, codex or vscode profile`);
    const instructions = { pi: "", codex: "", vscode: "" };
    for (const harness of ["pi", "codex", "vscode"] as const) {
      if (raw[harness] === undefined) continue;
      const native = assertObject(raw[harness], `${source}.${harness}`);
      validateNativeValue(native, `${source}.${harness}`);
      if (harness !== "vscode" && (typeof native.name !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(native.name))) throw new Error(`${source}.${harness}.name must be a safe native agent name`);
      if (native.description !== undefined) assertString(native.description, `${source}.${harness}.description`);
      if (harness === "pi") validatePi({ description: raw.description, ...native }, `${source}.pi`);
      else if (harness === "codex") validateCodex(native, `${source}.codex`);
      else validateVsCode(native, `${source}.vscode`);
      instructions[harness] = composeInstructions([
        sharedInstructions[harness], role, await optionalMarkdown(path.join(source, `${harness}.md`)),
      ]);
    }
    agents.push({ id: entry.name, description: raw.description as string, role, pi: raw.pi as NativeConfig | undefined, codex: raw.codex as NativeConfig | undefined, vscode: raw.vscode as NativeConfig | undefined,
      piInstructions: instructions.pi, codexInstructions: instructions.codex, vscodeInstructions: instructions.vscode });
  }
  for (const harness of ["pi", "codex", "vscode"] as const) {
    const names = new Set<string>();
    for (const agent of agents) {
      const name = (agent[harness]?.name ?? (harness === "vscode" && agent.vscode ? agent.id : undefined)) as string | undefined;
      if (name !== undefined && names.has(name)) throw new Error(`duplicate ${harness} agent name: ${name}`);
      if (name !== undefined) names.add(name);
    }
  }
  return agents;
}

function piScalar(value: NativeValue, key: string): string {
  const scalar = Array.isArray(value) ? value.join(", ") : value;
  if (typeof scalar !== "string") return String(scalar);
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(scalar))
    throw new Error(`Pi frontmatter ${key} cannot preserve control characters in both parsers`);
  // pi-subagents strips outer quotes but does not decode YAML escapes.
  if (!scalar.includes("\n")) {
    if (!scalar.includes("'")) return `'${scalar}'`;
    if (!/["\\]/.test(scalar)) return `"${scalar}"`;
  }
  if (/^\s/.test(scalar) || scalar.endsWith("\n\n"))
    throw new Error(`Pi frontmatter ${key} cannot preserve this block scalar's whitespace in both parsers`);
  return `${scalar.endsWith("\n") ? "|" : "|-"}\n${scalar.split("\n").map((line) => `  ${line}`).join("\n")}`;
}

function resolvePathBindings(
  value: NativeValue,
  paths: Record<string, string>,
  label: string,
): NativeValue {
  if (typeof value === "string") {
    const reference = /^\$\{paths\.([^{}]+)\}$/.exec(value);
    if (!reference) {
      if (value.includes("${paths."))
        throw new Error(`${label}: path reference must occupy the entire string as \${paths.name}`);
      return value;
    }
    if (!Object.hasOwn(paths, reference[1]))
      throw new Error(`${label}: missing path binding: paths.${reference[1]}`);
    return paths[reference[1]];
  }
  if (Array.isArray(value))
    return value.map((item, index) => resolvePathBindings(item, paths, `${label}[${index}]`));
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolvePathBindings(item, paths, `${label}.${key}`)]),
    );
  return value;
}

function resolvedAgentConfig(
  agent: AgentSource,
  harness: "pi" | "codex",
  paths: Record<string, string>,
): NativeConfig {
  const label = `agents/${agent.id}/agent.json.${harness}`;
  const config = resolvePathBindings(
    { description: agent.description, ...agent[harness]! },
    paths,
    label,
  ) as NativeConfig;
  if (harness === "pi") validatePi(config, label);
  else validateCodex(config, label);
  return config;
}

export function renderPiAgent(agent: AgentSource, paths: Record<string, string> = {}): string {
  const config = resolvedAgentConfig(agent, "pi", paths);
  const lines = Object.keys(config).sort().map((key) => `${key}: ${piScalar(config[key], key)}`);
  return `---\n${lines.join("\n")}\n---\n\n${agent.piInstructions}`;
}

function tomlString(value: string): string { return JSON.stringify(value).replace(/\u007f/g, "\\u007f"); }
function tomlKey(key: string): string { return /^[A-Za-z0-9_-]+$/.test(key) ? key : tomlString(key); }

function tomlValue(value: NativeValue): string {
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(", ")}]`;
  if (typeof value === "object") return `{ ${Object.keys(value).sort().map((key) => `${tomlKey(key)} = ${tomlValue(value[key])}`).join(", ")} }`;
  return typeof value === "string" ? tomlString(value) : JSON.stringify(value);
}

export function renderCodexAgent(agent: AgentSource, paths: Record<string, string> = {}): string {
  const config = resolvedAgentConfig(agent, "codex", paths);
  const lines = Object.keys(config).sort().map((key) => `${tomlKey(key)} = ${tomlValue(config[key])}`);
  const escaped = [...agent.codexInstructions].map((char) => char === "\n" ? "\n" : tomlString(char).slice(1, -1)).join("");
  return `${lines.join("\n")}\ndeveloper_instructions = """\n${escaped}"""\n`;
}

export function renderVsCodeAgent(agent: AgentSource): string {
  assertString(agent.vscodeInstructions, `agents/${agent.id}.vscodeInstructions`);
  const native: NativeConfig = { name: agent.id, description: agent.description, ...agent.vscode };
  validateNativeValue(native, `agents/${agent.id}.vscode`);
  validateVsCode(native, `agents/${agent.id}.vscode`);
  const { fileName, ...config } = native;
  const lines = Object.keys(config).sort().map((key) => `${key}: ${JSON.stringify(config[key])}`);
  return `---\n${lines.join("\n")}\n---\n\n${agent.vscodeInstructions}`;
}
