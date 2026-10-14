import os from "node:os";
import path from "node:path";
import process from "node:process";
import type { PolicyConfig, PolicyState, SyncDomain, SyncProfile } from "./types.js";

export interface RuntimeEnvironment {
  home: string;
  platform: string;
  env: Record<string, string | undefined>;
}

const WINDOWS = "win32";
export const domainHarnesses = {
  instructions: ["pi", "codex", "vscode", "zed"],
  agents: ["pi", "codex", "vscode"],
} as const;

function platformPath(platform: string): any {
  return platform === WINDOWS ? path.win32 : path.posix;
}

function homePath(environment: RuntimeEnvironment, ...parts: string[]): string {
  return platformPath(environment.platform).join(environment.home, ...parts);
}

function defaultCodeProfile(environment: RuntimeEnvironment): string {
  if (environment.platform === WINDOWS) {
    return environment.env.APPDATA
      ? path.win32.join(environment.env.APPDATA, "Code", "User")
      : homePath(environment, "AppData", "Roaming", "Code", "User");
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "Code", "User");
  }
  return environment.env.XDG_CONFIG_HOME
    ? path.posix.join(environment.env.XDG_CONFIG_HOME, "Code", "User")
    : homePath(environment, ".config", "Code", "User");
}

export function currentEnvironment(): RuntimeEnvironment {
  return { home: os.homedir(), platform: process.platform, env: process.env };
}

export function defaultConfigPath(
  environment = currentEnvironment(),
  toolDirectory?: string,
  domain?: SyncDomain,
): string {
  const filename = domain ? `${domain}.config.json` : "config.json";
  if (toolDirectory) return platformPath(environment.platform).join(toolDirectory, filename);
  if (environment.platform === WINDOWS) {
    return environment.env.APPDATA
      ? path.win32.join(environment.env.APPDATA, "agent-policy", filename)
      : homePath(environment, "AppData", "Roaming", "agent-policy", filename);
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "agent-policy", filename);
  }
  return environment.env.XDG_CONFIG_HOME
    ? path.posix.join(environment.env.XDG_CONFIG_HOME, "agent-policy", filename)
    : homePath(environment, ".config", "agent-policy", filename);
}

export function defaultStatePath(environment = currentEnvironment(), domain?: SyncDomain): string {
  const parts = domain ? [domain, "state.json"] : ["state.json"];
  if (environment.platform === WINDOWS) {
    return environment.env.LOCALAPPDATA
      ? path.win32.join(environment.env.LOCALAPPDATA, "agent-policy", ...parts)
      : homePath(environment, "AppData", "Local", "agent-policy", ...parts);
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "agent-policy", ...parts);
  }
  return environment.env.XDG_STATE_HOME
    ? path.posix.join(environment.env.XDG_STATE_HOME, "agent-policy", ...parts)
    : homePath(environment, ".local", "state", "agent-policy", ...parts);
}

