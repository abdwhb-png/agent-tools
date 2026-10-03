#!/usr/bin/env node

// src/commands.ts
import path8 from "node:path";
import process3 from "node:process";
import { fileURLToPath } from "node:url";

// src/config.ts
import os from "node:os";
import path from "node:path";
import process from "node:process";
var WINDOWS = "win32";
var domainHarnesses = {
  instructions: ["pi", "codex", "vscode", "zed"],
  agents: ["pi", "codex"]
};
function platformPath(platform) {
  return platform === WINDOWS ? path.win32 : path.posix;
}
function homePath(environment, ...parts) {
  return platformPath(environment.platform).join(environment.home, ...parts);
}
function defaultCodeProfile(environment) {
  if (environment.platform === WINDOWS) {
    return environment.env.APPDATA ? path.win32.join(environment.env.APPDATA, "Code", "User") : homePath(environment, "AppData", "Roaming", "Code", "User");
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "Code", "User");
  }
  return environment.env.XDG_CONFIG_HOME ? path.posix.join(environment.env.XDG_CONFIG_HOME, "Code", "User") : homePath(environment, ".config", "Code", "User");
}
function currentEnvironment() {
  return { home: os.homedir(), platform: process.platform, env: process.env };
}
function defaultConfigPath(environment = currentEnvironment(), toolDirectory, domain) {
  const filename = domain ? `${domain}.config.json` : "config.json";
  if (toolDirectory)
    return platformPath(environment.platform).join(toolDirectory, filename);
  if (environment.platform === WINDOWS) {
    return environment.env.APPDATA ? path.win32.join(environment.env.APPDATA, "agent-policy", filename) : homePath(environment, "AppData", "Roaming", "agent-policy", filename);
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "agent-policy", filename);
  }
  return environment.env.XDG_CONFIG_HOME ? path.posix.join(environment.env.XDG_CONFIG_HOME, "agent-policy", filename) : homePath(environment, ".config", "agent-policy", filename);
}
function defaultStatePath(environment = currentEnvironment(), domain) {
  const parts = domain ? [domain, "state.json"] : ["state.json"];
  if (environment.platform === WINDOWS) {
    return environment.env.LOCALAPPDATA ? path.win32.join(environment.env.LOCALAPPDATA, "agent-policy", ...parts) : homePath(environment, "AppData", "Local", "agent-policy", ...parts);
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "agent-policy", ...parts);
  }
  return environment.env.XDG_STATE_HOME ? path.posix.join(environment.env.XDG_STATE_HOME, "agent-policy", ...parts) : homePath(environment, ".local", "state", "agent-policy", ...parts);
}
function defaultPolicyConfig(environment = currentEnvironment(), domain) {
  const codexHome = environment.env.CODEX_HOME || homePath(environment, ".codex");
  const vscodeTarget = platformPath(environment.platform).join(defaultCodeProfile(environment), "instructions", "agent-policy.instructions.md");
  return {
    schemaVersion: 1,
    ...domain ? { resources: { instructions: domain === "instructions", agents: domain === "agents" } } : {},
    harnesses: {
      pi: { enabled: true, agentDir: homePath(environment, ".pi", "agent") },
      codex: { enabled: true, home: codexHome },
      vscode: { enabled: domain !== "agents", targets: [vscodeTarget] },
      zed: { enabled: false }
    }
  };
}
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      throw new Error(`${label} contains unsupported key: ${key}`);
  }
}
function assertHarness(value, name) {
  if (!isObject(value) || typeof value.enabled !== "boolean")
    throw new Error(`harnesses.${name} must contain boolean enabled`);
  return value;
}
function assertAbsolute(value, label, platform) {
  if (!platformPath(platform).isAbsolute(value))
    throw new Error(`${label} must be an absolute path for ${platform}`);
}
function validateHomeHarness(config, name, platform, allowRetirements = name === "Codex") {
  const label = name.toLowerCase();
  assertKeys(config, ["enabled", "home", "additionalHomes", ...allowRetirements ? ["retiredAgents"] : []], `harnesses.${label}`);
  if (name === "Codex")
    validateRetirements(config.retiredAgents);
  if (config.enabled && typeof config.home !== "string")
    throw new Error(`enabled ${name} harness requires home`);
  if (typeof config.home === "string")
    assertAbsolute(config.home, `harnesses.${label}.home`, platform);
  if (config.additionalHomes === undefined)
    return;
  if (!Array.isArray(config.additionalHomes))
    throw new Error(`harnesses.${label}.additionalHomes must be an array`);
  const ids = new Set;
  const homes = new Set(typeof config.home === "string" ? [config.home] : []);
  for (const entry of config.additionalHomes) {
    if (!isObject(entry))
      throw new Error(`each additional ${name} home must be an object`);
    assertKeys(entry, ["id", "home", ...allowRetirements ? ["retiredAgents"] : []], `harnesses.${label}.additionalHomes entry`);
    if (name === "Codex")
      validateRetirements(entry.retiredAgents);
    if (typeof entry.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(entry.id) || typeof entry.home !== "string") {
      throw new Error(`each additional ${name} home requires a lowercase id and absolute home path`);
    }
    assertAbsolute(entry.home, `harnesses.${label}.additionalHomes.${entry.id}.home`, platform);
    if (ids.has(entry.id))
      throw new Error(`duplicate additional ${name} id: ${entry.id}`);
    if (homes.has(entry.home))
      throw new Error(`duplicate ${name} home: ${entry.home}`);
    ids.add(entry.id);
    homes.add(entry.home);
  }
}
function validateRetirements(value) {
  if (value === undefined)
    return;
  if (!Array.isArray(value) || value.some((file) => typeof file !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.toml$/.test(file)))
    throw new Error("retiredAgents entries must be native Codex agent basenames ending in .toml");
  if (new Set(value).size !== value.length)
    throw new Error("duplicate retired agent basename");
}
function parsePolicyConfig(raw, platform = process.platform, domain) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("configuration is not valid JSON");
  }
  if (!isObject(parsed))
    throw new Error("configuration must be an object");
  const profile = parsed.schemaVersion === 2;
  if (profile) {
    assertKeys(parsed, ["schemaVersion", "kind", "enabled", "harnesses"], "configuration");
    if (parsed.kind !== "instructions" && parsed.kind !== "agents")
      throw new Error("configuration kind must be instructions or agents");
    if (domain && parsed.kind !== domain)
      throw new Error(`configuration belongs to ${parsed.kind}, not ${domain}`);
    if (typeof parsed.enabled !== "boolean")
      throw new Error("configuration enabled must be boolean");
  } else {
    if (domain)
      throw new Error("legacy configuration requires configure --import-legacy");
    assertKeys(parsed, ["schemaVersion", "harnesses", "resources"], "configuration");
    if (parsed.schemaVersion !== 1)
      throw new Error("configuration must have schemaVersion 1 or 2");
  }
  if (!isObject(parsed.harnesses))
    throw new Error("configuration must contain harnesses");
  if (parsed.resources !== undefined) {
    if (!isObject(parsed.resources))
      throw new Error("resources must be an object");
    assertKeys(parsed.resources, ["instructions", "agents"], "resources");
    for (const [name, enabled] of Object.entries(parsed.resources)) {
      if (typeof enabled !== "boolean")
        throw new Error(`resources.${name} must be boolean`);
    }
  }
  assertKeys(parsed.harnesses, profile ? domainHarnesses[parsed.kind] : domainHarnesses.instructions, "harnesses");
  const pi = assertHarness(parsed.harnesses.pi, "pi");
  const codex = assertHarness(parsed.harnesses.codex, "codex");
  const vscode = assertHarness(profile && parsed.kind === "agents" ? { enabled: false } : parsed.harnesses.vscode, "vscode");
  const zed = parsed.harnesses.zed === undefined ? undefined : assertHarness(parsed.harnesses.zed, "zed");
  assertKeys(pi, ["enabled", "agentDir"], "harnesses.pi");
  validateHomeHarness(codex, "Codex", platform, !profile || parsed.kind === "agents");
  if (zed)
    validateHomeHarness(zed, "Zed", platform);
  assertKeys(vscode, ["enabled", "targets"], "harnesses.vscode");
  if (pi.enabled && typeof pi.agentDir !== "string")
    throw new Error("enabled Pi harness requires agentDir");
  if (vscode.enabled && (!Array.isArray(vscode.targets) || vscode.targets.length === 0 || vscode.targets.some((target) => typeof target !== "string"))) {
    throw new Error("enabled VS Code harness requires a non-empty targets array");
  }
  if (typeof pi.agentDir === "string")
    assertAbsolute(pi.agentDir, "harnesses.pi.agentDir", platform);
  if (Array.isArray(vscode.targets))
    vscode.targets.forEach((target) => assertAbsolute(target, "harnesses.vscode.targets", platform));
  if (!profile)
    return parsed;
  return {
    schemaVersion: 1,
    resources: {
      instructions: parsed.kind === "instructions" && parsed.enabled === true,
      agents: parsed.kind === "agents" && parsed.enabled === true
    },
    harnesses: { pi, codex, vscode, ...zed ? { zed } : {} }
  };
}
function profileConfig(config, domain) {
  const { pi, codex, vscode, zed } = structuredClone(config.harnesses);
  if (domain === "instructions") {
    delete codex.retiredAgents;
    for (const home of codex.additionalHomes || [])
      delete home.retiredAgents;
  }
  return {
    schemaVersion: 2,
    kind: domain,
    enabled: domain === "instructions" ? config.resources?.instructions !== false : config.resources?.agents === true,
    harnesses: {
      pi,
      codex,
      ...domain === "instructions" ? { vscode, ...zed ? { zed } : {} } : {}
    }
  };
}
function parsePolicyState(raw, domain) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("state is not valid JSON");
  }
  if (!isObject(parsed) || parsed.schemaVersion !== 1 || !isObject(parsed.targets))
    throw new Error("state is malformed");
  for (const [id, target] of Object.entries(parsed.targets)) {
    if (!isObject(target) || typeof target.path !== "string" || typeof target.ownedHash !== "string")
      throw new Error(`state target ${id} is malformed`);
    if (target.agentDirectory !== undefined && typeof target.agentDirectory !== "string")
      throw new Error(`state target ${id} has malformed agent ownership`);
  }
  const state = parsed;
  if (domain) {
    const selected = stateForDomain(state, domain);
    const other = Object.keys(state.targets).filter((id) => !Object.hasOwn(selected.targets, id));
    if (other.length)
      throw new Error(`ownership state contains targets from the other domain: ${other.join(", ")}; import legacy state first`);
  }
  return state;
}
function stateForDomain(state, domain) {
  return {
    schemaVersion: 1,
    targets: Object.fromEntries(Object.entries(state.targets).filter(([, target]) => target.agentDirectory !== undefined === (domain === "agents")))
  };
}
function emptyState() {
  return { schemaVersion: 1, targets: {} };
}

