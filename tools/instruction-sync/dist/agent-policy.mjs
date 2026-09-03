#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// src/config.ts
var exports_config = {};
__export(exports_config, {
  parsePolicyState: () => parsePolicyState,
  parsePolicyConfig: () => parsePolicyConfig,
  emptyState: () => emptyState,
  defaultStatePath: () => defaultStatePath,
  defaultPolicyConfig: () => defaultPolicyConfig,
  defaultConfigPath: () => defaultConfigPath,
  currentEnvironment: () => currentEnvironment
});
import os from "node:os";
import path from "node:path";
import process from "node:process";
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
function defaultConfigPath(environment = currentEnvironment()) {
  if (environment.platform === WINDOWS) {
    return environment.env.APPDATA ? path.win32.join(environment.env.APPDATA, "agent-policy", "config.json") : homePath(environment, "AppData", "Roaming", "agent-policy", "config.json");
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "agent-policy", "config.json");
  }
  return environment.env.XDG_CONFIG_HOME ? path.posix.join(environment.env.XDG_CONFIG_HOME, "agent-policy", "config.json") : homePath(environment, ".config", "agent-policy", "config.json");
}
function defaultStatePath(environment = currentEnvironment()) {
  if (environment.platform === WINDOWS) {
    return environment.env.LOCALAPPDATA ? path.win32.join(environment.env.LOCALAPPDATA, "agent-policy", "state.json") : homePath(environment, "AppData", "Local", "agent-policy", "state.json");
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "agent-policy", "state.json");
  }
  return environment.env.XDG_STATE_HOME ? path.posix.join(environment.env.XDG_STATE_HOME, "agent-policy", "state.json") : homePath(environment, ".local", "state", "agent-policy", "state.json");
}
function defaultPolicyConfig(environment = currentEnvironment()) {
  const codexHome = environment.env.CODEX_HOME || homePath(environment, ".codex");
  const vscodeTarget = platformPath(environment.platform).join(defaultCodeProfile(environment), "instructions", "agent-policy.instructions.md");
  return {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: true, agentDir: homePath(environment, ".pi", "agent") },
      codex: { enabled: true, home: codexHome },
      vscode: { enabled: true, targets: [vscodeTarget] }
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
function assertAbsolute(value, label) {
  if (!path.isAbsolute(value) && !path.win32.isAbsolute(value))
    throw new Error(`${label} must be an absolute path`);
}
function parsePolicyConfig(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("configuration is not valid JSON");
  }
  if (!isObject(parsed))
    throw new Error("configuration must be an object");
  assertKeys(parsed, ["schemaVersion", "harnesses"], "configuration");
  if (parsed.schemaVersion !== 1 || !isObject(parsed.harnesses))
    throw new Error("configuration must have schemaVersion 1 and harnesses");
  assertKeys(parsed.harnesses, ["pi", "codex", "vscode"], "harnesses");
  const pi = assertHarness(parsed.harnesses.pi, "pi");
  const codex = assertHarness(parsed.harnesses.codex, "codex");
  const vscode = assertHarness(parsed.harnesses.vscode, "vscode");
  assertKeys(pi, ["enabled", "agentDir"], "harnesses.pi");
  assertKeys(codex, ["enabled", "home"], "harnesses.codex");
  assertKeys(vscode, ["enabled", "targets"], "harnesses.vscode");
  if (pi.enabled && typeof pi.agentDir !== "string")
    throw new Error("enabled Pi harness requires agentDir");
  if (codex.enabled && typeof codex.home !== "string")
    throw new Error("enabled Codex harness requires home");
  if (vscode.enabled && (!Array.isArray(vscode.targets) || vscode.targets.length === 0 || vscode.targets.some((target) => typeof target !== "string"))) {
    throw new Error("enabled VS Code harness requires a non-empty targets array");
  }
  if (typeof pi.agentDir === "string")
    assertAbsolute(pi.agentDir, "harnesses.pi.agentDir");
  if (typeof codex.home === "string")
    assertAbsolute(codex.home, "harnesses.codex.home");
  if (Array.isArray(vscode.targets))
    vscode.targets.forEach((target) => assertAbsolute(target, "harnesses.vscode.targets"));
  return parsed;
}
function parsePolicyState(raw) {
  const parsed = JSON.parse(raw);
  if (!isObject(parsed) || parsed.schemaVersion !== 1 || !isObject(parsed.targets))
    throw new Error("state is malformed");
  for (const [id, target] of Object.entries(parsed.targets)) {
    if (!isObject(target) || typeof target.path !== "string" || typeof target.ownedHash !== "string")
      throw new Error(`state target ${id} is malformed`);
  }
  return parsed;
}
function emptyState() {
  return { schemaVersion: 1, targets: {} };
}
var WINDOWS = "win32";
var init_config = () => {};