export function defaultPolicyConfig(
  environment = currentEnvironment(),
  domain?: SyncDomain,
): PolicyConfig {
  const codexHome = environment.env.CODEX_HOME || homePath(environment, ".codex");
  const vscodeTarget = platformPath(environment.platform).join(
    defaultCodeProfile(environment),
    "instructions",
    "agent-policy.instructions.md",
  );
  return {
    schemaVersion: 1,
    ...(domain
      ? { resources: { instructions: domain === "instructions", agents: domain === "agents" } }
      : {}),
    harnesses: {
      pi: { enabled: true, agentDir: homePath(environment, ".pi", "agent") },
      codex: { enabled: true, home: codexHome },
      vscode: domain === "agents" ? { enabled: false } : { enabled: true, targets: [vscodeTarget] },
      zed: { enabled: false },
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label} contains unsupported key: ${key}`);
  }
}

function assertHarness(value: unknown, name: HarnessName): Record<string, unknown> {
  if (!isObject(value) || typeof value.enabled !== "boolean")
    throw new Error(`harnesses.${name} must contain boolean enabled`);
  return value;
}

type HarnessName = "pi" | "codex" | "vscode" | "zed";

function assertAbsolute(value: string, label: string, platform: string): void {
  if (!platformPath(platform).isAbsolute(value))
    throw new Error(`${label} must be an absolute path for ${platform}`);
}

function validateHomeHarness(
  config: Record<string, unknown>,
  name: "Codex" | "Zed",
  platform: string,
  allowRetirements = name === "Codex",
): void {
  const label = name.toLowerCase();
  assertKeys(
    config,
    ["enabled", "home", "additionalHomes", ...(allowRetirements ? ["retiredAgents"] : [])],
    `harnesses.${label}`,
  );
  if (name === "Codex") validateRetirements(config.retiredAgents);
  if (config.enabled && typeof config.home !== "string")
    throw new Error(`enabled ${name} harness requires home`);
  if (typeof config.home === "string")
    assertAbsolute(config.home, `harnesses.${label}.home`, platform);
  if (config.additionalHomes === undefined) return;
  if (!Array.isArray(config.additionalHomes))
    throw new Error(`harnesses.${label}.additionalHomes must be an array`);
  const ids = new Set<string>();
  const homes = new Set<string>(typeof config.home === "string" ? [config.home] : []);
  for (const entry of config.additionalHomes) {
    if (!isObject(entry)) throw new Error(`each additional ${name} home must be an object`);
    assertKeys(
      entry,
      ["id", "home", ...(allowRetirements ? ["retiredAgents"] : [])],
      `harnesses.${label}.additionalHomes entry`,
    );
    if (name === "Codex") validateRetirements(entry.retiredAgents);
    if (
      typeof entry.id !== "string" ||
      !/^[a-z][a-z0-9-]*$/.test(entry.id) ||
      typeof entry.home !== "string"
    ) {
      throw new Error(
        `each additional ${name} home requires a lowercase id and absolute home path`,
      );
    }
    assertAbsolute(entry.home, `harnesses.${label}.additionalHomes.${entry.id}.home`, platform);
    if (ids.has(entry.id)) throw new Error(`duplicate additional ${name} id: ${entry.id}`);
    if (homes.has(entry.home)) throw new Error(`duplicate ${name} home: ${entry.home}`);
    ids.add(entry.id);
    homes.add(entry.home);
  }
}

function validateRetirements(value: unknown): void {
  if (value === undefined) return;
  if (
    !Array.isArray(value) ||
    value.some(
      (file) => typeof file !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.toml$/.test(file),
    )
  )
    throw new Error("retiredAgents entries must be native Codex agent basenames ending in .toml");
  if (new Set(value).size !== value.length) throw new Error("duplicate retired agent basename");
}

function validateVsCodeDirectories(config: Record<string, unknown>, platform: string): void {
  assertKeys(config, ["enabled", "directories"], "harnesses.vscode");
  if (config.enabled && (!Array.isArray(config.directories) || config.directories.length === 0))
    throw new Error("enabled VS Code agents require a non-empty directories array");
  if (config.directories === undefined) return;
  if (!Array.isArray(config.directories)) throw new Error("harnesses.vscode.directories must be an array");
  const ids = new Set<string>();
  const directories = new Set<string>();
  for (const entry of config.directories) {
    if (!isObject(entry)) throw new Error("each VS Code directory must be an object");
    assertKeys(entry, ["id", "path"], "harnesses.vscode.directories entry");
    if (typeof entry.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(entry.id) || typeof entry.path !== "string")
      throw new Error("each VS Code directory requires a lowercase id and absolute path");
    if (!entry.path.isWellFormed() || entry.path.includes("\0"))
      throw new Error(`VS Code directory ${entry.id} contains invalid path characters`);
    assertAbsolute(entry.path, `harnesses.vscode.directories.${entry.id}.path`, platform);
    const normalized = platformPath(platform).resolve(entry.path);
    const identity = platform === WINDOWS ? normalized.toLowerCase() : normalized;
    if (ids.has(entry.id)) throw new Error(`duplicate VS Code directory id: ${entry.id}`);
    if (directories.has(identity)) throw new Error(`duplicate VS Code directory path: ${entry.path}`);
    ids.add(entry.id);
    directories.add(identity);
    entry.path = normalized;
  }
}

export function parsePolicyConfig(
  raw: string,
  platform = process.platform,
  domain?: SyncDomain,
): PolicyConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("configuration is not valid JSON");
  }
  if (!isObject(parsed)) throw new Error("configuration must be an object");
  const profile = parsed.schemaVersion === 2;
  if (profile) {
    assertKeys(
      parsed,
      ["schemaVersion", "kind", "enabled", "harnesses", ...(parsed.kind === "agents" ? ["paths"] : [])],
      "configuration",
    );
    if (parsed.kind !== "instructions" && parsed.kind !== "agents")
      throw new Error("configuration kind must be instructions or agents");
    if (domain && parsed.kind !== domain)
      throw new Error(`configuration belongs to ${parsed.kind}, not ${domain}`);
    if (typeof parsed.enabled !== "boolean")
      throw new Error("configuration enabled must be boolean");
    if (parsed.paths !== undefined) {
      if (!isObject(parsed.paths)) throw new Error("paths must be an object of named absolute paths");
      for (const [name, value] of Object.entries(parsed.paths)) {
        if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name) || typeof value !== "string")
          throw new Error("paths entries require a valid name and an absolute path string");
        if (value.includes("${paths.") || value.includes("\0"))
          throw new Error(`paths.${name} must be a literal path without references or NUL characters`);
        if (!value.isWellFormed()) throw new Error(`paths.${name} contains invalid Unicode`);
        assertAbsolute(value, `paths.${name}`, platform);
      }
    }
  } else {
    if (domain) throw new Error("legacy configuration requires configure --import-legacy");
    assertKeys(parsed, ["schemaVersion", "harnesses", "resources"], "configuration");
    if (parsed.schemaVersion !== 1) throw new Error("configuration must have schemaVersion 1 or 2");
  }
  if (!isObject(parsed.harnesses)) throw new Error("configuration must contain harnesses");
  if (parsed.resources !== undefined) {
    if (!isObject(parsed.resources)) throw new Error("resources must be an object");
    assertKeys(parsed.resources, ["instructions", "agents"], "resources");
    for (const [name, enabled] of Object.entries(parsed.resources)) {
      if (typeof enabled !== "boolean") throw new Error(`resources.${name} must be boolean`);
    }
  }
  assertKeys(
    parsed.harnesses,
    profile ? domainHarnesses[parsed.kind as SyncDomain] : domainHarnesses.instructions,
    "harnesses",
  );
  const pi = assertHarness(parsed.harnesses.pi, "pi");
  const codex = assertHarness(parsed.harnesses.codex, "codex");
  const vscode = assertHarness(
    profile && parsed.kind === "agents" && parsed.harnesses.vscode === undefined ? { enabled: false } : parsed.harnesses.vscode,
    "vscode",
  );
  const zed =
    parsed.harnesses.zed === undefined ? undefined : assertHarness(parsed.harnesses.zed, "zed");
  assertKeys(pi, ["enabled", "agentDir"], "harnesses.pi");
  validateHomeHarness(codex, "Codex", platform, !profile || parsed.kind === "agents");
  if (zed) validateHomeHarness(zed, "Zed", platform);
  const vscodeAgents = profile && parsed.kind === "agents";
  if (vscodeAgents) validateVsCodeDirectories(vscode, platform);
  else assertKeys(vscode, ["enabled", "targets"], "harnesses.vscode");
  if (pi.enabled && typeof pi.agentDir !== "string")
    throw new Error("enabled Pi harness requires agentDir");
  if (
    !vscodeAgents && vscode.enabled &&
    (!Array.isArray(vscode.targets) ||
      vscode.targets.length === 0 ||
      vscode.targets.some((target) => typeof target !== "string"))
  ) {
    throw new Error("enabled VS Code harness requires a non-empty targets array");
  }
  if (typeof pi.agentDir === "string")
    assertAbsolute(pi.agentDir, "harnesses.pi.agentDir", platform);
  if (Array.isArray(vscode.targets))
    vscode.targets.forEach((target) =>
      assertAbsolute(target, "harnesses.vscode.targets", platform),
    );
  if (!profile) return parsed as unknown as PolicyConfig;
  return {
    schemaVersion: 1,
    ...(parsed.paths !== undefined ? { paths: parsed.paths as Record<string, string> } : {}),
    resources: {
      instructions: parsed.kind === "instructions" && parsed.enabled === true,
      agents: parsed.kind === "agents" && parsed.enabled === true,
    },
    harnesses: { pi, codex, vscode, ...(zed ? { zed } : {}) },
  } as unknown as PolicyConfig;
}

export function profileConfig(config: PolicyConfig, domain: SyncDomain): SyncProfile {
  const { pi, codex, vscode, zed } = structuredClone(config.harnesses);
  if (domain === "instructions") {
    delete codex.retiredAgents;
    for (const home of codex.additionalHomes || []) delete home.retiredAgents;
  }
  const vscodeProfile = domain === "instructions"
    ? { enabled: vscode.enabled && vscode.directories === undefined, ...(vscode.targets !== undefined ? { targets: vscode.targets } : {}) }
    : { enabled: vscode.enabled && vscode.targets === undefined, ...(vscode.directories !== undefined ? { directories: vscode.directories } : {}) };
  const includeVsCode = domain === "instructions" || vscode.directories !== undefined || vscodeProfile.enabled;
  return {
    schemaVersion: 2,
    kind: domain,
    enabled:
      domain === "instructions"
        ? config.resources?.instructions !== false
        : config.resources?.agents === true,
    ...(domain === "agents" && config.paths !== undefined
      ? { paths: structuredClone(config.paths) }
      : {}),
    harnesses: {
      pi,
      codex,
      ...(includeVsCode ? { vscode: vscodeProfile } : {}),
      ...(domain === "instructions" && zed ? { zed } : {}),
    },
  };
}

export function parsePolicyState(raw: string, domain?: SyncDomain): PolicyState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("state is not valid JSON");
  }
  if (!isObject(parsed) || parsed.schemaVersion !== 1 || !isObject(parsed.targets))
    throw new Error("state is malformed");
  for (const [id, target] of Object.entries(parsed.targets)) {
    if (
      !isObject(target) ||
      typeof target.path !== "string" ||
      typeof target.ownedHash !== "string"
    )
      throw new Error(`state target ${id} is malformed`);
    if (target.agentDirectory !== undefined && typeof target.agentDirectory !== "string")
      throw new Error(`state target ${id} has malformed agent ownership`);
  }
  const state = parsed as unknown as PolicyState;
  if (domain) {
    const selected = stateForDomain(state, domain);
    const other = Object.keys(state.targets).filter((id) => !Object.hasOwn(selected.targets, id));
    if (other.length)
      throw new Error(
        `ownership state contains targets from the other domain: ${other.join(", ")}; import legacy state first`,
      );
  }
  return state;
}

export function stateForDomain(state: PolicyState, domain: SyncDomain): PolicyState {
  return {
    schemaVersion: 1,
    targets: Object.fromEntries(
      Object.entries(state.targets).filter(
        ([, target]) => (target.agentDirectory !== undefined) === (domain === "agents"),
      ),
    ),
  };
}

export function emptyState(): PolicyState {
  return { schemaVersion: 1, targets: {} };
}