// src/files.ts
import fs from "node:fs/promises";
import path2 from "node:path";
import process2 from "node:process";
var nodeFileOps = fs;
async function readOptional(io, filePath) {
  try {
    return await io.readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT")
      return;
    throw error;
  }
}
var temporaryId = 0;
var transactionId = 0;
async function atomicWrite(io, destination, content) {
  const directory = path2.dirname(destination);
  await io.mkdir(directory, { recursive: true, mode: 448 });
  const temporary = path2.join(directory, `.${path2.basename(destination)}.harness-sync-${process2.pid}-${Date.now()}-${++temporaryId}.tmp`);
  try {
    await io.writeFile(temporary, content, { encoding: "utf8", mode: 384 });
    await io.rename(temporary, destination);
  } catch (error) {
    try {
      await io.unlink(temporary);
    } catch (cleanupError) {
      if (cleanupError?.code !== "ENOENT")
        throw new Error(`${String(error)}; temporary file cleanup failed: ${String(cleanupError)}`);
    }
    throw error;
  }
}
async function commitChanges(changes, backupParent, io = nodeFileOps, preserve = []) {
  const paths = new Set;
  for (const item of changes) {
    if (paths.has(item.path))
      throw new Error(`duplicate transaction path: ${item.path}`);
    paths.add(item.path);
  }
  for (const item of [...changes, ...preserve]) {
    if (await readOptional(io, item.path) !== item.existing)
      throw new Error(`${item.id} changed after preflight`);
  }
  if (!changes.length)
    return [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path2.join(backupParent, "backups", `${timestamp}-${process2.pid}-${++transactionId}`);
  const backups = [];
  const backedUp = new Set;
  for (const item of [...preserve, ...changes]) {
    if (item.existing === undefined || backedUp.has(item.path))
      continue;
    const backupPath = path2.join(backupRoot, `${item.id.replace(/[^a-z0-9-]/gi, "_")}.bak`);
    await io.mkdir(path2.dirname(backupPath), { recursive: true, mode: 448 });
    await io.writeFile(backupPath, item.existing, { encoding: "utf8", mode: 384 });
    backups.push(backupPath);
    backedUp.add(item.path);
  }
  const changed = [];
  try {
    for (const item of changes) {
      if (await readOptional(io, item.path) !== item.existing)
        throw new Error(`${item.id} changed after preflight`);
      if (item.desired === undefined)
        await io.unlink(item.path);
      else
        await atomicWrite(io, item.path, item.desired);
      changed.push(item);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const item of [...changed].reverse()) {
      try {
        if (item.existing === undefined)
          await io.unlink(item.path);
        else
          await atomicWrite(io, item.path, item.existing);
      } catch (rollbackError) {
        rollbackErrors.push(`${item.id}: ${rollbackError?.message || "rollback failed"}`);
      }
    }
    const suffix = rollbackErrors.length ? `; rollback failures: ${rollbackErrors.join(", ")}` : "; changed targets were rolled back";
    throw new Error(`${error instanceof Error ? error.message : String(error)}${suffix}; backups: ${backups.join(", ") || "none"}`);
  }
  return backups;
}

// src/migration.ts
import path3 from "node:path";
import { isDeepStrictEqual } from "node:util";
async function importLegacy(domain, paths, dryRun = true, io = nodeFileOps) {
  paths = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, path3.resolve(value)]));
  if (paths.config === paths.state || [paths.config, paths.state].some((destination) => destination === paths.legacyConfig || destination === paths.legacyState))
    throw new Error("legacy inputs and new configuration/state must use distinct paths");
  const legacyConfig = await readOptional(io, paths.legacyConfig);
  if (legacyConfig === undefined)
    throw new Error(`legacy configuration does not exist: ${paths.legacyConfig}`);
  const profile = profileConfig(parsePolicyConfig(legacyConfig), domain);
  const legacyState = await readOptional(io, paths.legacyState);
  const state = stateForDomain(legacyState === undefined ? emptyState() : parsePolicyState(legacyState), domain);
  const changes = [];
  for (const [id, destination, expected] of [
    ["configuration", paths.config, profile],
    ["ownership-state", paths.state, state]
  ]) {
    const existing = await readOptional(io, destination);
    if (existing !== undefined) {
      const parsed = id === "configuration" ? profileConfig(parsePolicyConfig(existing, undefined, domain), domain) : parsePolicyState(existing, domain);
      if (!isDeepStrictEqual(parsed, expected))
        throw new Error(`legacy import would overwrite divergent ${id}: ${destination}`);
    } else {
      changes.push({
        id,
        path: destination,
        existing,
        desired: `${JSON.stringify(expected, null, 2)}
`
      });
    }
  }
  const backups = dryRun ? [] : await commitChanges(changes, path3.dirname(paths.state), io, [
    { id: "legacy-configuration", path: paths.legacyConfig, existing: legacyConfig },
    { id: "legacy-ownership-state", path: paths.legacyState, existing: legacyState }
  ]);
  return { profile, state, changes, backups };
}