// src/cli.ts
init_config();
import fs2 from "node:fs/promises";
import path4 from "node:path";
import process3 from "node:process";
import { fileURLToPath } from "node:url";

// src/renderers.ts
function normalizeInstruction(source) {
  return source.replace(/^\uFEFF/, "").replace(/\r\n?/g, `
`).replace(/\n*$/, `
`);
}
function renderVsCode(invariants, preferences) {
  return [
    "---",
    'applyTo: "**"',
    "---",
    "",
    "<!-- agent-policy: invariants -->",
    normalizeInstruction(invariants).trimEnd(),
    "",
    "<!-- agent-policy: preferences -->",
    normalizeInstruction(preferences).trimEnd(),
    ""
  ].join(`
`);
}
var CODEX_BEGIN = "# >>> agent-policy developer_instructions >>>";
var CODEX_END = "# <<< agent-policy developer_instructions <<<";
function renderCodexBlock(invariants) {
  const normalized = normalizeInstruction(invariants).trimEnd();
  if (normalized.includes('"""'))
    throw new Error("canonical invariants cannot contain a TOML multiline-string delimiter");
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
function renderCodexConfig(existing, invariants, adoptUnmanaged = false) {
  const block = renderCodexBlock(invariants);
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

// src/sync.ts
init_config();
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path3 from "node:path";
import process2 from "node:process";

// src/targets.ts
import path2 from "node:path";
function renderTargets(config, sources, codexConfig, adoptUnmanaged = false) {
  const targets = [];
  if (config.harnesses.pi.enabled) {
    const agentDir = config.harnesses.pi.agentDir;
    targets.push({ id: "pi-system", kind: "file", path: path2.join(agentDir, "SYSTEM.md"), desired: sources.invariants, owned: sources.invariants }, { id: "pi-agents", kind: "file", path: path2.join(agentDir, "AGENTS.md"), desired: sources.preferences, owned: sources.preferences }, { id: "pi-append-system", kind: "file", path: path2.join(agentDir, "APPEND_SYSTEM.md"), desired: sources.piAppend, owned: sources.piAppend });
  }
  if (config.harnesses.codex.enabled) {
    const target = renderCodexConfig(codexConfig, sources.invariants, adoptUnmanaged);
    targets.push({ id: "codex-config", kind: "codex", path: path2.join(config.harnesses.codex.home, "config.toml"), ...target });
    targets.push({ id: "codex-agents", kind: "file", path: path2.join(config.harnesses.codex.home, "AGENTS.md"), desired: sources.preferences, owned: sources.preferences });
  }
  if (config.harnesses.vscode.enabled) {
    const output = renderVsCode(sources.invariants, sources.preferences);
    for (const [index, target] of config.harnesses.vscode.targets.entries()) {
      targets.push({ id: `vscode-${index}`, kind: "file", path: target, desired: output, owned: output });
    }
  }
  return targets;
}

// src/sync.ts
var nodeFileOps = fs;
function hash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}
async function readOptional(io, targetPath) {
  try {
    return normalizeInstruction(await io.readFile(targetPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT")
      return;
    throw error;
  }
}
function ownedContent(target, existing) {
  if (existing === undefined)
    return;
  return target.kind === "codex" ? managedCodexBlock(existing) : existing;
}
async function assessTargets(config, state, sources, io = nodeFileOps, adoptUnmanaged = false) {
  const codexPath = config.harnesses.codex.enabled ? path3.join(config.harnesses.codex.home, "config.toml") : undefined;
  const codexConfig = codexPath ? await readOptional(io, codexPath) : undefined;
  const targets = renderTargets(config, sources, codexConfig, adoptUnmanaged);
  const assessments = [];
  for (const target of targets) {
    const existing = target.path === codexPath ? codexConfig : await readOptional(io, target.path);
    const owned = ownedContent(target, existing);
    const prior = state.targets[target.id];
    if (prior) {
      if (prior.path !== target.path || owned === undefined) {
        assessments.push({ target, status: "conflict", existing, detail: "target is missing or no longer has its managed region" });
      } else if (hash(owned) !== prior.ownedHash) {
        assessments.push({ target, status: "conflict", existing, detail: "target changed independently since the last successful sync" });
      } else if (hash(target.owned) !== prior.ownedHash) {
        assessments.push({ target, status: "stale", existing, detail: "canonical instructions changed" });
      } else {
        assessments.push({ target, status: "current", existing, detail: "current" });
      }
      continue;
    }
    if (existing === undefined) {
      assessments.push({ target, status: "missing", detail: "target does not exist" });
    } else if (owned !== undefined && hash(owned) === hash(target.owned)) {
      assessments.push({ target, status: "untracked", existing, detail: "target matches rendered output but is not in local state" });
    } else {
      assessments.push({ target, status: "conflict", existing, detail: "target is unmanaged and differs from rendered output; run adopt explicitly" });
    }
  }
  return assessments;
}
function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
function backupName(id) {
  return `${id.replace(/[^a-z0-9-]/gi, "_")}.bak`;
}
async function atomicWrite(io, destination, content) {
  const directory = path3.dirname(destination);
  await io.mkdir(directory, { recursive: true });
  const temporary = path3.join(directory, `.${path3.basename(destination)}.agent-policy-${process2.pid}-${Date.now()}.tmp`);
  await io.writeFile(temporary, content, "utf8");
  await io.rename(temporary, destination);
}
async function writeState(io, statePath, state) {
  await atomicWrite(io, statePath, `${JSON.stringify(state, null, 2)}
`);
}
async function loadState(statePath, io = nodeFileOps) {
  const raw = await readOptional(io, statePath);
  if (raw === undefined)
    return emptyState();
  const { parsePolicyState: parsePolicyState2 } = await Promise.resolve().then(() => (init_config(), exports_config));
  return parsePolicyState2(raw);
}
async function synchronize(config, state, statePath, sources, options = {}, io = nodeFileOps) {
  const assessments = await assessTargets(config, state, sources, io, options.adopt === true);
  const selected = options.adoptTargets;
  const blocked = assessments.filter((item) => {
    if (options.adopt && selected?.has(item.target.id) && item.status !== "missing")
      return false;
    return item.status === "conflict";
  });
  if (blocked.length > 0)
    throw new Error(`sync preflight failed: ${blocked.map((item) => item.target.id).join(", ")}`);
  if (options.adopt && selected) {
    const unknown = [...selected].filter((id) => !assessments.some((item) => item.target.id === id));
    if (unknown.length > 0)
      throw new Error(`unknown target(s): ${unknown.join(", ")}`);
  }
  const writes = assessments.filter((item) => {
    if (options.adopt)
      return selected?.has(item.target.id) === true && item.status !== "missing" && item.existing !== item.target.desired;
    return item.status === "missing" || item.status === "stale";
  });
  const backupRoot = path3.join(path3.dirname(statePath), "backups", timestamp());
  const backups = [];
  for (const item of writes) {
    if (item.existing !== undefined) {
      const backupPath = path3.join(backupRoot, backupName(item.target.id));
      await io.mkdir(path3.dirname(backupPath), { recursive: true });
      await io.writeFile(backupPath, item.existing, "utf8");
      backups.push(backupPath);
    }
  }
  const changed = [];
  try {
    for (const item of writes) {
      await atomicWrite(io, item.target.path, item.target.desired);
      changed.push(item);
    }
    const nextState = { schemaVersion: 1, targets: { ...state.targets } };
    for (const item of assessments) {
      const normalSyncRecord = !options.adopt && (item.status === "current" || item.status === "stale" || item.status === "missing" || item.status === "untracked");
      const adoptedRecord = options.adopt && selected?.has(item.target.id) && item.status !== "missing";
      if (normalSyncRecord || adoptedRecord) {
        nextState.targets[item.target.id] = { path: item.target.path, ownedHash: hash(item.target.owned) };
      }
    }
    await writeState(io, statePath, nextState);
  } catch (error) {
    const rollbackErrors = [];
    for (const item of [...changed].reverse()) {
      try {
        if (item.existing === undefined)
          await io.unlink(item.target.path);
        else
          await atomicWrite(io, item.target.path, item.existing);
      } catch (rollbackError) {
        rollbackErrors.push(`${item.target.id}: ${rollbackError?.message || "rollback failed"}`);
      }
    }
    const suffix = rollbackErrors.length > 0 ? `; rollback failures: ${rollbackErrors.join(", ")}` : "; changed targets were rolled back";
    throw new Error(`${error instanceof Error ? error.message : String(error)}${suffix}; backups: ${backups.join(", ") || "none"}`);
  }
  return { assessments, changed: writes.map((item) => item.target.id), backups };
}

// src/cli.ts
function parseArguments(argv) {
  const positional = [];
  const values = new Map;
  const flags = new Set;
  for (let index = 0;index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      positional.push(argument);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      const list = values.get(argument) || [];
      list.push(next);
      values.set(argument, list);
      index += 1;
    } else {
      flags.add(argument);
    }
  }
  return { positional, values, flags };
}
function value(arguments_, name) {
  return arguments_.values.get(name)?.at(-1);
}
function values(arguments_, name) {
  return arguments_.values.get(name) || [];
}
function usage() {
  return `Usage: agent-policy <configure|doctor|check|sync|adopt> [options]

Global options:
  --config PATH       Machine-local JSON configuration path
  --state PATH        Machine-local state path

configure options:
  --apply             Write the displayed configuration
  --pi-agent-dir PATH --codex-home PATH --vscode-target PATH (repeatable)
  --enable-pi --enable-codex --enable-vscode
  --disable-pi --disable-codex --disable-vscode

adopt options:
  --apply             Required before modifying targets
  --target ID         Adopt one existing target (repeatable)
  --all               Adopt every existing configured target
`;
}
async function readOptional2(filePath) {
  try {
    return await fs2.readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT")
      return;
    throw error;
  }
}
async function atomicWrite2(destination, content) {
  await fs2.mkdir(path4.dirname(destination), { recursive: true });
  const temporary = path4.join(path4.dirname(destination), `.${path4.basename(destination)}.agent-policy-${process3.pid}.tmp`);
  await fs2.writeFile(temporary, content, "utf8");
  await fs2.rename(temporary, destination);
}
function configuredPolicy(base, arguments_) {
  const result = structuredClone(base);
  const pi = value(arguments_, "--pi-agent-dir");
  const codex = value(arguments_, "--codex-home");
  const vscode = values(arguments_, "--vscode-target");
  if (pi)
    result.harnesses.pi.agentDir = pi;
  if (codex)
    result.harnesses.codex.home = codex;
  if (vscode.length > 0)
    result.harnesses.vscode.targets = vscode;
  if (arguments_.flags.has("--enable-pi"))
    result.harnesses.pi.enabled = true;
  if (arguments_.flags.has("--enable-codex"))
    result.harnesses.codex.enabled = true;
  if (arguments_.flags.has("--enable-vscode"))
    result.harnesses.vscode.enabled = true;
  if (arguments_.flags.has("--disable-pi"))
    result.harnesses.pi.enabled = false;
  if (arguments_.flags.has("--disable-codex"))
    result.harnesses.codex.enabled = false;
  if (arguments_.flags.has("--disable-vscode"))
    result.harnesses.vscode.enabled = false;
  return parsePolicyConfig(JSON.stringify(result));
}
function repositoryRoot() {
  return path4.resolve(path4.dirname(fileURLToPath(import.meta.url)), "../../..");
}
async function canonicalSources() {
  const root = repositoryRoot();
  const read = async (...parts) => normalizeInstruction(await fs2.readFile(path4.join(root, ...parts), "utf8"));
  return {
    invariants: await read("instructions", "evidence-led.instructions.md"),
    preferences: await read("instructions", "user-indications.instructions.md"),
    piAppend: await read("instructions", "pi", "append-system.md")
  };
}
function printAssessments(items) {
  for (const item of items)
    console.log(`${item.status.padEnd(10)} ${item.target.id.padEnd(18)} ${item.target.path} — ${item.detail}`);
}
async function main() {
  const arguments_ = parseArguments(process3.argv.slice(2));
  const command = arguments_.positional[0];
  if (!command || command === "--help" || command === "help") {
    console.log(usage());
    return;
  }
  const environment = currentEnvironment();
  const configPath = value(arguments_, "--config") || defaultConfigPath(environment);
  const statePath = value(arguments_, "--state") || defaultStatePath(environment);
  if (command === "configure") {
    const existing = await readOptional2(configPath);
    const base = existing ? parsePolicyConfig(existing) : defaultPolicyConfig(environment);
    const next = configuredPolicy(base, arguments_);
    const rendered = `${JSON.stringify(next, null, 2)}
`;
    console.log(`Configuration: ${configPath}
${rendered}`);
    if (!arguments_.flags.has("--apply")) {
      console.log("Dry run only. Re-run with --apply to write this configuration.");
      return;
    }
    await atomicWrite2(configPath, rendered);
    console.log("Configuration written.");
    return;
  }
  const rawConfig = await readOptional2(configPath);
  if (!rawConfig)
    throw new Error(`configuration does not exist: ${configPath}; run configure or provide --config`);
  const config = parsePolicyConfig(rawConfig);
  const sources = await canonicalSources();
  const state = await loadState(statePath);
  if (command === "doctor" || command === "check") {
    const assessments = await assessTargets(config, state, sources);
    console.log(`Config: ${configPath}
State:  ${statePath}`);
    printAssessments(assessments);
    if (assessments.some((item) => item.status !== "current"))
      process3.exitCode = 1;
    return;
  }
  if (command === "sync") {
    printAssessments(await assessTargets(config, state, sources));
    const result = await synchronize(config, state, statePath, sources);
    console.log(result.changed.length ? `Updated: ${result.changed.join(", ")}` : "No target files changed.");
    return;
  }
  if (command === "adopt") {
    if (!arguments_.flags.has("--apply"))
      throw new Error("adopt requires --apply");
    const preliminary = await assessTargets(config, state, sources, undefined, true);
    printAssessments(preliminary);
    const selected = arguments_.flags.has("--all") ? new Set(preliminary.map((item) => item.target.id)) : new Set(values(arguments_, "--target"));
    if (selected.size === 0)
      throw new Error("adopt requires --target or --all");
    const result = await synchronize(config, state, statePath, sources, { adopt: true, adoptTargets: selected });
    console.log(`Adopted: ${result.changed.join(", ") || "no changed target files"}`);
    if (result.backups.length)
      console.log(`Backups: ${result.backups.join(", ")}`);
    return;
  }
  throw new Error(`unknown command: ${command}

${usage()}`);
}
main().catch((error) => {
  console.error(`agent-policy: ${error?.message || error}`);
  process3.exitCode = 2;
});