// src/sources.ts
import fs3 from "node:fs/promises";
import path5 from "node:path";

// src/agents.ts
import fs2 from "node:fs/promises";
import path4 from "node:path";
function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value;
}
function assertKeys2(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      throw new Error(`${label}.${key} is unsupported by harness-sync`);
  }
}
function assertString(value, label) {
  if (typeof value !== "string")
    throw new Error(`${label} must be a string`);
  if (!value.isWellFormed())
    throw new Error(`${label} contains invalid Unicode`);
}
function assertStrings(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
    throw new Error(`${label} must be an array of strings`);
}
function validateNativeValue(value, label) {
  if (typeof value === "string") {
    assertString(value, label);
    return;
  }
  if (typeof value === "boolean")
    return;
  if (typeof value === "number" && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value)))
    return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateNativeValue(entry, `${label}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(assertObject(value, label))) {
    assertString(key, `${label} key`);
    validateNativeValue(entry, `${label}.${key}`);
  }
}
var piLists = new Set(["tools", "excludeTools", "skills", "skill", "skillPath", "allowedAgents", "defaultReads", "aliases", "alias", "extensions", "subagentOnlyExtensions", "mutationTools"]);
var piBooleans = new Set(["inheritProjectContext", "inheritGlobalContext", "inheritSkills", "defaultProgress", "interactive", "async", "advertise", "fast", "allowNestedSubagents", "completionGuard"]);
function validatePi(config, label) {
  for (const [key, value] of Object.entries(config)) {
    if (!/^[\w-]+$/.test(key))
      throw new Error(`${label}.${key} is not a Pi frontmatter key`);
    if (piLists.has(key)) {
      if (Array.isArray(value)) {
        assertStrings(value, `${label}.${key}`);
        if (value.some((item) => !item.trim() || /[,\r\n]/.test(item)))
          throw new Error(`${label}.${key} contains an unrepresentable list item`);
      } else
        assertString(value, `${label}.${key}`);
    } else if (piBooleans.has(key)) {
      if (typeof value !== "boolean" && value !== "true" && value !== "false")
        throw new Error(`${label}.${key} must be boolean`);
    } else if (!["string", "boolean", "number"].includes(typeof value) || value === null) {
      throw new Error(`${label}.${key} must be a scalar; encode extension JSON as a string`);
    }
    if (typeof value === "string" && /\r|\n---/.test(value))
      throw new Error(`${label}.${key} contains an unrepresentable frontmatter delimiter`);
    if (typeof value === "string" && value.includes(`
`) && /^\s/.test(value))
      throw new Error(`${label}.${key} contains unrepresentable leading indentation`);
  }
}
var codexStrings = ["name", "description", "model", "model_provider", "model_reasoning_effort", "model_reasoning_summary", "model_verbosity", "sandbox_mode", "service_tier", "web_search"];
var mcpStrings = ["command", "cwd", "url", "auth", "bearer_token_env_var", "http_headers_helper", "default_tools_approval_mode", "oauth_resource", "experimental_environment"];
var mcpLists = ["args", "enabled_tools", "disabled_tools", "scopes"];
var mcpNumbers = ["startup_timeout_sec", "startup_timeout_ms", "tool_timeout_sec"];
var approvalModes = ["auto", "prompt", "writes", "approve"];
function assertOneOf(value, allowed, label) {
  if (typeof value !== "string" || !allowed.includes(value))
    throw new Error(`${label} must be one of ${allowed.join(", ")}`);
}
function validateMcp(value, label) {
  for (const [name, raw] of Object.entries(assertObject(value, label))) {
    const serverLabel = `${label}.${name}`;
    const server = assertObject(raw, serverLabel);
    assertKeys2(server, [...mcpStrings, ...mcpLists, ...mcpNumbers, "env", "env_vars", "http_headers", "env_http_headers", "enabled", "required", "tools", "oauth"], serverLabel);
    for (const [key, entry] of Object.entries(server)) {
      const field = `${serverLabel}.${key}`;
      if (mcpStrings.includes(key))
        assertString(entry, field);
      else if (mcpLists.includes(key))
        assertStrings(entry, field);
      else if (mcpNumbers.includes(key)) {
        if (typeof entry !== "number" || entry < 0)
          throw new Error(`${field} must be a nonnegative number`);
      } else if (["enabled", "required"].includes(key)) {
        if (typeof entry !== "boolean")
          throw new Error(`${field} must be boolean`);
      } else if (["env", "http_headers", "env_http_headers"].includes(key)) {
        for (const [name2, value2] of Object.entries(assertObject(entry, field)))
          assertString(value2, `${field}.${name2}`);
      } else if (key === "env_vars") {
        if (!Array.isArray(entry))
          throw new Error(`${field} must be an array`);
        for (const variable of entry) {
          if (typeof variable === "string")
            continue;
          const mapping = assertObject(variable, field);
          assertKeys2(mapping, ["name", "source"], field);
          assertString(mapping.name, `${field}.name`);
          assertString(mapping.source, `${field}.source`);
        }
      } else if (key === "tools") {
        for (const [name2, rawTool] of Object.entries(assertObject(entry, field))) {
          const tool = assertObject(rawTool, `${field}.${name2}`);
          assertKeys2(tool, ["approval_mode", "output_token_limit"], `${field}.${name2}`);
          if (tool.approval_mode !== undefined)
            assertOneOf(tool.approval_mode, approvalModes, `${field}.${name2}.approval_mode`);
          if (tool.output_token_limit !== undefined && (!Number.isInteger(tool.output_token_limit) || tool.output_token_limit <= 0))
            throw new Error(`${field}.${name2}.output_token_limit must be a positive integer`);
        }
      } else if (key === "oauth") {
        const oauth = assertObject(entry, field);
        assertKeys2(oauth, ["client_id", "callback_url", "callback_port"], field);
        for (const [key2, value2] of Object.entries(oauth)) {
          if (key2 === "callback_port") {
            if (!Number.isInteger(value2) || value2 <= 0 || value2 > 65535)
              throw new Error(`${field}.callback_port must be a port`);
          } else
            assertString(value2, `${field}.${key2}`);
        }
      }
    }
    if (server.default_tools_approval_mode !== undefined)
      assertOneOf(server.default_tools_approval_mode, approvalModes, `${serverLabel}.default_tools_approval_mode`);
    if (server.auth !== undefined)
      assertOneOf(server.auth, ["oauth", "chatgpt"], `${serverLabel}.auth`);
    if (server.command !== undefined && server.url !== undefined)
      throw new Error(`${serverLabel} cannot combine command and url`);
  }
}
function validateCodex(config, label) {
  assertKeys2(config, [...codexStrings, "nickname_candidates", "approval_policy", "tools", "skills", "mcp_servers", "sandbox_workspace_write", "model_context_window", "model_max_output_tokens"], label);
  for (const key of codexStrings)
    if (config[key] !== undefined)
      assertString(config[key], `${label}.${key}`);
  if (config.nickname_candidates !== undefined)
    assertStrings(config.nickname_candidates, `${label}.nickname_candidates`);
  if (config.model_reasoning_effort !== undefined)
    assertOneOf(config.model_reasoning_effort, ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"], `${label}.model_reasoning_effort`);
  if (config.sandbox_mode !== undefined)
    assertOneOf(config.sandbox_mode, ["read-only", "workspace-write", "danger-full-access"], `${label}.sandbox_mode`);
  if (config.web_search !== undefined)
    assertOneOf(config.web_search, ["disabled", "cached", "live"], `${label}.web_search`);
  if (config.approval_policy !== undefined) {
    if (typeof config.approval_policy === "string")
      assertOneOf(config.approval_policy, ["never", "on-request", "on-failure"], `${label}.approval_policy`);
    else {
      const policy = assertObject(config.approval_policy, `${label}.approval_policy`);
      assertKeys2(policy, ["granular"], `${label}.approval_policy`);
      const granular = assertObject(policy.granular, `${label}.approval_policy.granular`);
      assertKeys2(granular, ["sandbox_approval", "rules", "mcp_elicitations", "request_permissions", "skill_approval"], `${label}.approval_policy.granular`);
      for (const value of Object.values(granular))
        if (typeof value !== "boolean")
          throw new Error(`${label}.approval_policy.granular values must be boolean`);
    }
  }
  if (config.tools !== undefined) {
    const tools = assertObject(config.tools, `${label}.tools`);
    assertKeys2(tools, ["web_search", "view_image"], `${label}.tools`);
    for (const value of Object.values(tools))
      if (typeof value !== "boolean")
        throw new Error(`${label}.tools values must be boolean`);
  }
  if (config.skills !== undefined) {
    const skills = assertObject(config.skills, `${label}.skills`);
    assertKeys2(skills, ["config"], `${label}.skills`);
    if (!Array.isArray(skills.config))
      throw new Error(`${label}.skills.config must be an array`);
    for (const raw of skills.config) {
      const entry = assertObject(raw, `${label}.skills.config entry`);
      assertKeys2(entry, ["path", "enabled"], `${label}.skills.config entry`);
      assertString(entry.path, `${label}.skills.config.path`);
      if (typeof entry.enabled !== "boolean")
        throw new Error(`${label}.skills.config.enabled must be boolean`);
    }
  }
  if (config.sandbox_workspace_write !== undefined) {
    const sandbox = assertObject(config.sandbox_workspace_write, `${label}.sandbox_workspace_write`);
    assertKeys2(sandbox, ["writable_roots", "network_access", "exclude_tmpdir_env_var", "exclude_slash_tmp"], `${label}.sandbox_workspace_write`);
    for (const [key, value] of Object.entries(sandbox)) {
      if (key === "writable_roots")
        assertStrings(value, `${label}.sandbox_workspace_write.${key}`);
      else if (typeof value !== "boolean")
        throw new Error(`${label}.sandbox_workspace_write.${key} must be boolean`);
    }
  }
  for (const key of ["model_context_window", "model_max_output_tokens"]) {
    if (config[key] !== undefined && (!Number.isInteger(config[key]) || config[key] <= 0))
      throw new Error(`${label}.${key} must be a positive integer`);
  }
  if (config.mcp_servers !== undefined)
    validateMcp(config.mcp_servers, `${label}.mcp_servers`);
}
async function optionalMarkdown(file) {
  try {
    return normalizeInstruction(await fs2.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT")
      return "";
    throw error;
  }
}
async function loadAgentSources(root) {
  const directory = path4.join(root, "agents");
  let entries;
  try {
    entries = await fs2.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT")
      return [];
    throw error;
  }
  const agents = [];
  for (const entry of entries.filter((entry2) => entry2.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!/^[a-z][a-z0-9-]*$/.test(entry.name))
      throw new Error(`invalid canonical agent directory: ${entry.name}`);
    const source = path4.join(directory, entry.name);
    const definitionPath = path4.join(source, "agent.json");
    const definitionText = await fs2.readFile(definitionPath, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(definitionText);
    } catch {
      throw new Error(`${definitionPath} is not valid JSON`);
    }
    const raw = assertObject(parsed, source);
    assertKeys2(raw, ["description", "pi", "codex"], source);
    assertString(raw.description, `${source}.description`);
    if (!raw.description.trim())
      throw new Error(`${source}.description must not be empty`);
    const role = normalizeInstruction(await fs2.readFile(path4.join(source, "role.md"), "utf8"));
    if (!role.trim())
      throw new Error(`${source}/role.md must not be empty`);
    if (raw.pi === undefined && raw.codex === undefined)
      throw new Error(`${source} requires a native pi or codex profile`);
    for (const harness of ["pi", "codex"]) {
      if (raw[harness] === undefined)
        continue;
      const native = assertObject(raw[harness], `${source}.${harness}`);
      validateNativeValue(native, `${source}.${harness}`);
      if (typeof native.name !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(native.name))
        throw new Error(`${source}.${harness}.name must be a safe native agent name`);
      if (native.description !== undefined)
        assertString(native.description, `${source}.${harness}.description`);
      if (harness === "pi")
        validatePi({ description: raw.description, ...native }, `${source}.pi`);
      else
        validateCodex(native, `${source}.codex`);
    }
    agents.push({
      id: entry.name,
      description: raw.description,
      role,
      pi: raw.pi,
      codex: raw.codex,
      piInstructions: await optionalMarkdown(path4.join(source, "pi.md")),
      codexInstructions: await optionalMarkdown(path4.join(source, "codex.md"))
    });
  }
  for (const harness of ["pi", "codex"]) {
    const names = new Set;
    for (const agent of agents) {
      const name = agent[harness]?.name;
      if (name !== undefined && names.has(name))
        throw new Error(`duplicate ${harness} agent name: ${name}`);
      if (name !== undefined)
        names.add(name);
    }
  }
  return agents;
}
function piScalar(value) {
  if (Array.isArray(value))
    return value.join(", ");
  const scalar = String(value);
  if (scalar.includes(`
`))
    return `|
${scalar.split(`
`).map((line) => `  ${line}`).join(`
`)}`;
  if (["|", "|-", ">", ">-"].includes(scalar) || scalar.trim() !== scalar || /^(["']).*\1$/.test(scalar) || /^["']$/.test(scalar))
    return `"${scalar}"`;
  return scalar;
}
function renderPiAgent(agent) {
  const config = { description: agent.description, ...agent.pi };
  const lines = Object.keys(config).sort().map((key) => `${key}:${config[key] === "" ? "" : ` ${piScalar(config[key])}`}`);
  return `---
${lines.join(`
`)}
---

${composeInstructions([agent.role, agent.piInstructions])}`;
}
function tomlString(value) {
  return JSON.stringify(value).replace(/\u007f/g, "\\u007f");
}
function tomlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : tomlString(key);
}
function tomlValue(value) {
  if (Array.isArray(value))
    return `[${value.map(tomlValue).join(", ")}]`;
  if (typeof value === "object")
    return `{ ${Object.keys(value).sort().map((key) => `${tomlKey(key)} = ${tomlValue(value[key])}`).join(", ")} }`;
  return typeof value === "string" ? tomlString(value) : JSON.stringify(value);
}
function renderCodexAgent(agent) {
  const config = { description: agent.description, ...agent.codex };
  const lines = Object.keys(config).sort().map((key) => `${tomlKey(key)} = ${tomlValue(config[key])}`);
  const instructions = composeInstructions([agent.role, agent.codexInstructions]);
  const escaped = [...instructions].map((char) => char === `
` ? `
` : tomlString(char).slice(1, -1)).join("");
  return `${lines.join(`
`)}
developer_instructions = """
${escaped}"""
`;
}

// src/sources.ts
var HARNESS_NAMES = ["pi", "codex", "vscode", "zed"];
function normalizeInstruction(source) {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, `
`);
  return normalized === "" ? "" : normalized.replace(/\n*$/, `
`);
}
function composeInstructions(sources) {
  const content = sources.map((source) => normalizeInstruction(source).trimEnd()).filter(Boolean);
  return content.length === 0 ? "" : `${content.join(`

`)}
`;
}
async function readInstruction(filePath) {
  return normalizeInstruction(await fs3.readFile(filePath, "utf8"));
}
async function readOptionalDirectory(directory) {
  try {
    return await fs3.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== "ENOENT")
      throw error;
    return [];
  }
}
async function loadInstructionModules(directory, sourcePrefix) {
  const entries = await readOptionalDirectory(directory);
  const filenames = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => entry.name).sort();
  return Promise.all(filenames.map(async (filename) => ({
    source: `${sourcePrefix}/${filename}`,
    content: await readInstruction(path5.join(directory, filename))
  })));
}
async function loadCanonicalSources(root, resources = { agents: true }) {
  const instructionPath = (...parts) => path5.join(root, "instructions", ...parts);
  if (resources.instructions === false)
    return {
      invariants: "",
      preferences: "",
      technologyDefaults: "",
      piAppendSystem: "",
      harnessInstructions: Object.fromEntries(HARNESS_NAMES.map((harness) => [harness, { system: [], agents: [] }])),
      agents: resources.agents === false ? [] : await loadAgentSources(root)
    };
  const harnessInstructions = Object.fromEntries(await Promise.all(HARNESS_NAMES.map(async (harness) => {
    const directory = instructionPath(harness);
    const entries = await readOptionalDirectory(directory);
    const misplaced = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md") && !(harness === "pi" && entry.name === "APPEND_SYSTEM.md")).map((entry) => entry.name).sort();
    if (misplaced.length > 0) {
      const appendHint = harness === "pi" ? "; Pi append content belongs in APPEND_SYSTEM.md" : "";
      throw new Error(`misplaced instruction source: ${path5.join(directory, misplaced[0])}; move Markdown modules into system/ or agents/${appendHint}`);
    }
    return [
      harness,
      {
        system: await loadInstructionModules(instructionPath(harness, "system"), `${harness}/system`),
        agents: await loadInstructionModules(instructionPath(harness, "agents"), `${harness}/agents`)
      }
    ];
  })));
  let piAppendSystem = "";
  try {
    piAppendSystem = await readInstruction(instructionPath("pi", "APPEND_SYSTEM.md"));
  } catch (error) {
    if (error?.code !== "ENOENT")
      throw error;
  }
  return {
    invariants: await readInstruction(instructionPath("invariant.md")),
    preferences: await readInstruction(instructionPath("preferences.md")),
    technologyDefaults: await readInstruction(instructionPath("technology-defaults.md")),
    harnessInstructions,
    piAppendSystem,
    agents: resources.agents === false ? [] : await loadAgentSources(root)
  };
}

// src/sync.ts
import crypto from "node:crypto";
import path7 from "node:path";
import { isDeepStrictEqual as isDeepStrictEqual2 } from "node:util";

// src/renderers.ts
var reservedModuleTag = new RegExp(`<\\/?(?:${HARNESS_NAMES.join("|")})_(?:system|agents)_[A-Za-z0-9_]+(?=[\\s/>])`);
function renderInstructionModules(modules) {
  const rendered = [];
  const tagSources = new Map;
  for (const module of modules) {
    const content = normalizeInstruction(module.content).trimEnd();
    if (!content)
      continue;
    if (reservedModuleTag.test(content)) {
      throw new Error(`instruction source ${module.source} contains a reserved module tag`);
    }
    const tag = module.source.replace(/\.md$/, "").replace(/[^A-Za-z0-9_]/g, "_");
    const previousSource = tagSources.get(tag);
    if (previousSource !== undefined) {
      throw new Error(`instruction sources ${previousSource} and ${module.source} produce duplicate module tag ${tag}`);
    }
    tagSources.set(tag, module.source);
    rendered.push(`<${tag}>

${content}

</${tag}>`);
  }
  return composeInstructions(rendered);
}
function renderVsCode(invariants, preferences) {
  const sections = [
    `<!-- agent-policy: invariants -->
${normalizeInstruction(invariants).trimEnd()}`,
    `<!-- agent-policy: preferences -->
${normalizeInstruction(preferences).trimEnd()}`
  ];
  return [
    "---",
    'applyTo: "**"',
    "---",
    "",
    sections.join(`

`),
    ""
  ].join(`
`);
}
var CODEX_BEGIN = "# >>> agent-policy developer_instructions >>>";
var CODEX_END = "# <<< agent-policy developer_instructions <<<";
function renderCodexBlock(instructions) {
  const normalized = normalizeInstruction(instructions).trimEnd();
  if (normalized.includes('"""'))
    throw new Error("canonical Codex instructions cannot contain a TOML multiline-string delimiter");
  return `${CODEX_BEGIN}
developer_instructions = """
${normalized}
"""
${CODEX_END}
`;
}
function managedCodexBlock(config) {
  const normalized = normalizeInstruction(config);
  const start = normalized.indexOf(CODEX_BEGIN);
  const end = normalized.indexOf(CODEX_END);
  if (start < 0 && end < 0)
    return;
  if (start < 0 || end < 0 || end < start)
    throw new Error("Codex managed-region delimiters are malformed");
  const trailing = end + CODEX_END.length;
  if (normalized.slice(trailing).startsWith(`
`))
    return normalized.slice(start, trailing + 1);
  return normalized.slice(start, trailing);
}
function renderCodexConfig(existing, instructions, adoptUnmanaged = false) {
  const block = renderCodexBlock(instructions);
  if (existing === undefined)
    return { desired: block, owned: block };
  const normalized = normalizeInstruction(existing);
  const managed = managedCodexBlock(normalized);
  if (managed !== undefined) {
    return { desired: normalized.replace(managed, block), owned: block };
  }
  if (/^developer_instructions\s*=/m.test(normalized)) {
    if (adoptUnmanaged) {
      const assignment = /^developer_instructions\s*=\s*"""\n[\s\S]*?^"""\n?/m.exec(normalized);
      if (!assignment)
        throw new Error("unmanaged Codex developer_instructions is not a supported multiline TOML string");
      return { desired: normalized.replace(assignment[0], block), owned: block };
    }
    throw new Error("Codex developer_instructions is unmanaged; run adopt explicitly before sync");
  }
  return { desired: `${normalized.trimEnd()}

${block}`, owned: block };
}

// src/targets.ts
import path6 from "node:path";
function namedHomes(name, config) {
  return [
    { id: name, home: config.home },
    ...(config.additionalHomes || []).map(({ id, home }) => ({ id: `${name}-${id}`, home }))
  ];
}
function agentDirectories(config) {
  if (config.resources?.agents !== true)
    return [];
  return [
    ...config.harnesses.pi.enabled ? [{ id: "pi", directory: path6.join(config.harnesses.pi.agentDir, "agents"), extension: ".md" }] : [],
    ...config.harnesses.codex.enabled ? namedHomes("codex", config.harnesses.codex).map(({ id, home }) => ({ id, directory: path6.join(home, "agents"), extension: ".toml" })) : []
  ];
}
function renderTargets(config, sources, codexConfigs = {}, adoptUnmanaged = false) {
  const targets = [];
  if (config.resources?.instructions !== false) {
    const layers = {};
    for (const harness of HARNESS_NAMES) {
      const systemModules = renderInstructionModules(sources.harnessInstructions[harness].system);
      const agentsModules = renderInstructionModules(sources.harnessInstructions[harness].agents);
      const introduction = systemModules || agentsModules ? "Follow the instructions in the tagged modules below." : "";
      layers[harness] = {
        system: composeInstructions([
          sources.invariants,
          introduction,
          systemModules
        ]),
        agents: composeInstructions([
          sources.preferences,
          sources.technologyDefaults,
          agentsModules
        ])
      };
    }
    if (config.harnesses.pi.enabled) {
      const agentDir = config.harnesses.pi.agentDir;
      const piInstructions = composeInstructions([sources.piAppendSystem]);
      targets.push({ id: "pi-system", kind: "file", path: path6.join(agentDir, "SYSTEM.md"), desired: layers.pi.system, owned: layers.pi.system }, { id: "pi-agents", kind: "file", path: path6.join(agentDir, "AGENTS.md"), desired: layers.pi.agents, owned: layers.pi.agents }, { id: "pi-append-system", kind: "file", path: path6.join(agentDir, "APPEND_SYSTEM.md"), desired: piInstructions, owned: piInstructions });
    }
    if (config.harnesses.codex.enabled) {
      for (const { id, home } of namedHomes("codex", config.harnesses.codex)) {
        const target = renderCodexConfig(codexConfigs[id], layers.codex.system, adoptUnmanaged);
        targets.push({ id: `${id}-config`, kind: "codex", path: path6.join(home, "config.toml"), ...target });
        targets.push({ id: `${id}-agents`, kind: "file", path: path6.join(home, "AGENTS.md"), desired: layers.codex.agents, owned: layers.codex.agents });
      }
    }
    if (config.harnesses.zed?.enabled) {
      const instructions = composeInstructions([
        layers.zed.system,
        layers.zed.agents
      ]);
      for (const { id, home } of namedHomes("zed", config.harnesses.zed)) {
        targets.push({ id: `${id}-agents`, kind: "file", path: path6.join(home, "AGENTS.md"), desired: instructions, owned: instructions });
      }
    }
    if (config.harnesses.vscode.enabled) {
      const output = renderVsCode(layers.vscode.system, layers.vscode.agents);
      for (const [index, target] of config.harnesses.vscode.targets.entries()) {
        targets.push({ id: `vscode-${index}`, kind: "file", path: target, desired: output, owned: output });
      }
    }
  }
  if (config.resources?.agents === true) {
    for (const agent of sources.agents || []) {
      if (config.harnesses.pi.enabled && agent.pi) {
        const desired = renderPiAgent(agent);
        targets.push({ id: `pi-agent-${agent.id}`, kind: "file", path: path6.join(config.harnesses.pi.agentDir, "agents", `${agent.pi.name}.md`), desired, owned: desired, agentDirectory: path6.join(config.harnesses.pi.agentDir, "agents") });
      }
      if (config.harnesses.codex.enabled && agent.codex) {
        const desired = renderCodexAgent(agent);
        for (const { id, home } of namedHomes("codex", config.harnesses.codex)) {
          targets.push({ id: `${id}-agent-${agent.id}`, kind: "file", path: path6.join(home, "agents", `${agent.id}.toml`), desired, owned: desired, agentDirectory: path6.join(home, "agents") });
        }
      }
    }
    if (config.harnesses.codex.enabled) {
      const homes = [{ id: "codex", home: config.harnesses.codex.home, retiredAgents: config.harnesses.codex.retiredAgents }, ...(config.harnesses.codex.additionalHomes || []).map((home) => ({ ...home, id: `codex-${home.id}` }))];
      for (const home of homes) {
        for (const file of home.retiredAgents || [])
          targets.push({ id: `${home.id}-agent-retired-${file.slice(0, -5)}`, kind: "file", path: path6.join(home.home, "agents", file), desired: "", owned: "", agentDirectory: path6.join(home.home, "agents"), operation: "delete" });
      }
    }
  }
  const paths = new Set;
  for (const target of targets) {
    if (paths.has(target.path))
      throw new Error(`duplicate target path: ${target.path}`);
    paths.add(target.path);
  }
  return targets;
}

// src/sync.ts
function hash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}
function ownedContent(target, existing) {
  if (existing === undefined)
    return;
  return target.kind === "codex" ? managedCodexBlock(existing) : normalizeInstruction(existing);
}
async function assessTargets(config, state, sources, io = nodeFileOps, adoptUnmanaged = false) {
  const codexHomes = config.harnesses.codex.enabled && config.resources?.instructions !== false ? [
    { id: "codex", home: config.harnesses.codex.home },
    ...(config.harnesses.codex.additionalHomes || []).map(({ id, home }) => ({
      id: `codex-${id}`,
      home
    }))
  ] : [];
  const codexConfigs = {};
  for (const { id, home } of codexHomes)
    codexConfigs[id] = await readOptional(io, path7.join(home, "config.toml"));
  const targets = renderTargets(config, sources, codexConfigs, true);
  for (const [id, prior] of Object.entries(state.targets)) {
    if (prior.agentDirectory === undefined || targets.some((target) => target.id === id))
      continue;
    const scope = agentDirectories(config).find((scope2) => scope2.directory === prior.agentDirectory && id.startsWith(`${scope2.id}-agent-`));
    if (!scope)
      continue;
    if (path7.dirname(prior.path) !== scope.directory || path7.extname(prior.path) !== scope.extension)
      throw new Error(`invalid managed agent path for ${id}`);
    targets.push({
      id,
      path: prior.path,
      kind: "file",
      desired: "",
      owned: "",
      agentDirectory: scope.directory,
      operation: "delete"
    });
  }
  const targetPaths = new Set;
  for (const target of targets) {
    if (targetPaths.has(target.path))
      throw new Error(`duplicate target path: ${target.path}; resolve the managed agent identity before syncing`);
    targetPaths.add(target.path);
  }
  const assessments = [];
  for (const target of targets) {
    const existing = target.kind === "codex" ? codexConfigs[target.id.slice(0, -"-config".length)] : await readOptional(io, target.path);
    const owned = ownedContent(target, existing);
    const prior = state.targets[target.id];
    if (target.operation === "delete") {
      const status = existing === undefined ? prior ? "obsolete" : "current" : prior?.path === target.path && prior.agentDirectory === target.agentDirectory && owned !== undefined && hash(owned) === prior.ownedHash ? "obsolete" : "conflict";
      assessments.push({
        target,
        existing,
        status,
        detail: status === "current" ? "retired agent is absent" : status === "obsolete" ? "managed agent is scheduled for removal" : "obsolete agent is unmanaged or changed independently; preserve it or adopt explicitly"
      });
      continue;
    }
    if (prior) {
      if (prior.path !== target.path || owned === undefined) {
        assessments.push({
          target,
          status: "conflict",
          existing,
          detail: "target is missing or no longer has its managed region"
        });
      } else if (hash(owned) !== prior.ownedHash) {
        assessments.push({
          target,
          status: "conflict",
          existing,
          detail: "target changed independently since the last successful sync"
        });
      } else if (hash(target.owned) !== prior.ownedHash) {
        assessments.push({ target, status: "stale", existing, detail: "canonical source changed" });
      } else {
        assessments.push({ target, status: "current", existing, detail: "current" });
      }
      continue;
    }
    if (existing === undefined) {
      assessments.push({ target, status: "missing", detail: "target does not exist" });
    } else if (owned !== undefined && hash(owned) === hash(target.owned)) {
      assessments.push({
        target,
        status: "untracked",
        existing,
        detail: "target matches rendered output but is not in local state"
      });
    } else {
      assessments.push({
        target,
        status: "conflict",
        existing,
        detail: "target is unmanaged and differs from rendered output; run adopt explicitly"
      });
    }
  }
  return assessments;
}
async function loadState(statePath, io = nodeFileOps, domain) {
  const raw = await readOptional(io, statePath);
  if (raw === undefined)
    return emptyState();
  return parsePolicyState(raw, domain);
}
async function synchronize(config, state, statePath, sources, options = {}, io = nodeFileOps) {
  const stateSnapshot = await readOptional(io, statePath);
  if (!isDeepStrictEqual2(stateSnapshot === undefined ? emptyState() : parsePolicyState(stateSnapshot), state))
    throw new Error("ownership state changed; reload it before synchronizing");
  const assessments = await assessTargets(config, state, sources, io, options.adopt === true);
  const selected = options.adoptAll ? new Set(assessments.map((item) => item.target.id)) : options.adoptTargets;
  const blocked = assessments.filter((item) => {
    if (options.adopt && selected?.has(item.target.id) && item.status !== "missing")
      return false;
    return item.status === "conflict";
  });
  const issues = [];
  if (blocked.length > 0)
    issues.push(`sync preflight failed: ${blocked.map((item) => item.target.id).join(", ")}`);
  if (options.adopt && selected) {
    const unknown = [...selected].filter((id) => !assessments.some((item) => item.target.id === id));
    if (unknown.length > 0)
      issues.push(`unknown target(s): ${unknown.join(", ")}`);
  }
  const writes = assessments.filter((item) => {
    if (item.target.operation === "delete")
      return item.existing !== undefined && !options.adopt;
    if (options.adopt)
      return selected?.has(item.target.id) === true && item.status !== "missing" && item.existing !== item.target.desired;
    return item.status === "missing" || item.status === "stale";
  });
  const nextState = { schemaVersion: 1, targets: { ...state.targets } };
  for (const item of assessments) {
    if (item.target.operation === "delete") {
      if (!options.adopt)
        delete nextState.targets[item.target.id];
      else if (selected?.has(item.target.id) && item.existing !== undefined)
        nextState.targets[item.target.id] = {
          path: item.target.path,
          ownedHash: hash(normalizeInstruction(item.existing)),
          agentDirectory: item.target.agentDirectory
        };
      continue;
    }
    const normalSyncRecord = !options.adopt && ["current", "stale", "missing", "untracked"].includes(item.status);
    const adoptedRecord = options.adopt && selected?.has(item.target.id) && item.status !== "missing";
    if (normalSyncRecord || adoptedRecord)
      nextState.targets[item.target.id] = {
        path: item.target.path,
        ownedHash: hash(item.target.owned),
        ...item.target.agentDirectory ? { agentDirectory: item.target.agentDirectory } : {}
      };
  }
  const actions = assessments.map((item) => {
    const id = item.target.id;
    let action = "unchanged";
    if (blocked.includes(item))
      action = "blocked";
    else if (writes.includes(item))
      action = item.target.operation === "delete" ? "remove" : item.existing === undefined ? "create" : "update";
    else if (state.targets[id] && !nextState.targets[id])
      action = "forget";
    else if (!isDeepStrictEqual2(state.targets[id], nextState.targets[id]))
      action = "record";
    else if (options.adopt && (!selected?.has(id) || item.status === "missing"))
      action = "skip";
    return { id, path: item.target.path, action };
  });
  const stateChanged = !isDeepStrictEqual2(state, nextState);
  if (options.dryRun)
    return { assessments, actions, issues, stateChanged, changed: [], backups: [] };
  if (issues.length)
    throw new Error(issues.join("; "));
  const changes = writes.map((item) => ({
    id: item.target.id,
    path: item.target.path,
    existing: item.existing,
    desired: item.target.operation === "delete" ? undefined : item.target.desired
  }));
  if (stateChanged)
    changes.push({
      id: "ownership-state",
      path: statePath,
      existing: stateSnapshot,
      desired: `${JSON.stringify(nextState, null, 2)}
`
    });
  const backups = await commitChanges(changes, path7.dirname(statePath), io);
  return {
    assessments,
    actions,
    issues,
    stateChanged,
    changed: writes.map((item) => item.target.id),
    backups
  };
}

// src/commands.ts
var commandNames = { instructions: "instruction-sync", agents: "agent-sync" };
function parseArguments(argv) {
  const result = { positional: [], values: new Map, flags: new Set };
  for (let index = 0;index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      result.positional.push(argument);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result.values.set(argument, [...result.values.get(argument) || [], next]);
      index += 1;
    } else {
      if (result.flags.has(argument))
        throw new Error(`${argument} must be supplied once`);
      result.flags.add(argument);
    }
  }
  return result;
}
function value(args, name) {
  return args.values.get(name)?.at(-1);
}
function values(args, name) {
  return args.values.get(name) || [];
}
function validateArguments(domain, command, args) {
  if (!["configure", "doctor", "check", "sync", "adopt"].includes(command))
    throw new Error(`unknown command: ${command}`);
  if (args.positional.length !== 1)
    throw new Error("expected one command");
  const harnesses = domainHarnesses[domain];
  const configureValues = [
    "--pi-agent-dir",
    "--codex-home",
    "--codex-additional-home",
    ...domain === "instructions" ? ["--zed-home", "--zed-additional-home", "--vscode-target"] : []
  ];
  const allowedValues = [
    "--config",
    "--state",
    ...command === "configure" ? [...configureValues, "--legacy-config", "--legacy-state"] : [],
    ...command === "adopt" ? ["--target"] : []
  ];
  const allowedFlags = [
    "--help",
    ...["configure", "sync", "adopt"].includes(command) ? ["--dry-run"] : [],
    ...["configure", "adopt"].includes(command) ? ["--apply"] : [],
    ...command === "configure" ? [
      "--import-legacy",
      "--enable",
      "--disable",
      ...harnesses.flatMap((name) => [`--enable-${name}`, `--disable-${name}`])
    ] : [],
    ...command === "adopt" ? ["--all"] : []
  ];
  const repeatable = [
    "--target",
    "--codex-additional-home",
    "--zed-additional-home",
    "--vscode-target"
  ];
  for (const [option, entries] of args.values) {
    if (!allowedValues.includes(option))
      throw new Error(`unknown or invalid option: ${option}`);
    if (entries.length > 1 && !repeatable.includes(option))
      throw new Error(`${option} must be supplied once`);
  }
  for (const option of args.flags) {
    if (allowedValues.includes(option))
      throw new Error(`${option} requires a value`);
    if (!allowedFlags.includes(option))
      throw new Error(`unknown option: ${option}`);
  }
  if (args.flags.has("--apply") && args.flags.has("--dry-run"))
    throw new Error("--apply and --dry-run cannot be combined");
  for (const name of ["", ...harnesses.map((name2) => `-${name2}`)]) {
    if (args.flags.has(`--enable${name}`) && args.flags.has(`--disable${name}`))
      throw new Error(`--enable${name} and --disable${name} cannot be combined`);
  }
  if (command === "adopt" && args.flags.has("--all") && values(args, "--target").length)
    throw new Error("--all and --target cannot be combined");
  if ((value(args, "--legacy-config") || value(args, "--legacy-state")) && !args.flags.has("--import-legacy"))
    throw new Error("legacy paths require --import-legacy");
  if (args.flags.has("--import-legacy") && (configureValues.some((option) => args.values.has(option)) || [...args.flags].some((option) => option.startsWith("--enable") || option.startsWith("--disable"))))
    throw new Error("import legacy settings first, then configure destinations or enabled status");
}
function usage(domain) {
  const name = commandNames[domain];
  const instructionOptions = domain === "instructions" ? `
  --zed-home PATH --zed-additional-home ID=PATH (repeatable)
  --vscode-target PATH (repeatable)
  --enable-vscode --disable-vscode --enable-zed --disable-zed` : "";
  return `Usage: ${name} <configure|doctor|check|sync|adopt> [options]

Manages ${domain} only.

Global options:
  --config PATH       ${domain}.config.json adjacent to the tool by default
  --state PATH        Independent ${domain} ownership state
  --help              Display this command's help

sync options:
  --dry-run           Preview changes and conflicts without writing anything

configure options:
  --dry-run           Preview configuration (the default)
  --apply             Write the displayed configuration
  --import-legacy     Import this domain's legacy settings and ownership
  --legacy-config PATH --legacy-state PATH (optional import source overrides)
  --enable --disable  Enable or disable this workflow only
  --pi-agent-dir PATH --codex-home PATH
  --codex-additional-home ID=PATH (repeatable)
  --enable-pi --disable-pi --enable-codex --disable-codex${instructionOptions}

adopt options:
  --dry-run           Preview adoption without writing anything
  --apply             Apply adoption with recovery backups
  --target ID         Adopt one existing target (repeatable)
  --all               Adopt every existing target in this domain
`;
}
function setAdditionalHomes(config, entries, option) {
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    if (separator < 1)
      throw new Error(`${option} requires ID=PATH`);
    const id = entry.slice(0, separator);
    const home = entry.slice(separator + 1);
    config.additionalHomes ||= [];
    const existing = config.additionalHomes.find((item) => item.id === id);
    if (existing)
      existing.home = home;
    else
      config.additionalHomes.push({ id, home });
  }
}
function configuredPolicy(base, domain, args) {
  const result = structuredClone(base);
  const pi = value(args, "--pi-agent-dir");
  const codex = value(args, "--codex-home");
  if (pi)
    result.harnesses.pi.agentDir = pi;
  if (codex)
    result.harnesses.codex.home = codex;
  setAdditionalHomes(result.harnesses.codex, values(args, "--codex-additional-home"), "--codex-additional-home");
  if (domain === "instructions") {
    const zed = value(args, "--zed-home");
    const additional = values(args, "--zed-additional-home");
    if (zed || additional.length || args.flags.has("--enable-zed") || args.flags.has("--disable-zed"))
      result.harnesses.zed ||= { enabled: false };
    if (zed)
      result.harnesses.zed.home = zed;
    if (additional.length)
      setAdditionalHomes(result.harnesses.zed, additional, "--zed-additional-home");
    const vscode = values(args, "--vscode-target");
    if (vscode.length)
      result.harnesses.vscode.targets = vscode;
  }
  for (const name of domainHarnesses[domain]) {
    if (args.flags.has(`--enable-${name}`))
      result.harnesses[name].enabled = true;
    if (args.flags.has(`--disable-${name}`))
      result.harnesses[name].enabled = false;
  }
  if (args.flags.has("--enable") || args.flags.has("--disable"))
    result.resources = {
      instructions: domain === "instructions" && args.flags.has("--enable"),
      agents: domain === "agents" && args.flags.has("--enable")
    };
  return parsePolicyConfig(JSON.stringify(profileConfig(result, domain)), process3.platform, domain);
}
function printAssessments(items, changed = new Set) {
  const width = Math.max(18, ...items.map(({ target }) => target.id.length));
  for (const item of items) {
    const written = changed.has(item.target.id) && item.status === "current";
    const removed = written && item.target.operation === "delete";
    const status = removed ? "removed" : written ? "changed" : item.status;
    const detail = removed ? "deleted this run" : written ? "written this run" : item.detail;
    console.log(`${status.padEnd(10)} ${item.target.id.padEnd(width)} ${item.target.path} — ${detail}`);
  }
}
function printBackups(backups) {
  if (backups.length)
    console.log(`Backups: ${path8.dirname(backups[0])} (${backups.length} ${backups.length === 1 ? "file" : "files"})`);
}
function printWriteResults(items, result) {
  const changed = new Set(result.changed);
  const removed = result.assessments.filter((item) => changed.has(item.target.id) && item.target.operation === "delete");
  items = [
    ...items.filter((item) => !removed.some((removed2) => removed2.target.id === item.target.id)),
    ...removed.map((item) => ({ ...item, status: "current" }))
  ];
  console.log(changed.size ? `Changed ${changed.size} target${changed.size === 1 ? "" : "s"}.` : "No target files changed.");
  printAssessments([...items].sort((a, b) => Number(changed.has(b.target.id)) - Number(changed.has(a.target.id))), changed);
  printBackups(result.backups);
}
function printPlan(operations, stateChanged) {
  const width = Math.max(18, ...operations.map((item) => item.id.length));
  const counts = new Map;
  for (const item of operations) {
    const action = "action" in item ? item.action : item.desired === undefined ? "remove" : item.existing === undefined ? "create" : "update";
    console.log(`${action.padEnd(10)} ${item.id.padEnd(width)} ${item.path}`);
    counts.set(action, (counts.get(action) || 0) + 1);
  }
  console.log(`Plan: ${[...counts].map(([action, count]) => `${count} ${action}`).join(", ") || "no changes"}. Ownership state: ${stateChanged ? "would update" : "unchanged"}.`);
}
function printPreview(result) {
  printPlan(result.actions, result.stateChanged);
  for (const issue of result.issues)
    console.error(issue);
  console.log("Preview only. No files changed.");
}
async function main(domain, moduleUrl, argv, io) {
  const name = commandNames[domain];
  const args = parseArguments(argv);
  const command = args.positional[0];
  if (!command && args.flags.has("--help") || command === "help" || !argv.length) {
    console.log(usage(domain));
    return;
  }
  if (!command)
    throw new Error("expected one command");
  validateArguments(domain, command, args);
  if (args.flags.has("--help")) {
    console.log(usage(domain));
    return;
  }
  const environment = currentEnvironment();
  const toolDirectory = path8.resolve(path8.dirname(fileURLToPath(moduleUrl)), "..");
  const repositoryRoot = path8.resolve(toolDirectory, "../..");
  const configPath = path8.resolve(value(args, "--config") || defaultConfigPath(environment, toolDirectory, domain));
  const statePath = path8.resolve(value(args, "--state") || defaultStatePath(environment, domain));
  if (configPath === statePath)
    throw new Error("configuration and ownership state must use different paths");
  if (command === "configure" && args.flags.has("--import-legacy")) {
    const result2 = await importLegacy(domain, {
      config: configPath,
      state: statePath,
      legacyConfig: value(args, "--legacy-config") || defaultConfigPath(environment, toolDirectory),
      legacyState: value(args, "--legacy-state") || defaultStatePath(environment)
    }, !args.flags.has("--apply"), io);
    console.log(`Configuration: ${configPath}
${JSON.stringify(result2.profile, null, 2)}
State: ${statePath}
Ownership records: ${Object.keys(result2.state.targets).length}`);
    printPlan(result2.changes, result2.changes.some((change) => change.id === "ownership-state"));
    console.log(args.flags.has("--apply") ? result2.changes.length ? "Legacy settings and ownership imported. Runtime targets unchanged." : "Legacy settings and ownership already imported." : "Preview only. Re-run with --apply to import settings and ownership.");
    printBackups(result2.backups);
    return;
  }
  const rawConfig = await readOptional(io, configPath);
  if (command === "configure") {
    const base = rawConfig ? parsePolicyConfig(rawConfig, environment.platform, domain) : defaultPolicyConfig(environment, domain);
    const rendered = `${JSON.stringify(profileConfig(configuredPolicy(base, domain, args), domain), null, 2)}
`;
    const changes = rawConfig === rendered ? [] : [{ id: "configuration", path: configPath, existing: rawConfig, desired: rendered }];
    console.log(`Configuration: ${configPath}
${rendered}`);
    printPlan(changes, false);
    if (!args.flags.has("--apply")) {
      console.log("Preview only. Re-run with --apply to write this configuration.");
      return;
    }
    const backups = await commitChanges(changes, path8.dirname(statePath), io);
    console.log(changes.length ? "Configuration written." : "Configuration unchanged.");
    printBackups(backups);
    return;
  }
  if (!rawConfig)
    throw new Error(`configuration does not exist: ${configPath}; run ${name} configure or provide --config`);
  const config = parsePolicyConfig(rawConfig, environment.platform, domain);
  if (!config.resources?.[domain])
    throw new Error(`${name} is disabled; run configure --enable --apply`);
  const state = await loadState(statePath, io, domain);
  const sources = await loadCanonicalSources(repositoryRoot, {
    instructions: domain === "instructions",
    agents: domain === "agents"
  });
  if (command === "doctor" || command === "check") {
    const assessments = await assessTargets(config, state, sources, io);
    console.log(`Config: ${configPath}
State:  ${statePath}`);
    printAssessments(assessments);
    if (assessments.some((item) => item.status !== "current"))
      process3.exitCode = 1;
    return;
  }
  const adopt = command === "adopt";
  if (adopt && !args.flags.has("--apply") && !args.flags.has("--dry-run"))
    throw new Error("adopt requires --dry-run or --apply");
  const selected = new Set(values(args, "--target"));
  if (adopt && !selected.size && !args.flags.has("--all"))
    throw new Error("adopt requires --target or --all");
  const result = await synchronize(config, state, statePath, sources, {
    adopt,
    adoptTargets: adopt ? selected : undefined,
    adoptAll: adopt && args.flags.has("--all"),
    dryRun: args.flags.has("--dry-run")
  }, io);
  if (args.flags.has("--dry-run")) {
    printPreview(result);
    if (result.issues.length)
      process3.exitCode = 2;
    return;
  }
  const updated = await assessTargets(config, await loadState(statePath, io, domain), sources, io);
  printWriteResults(adopt && !args.flags.has("--all") ? updated.filter((item) => selected.has(item.target.id)) : updated, result);
}
async function runCli(domain, moduleUrl, argv = process3.argv.slice(2), io = nodeFileOps) {
  try {
    await main(domain, moduleUrl, argv, io);
  } catch (error) {
    console.error(`${commandNames[domain]}: ${error?.message || error}`);
    process3.exitCode = 2;
  }
}

// src/agent-sync.ts
await runCli("agents", import.meta.url);
