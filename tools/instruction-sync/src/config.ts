import os from "node:os";
import path from "node:path";
import process from "node:process";
import type { PolicyConfig, PolicyState } from "./types.js";

export interface RuntimeEnvironment {
  home: string;
  platform: string;
  env: Record<string, string | undefined>;
}

const WINDOWS = "win32";

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

export function defaultConfigPath(environment = currentEnvironment(), toolDirectory?: string): string {
  if (toolDirectory) return platformPath(environment.platform).join(toolDirectory, "config.json");
  if (environment.platform === WINDOWS) {
    return environment.env.APPDATA
      ? path.win32.join(environment.env.APPDATA, "agent-policy", "config.json")
      : homePath(environment, "AppData", "Roaming", "agent-policy", "config.json");
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "agent-policy", "config.json");
  }
  return environment.env.XDG_CONFIG_HOME
    ? path.posix.join(environment.env.XDG_CONFIG_HOME, "agent-policy", "config.json")
    : homePath(environment, ".config", "agent-policy", "config.json");
}

export function defaultStatePath(environment = currentEnvironment()): string {
  if (environment.platform === WINDOWS) {
    return environment.env.LOCALAPPDATA
      ? path.win32.join(environment.env.LOCALAPPDATA, "agent-policy", "state.json")
      : homePath(environment, "AppData", "Local", "agent-policy", "state.json");
  }
  if (environment.platform === "darwin") {
    return homePath(environment, "Library", "Application Support", "agent-policy", "state.json");
  }
  return environment.env.XDG_STATE_HOME
    ? path.posix.join(environment.env.XDG_STATE_HOME, "agent-policy", "state.json")
    : homePath(environment, ".local", "state", "agent-policy", "state.json");
}

export function defaultPolicyConfig(environment = currentEnvironment()): PolicyConfig {
  const codexHome = environment.env.CODEX_HOME || homePath(environment, ".codex");
  const vscodeTarget = platformPath(environment.platform).join(
    defaultCodeProfile(environment),
    "instructions",
    "agent-policy.instructions.md",
  );
  return {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: true, agentDir: homePath(environment, ".pi", "agent") },
      codex: { enabled: true, home: codexHome },
      vscode: { enabled: true, targets: [vscodeTarget] },
      zed: { enabled: false },
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label} contains unsupported key: ${key}`);
  }
}

function assertHarness(value: unknown, name: HarnessName): Record<string, unknown> {
  if (!isObject(value) || typeof value.enabled !== "boolean") throw new Error(`harnesses.${name} must contain boolean enabled`);
  return value;
}

type HarnessName = "pi" | "codex" | "vscode" | "zed";

function assertAbsolute(value: string, label: string): void {
  if (!path.isAbsolute(value) && !path.win32.isAbsolute(value)) throw new Error(`${label} must be an absolute path`);
}

function validateHomeHarness(config: Record<string, unknown>, name: "Codex" | "Zed"): void {
  const label = name.toLowerCase();
  assertKeys(config, ["enabled", "home", "additionalHomes"], `harnesses.${label}`);
  if (config.enabled && typeof config.home !== "string") throw new Error(`enabled ${name} harness requires home`);
  if (typeof config.home === "string") assertAbsolute(config.home, `harnesses.${label}.home`);
  if (config.additionalHomes === undefined) return;
  if (!Array.isArray(config.additionalHomes)) throw new Error(`harnesses.${label}.additionalHomes must be an array`);
  const ids = new Set<string>();
  const homes = new Set<string>(typeof config.home === "string" ? [config.home] : []);
  for (const entry of config.additionalHomes) {
    if (!isObject(entry)) throw new Error(`each additional ${name} home must be an object`);
    assertKeys(entry, ["id", "home"], `harnesses.${label}.additionalHomes entry`);
    if (typeof entry.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(entry.id) || typeof entry.home !== "string") {
      throw new Error(`each additional ${name} home requires a lowercase id and absolute home path`);
    }
    assertAbsolute(entry.home, `harnesses.${label}.additionalHomes.${entry.id}.home`);
    if (ids.has(entry.id)) throw new Error(`duplicate additional ${name} id: ${entry.id}`);
    if (homes.has(entry.home)) throw new Error(`duplicate ${name} home: ${entry.home}`);
    ids.add(entry.id);
    homes.add(entry.home);
  }
}

export function parsePolicyConfig(raw: string): PolicyConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("configuration is not valid JSON");
  }
  if (!isObject(parsed)) throw new Error("configuration must be an object");
  assertKeys(parsed, ["schemaVersion", "harnesses"], "configuration");
  if (parsed.schemaVersion !== 1 || !isObject(parsed.harnesses)) throw new Error("configuration must have schemaVersion 1 and harnesses");
  assertKeys(parsed.harnesses, ["pi", "codex", "vscode", "zed"], "harnesses");
  const pi = assertHarness(parsed.harnesses.pi, "pi");
  const codex = assertHarness(parsed.harnesses.codex, "codex");
  const vscode = assertHarness(parsed.harnesses.vscode, "vscode");
  const zed = parsed.harnesses.zed === undefined ? undefined : assertHarness(parsed.harnesses.zed, "zed");
  assertKeys(pi, ["enabled", "agentDir"], "harnesses.pi");
  validateHomeHarness(codex, "Codex");
  if (zed) validateHomeHarness(zed, "Zed");
  assertKeys(vscode, ["enabled", "targets"], "harnesses.vscode");
  if (pi.enabled && typeof pi.agentDir !== "string") throw new Error("enabled Pi harness requires agentDir");
  if (vscode.enabled && (!Array.isArray(vscode.targets) || vscode.targets.length === 0 || vscode.targets.some((target) => typeof target !== "string"))) {
    throw new Error("enabled VS Code harness requires a non-empty targets array");
  }
  if (typeof pi.agentDir === "string") assertAbsolute(pi.agentDir, "harnesses.pi.agentDir");
  if (Array.isArray(vscode.targets)) vscode.targets.forEach((target) => assertAbsolute(target, "harnesses.vscode.targets"));
  return parsed as unknown as PolicyConfig;
}

export function parsePolicyState(raw: string): PolicyState {
  const parsed = JSON.parse(raw) as unknown;
  if (!isObject(parsed) || parsed.schemaVersion !== 1 || !isObject(parsed.targets)) throw new Error("state is malformed");
  for (const [id, target] of Object.entries(parsed.targets)) {
    if (!isObject(target) || typeof target.path !== "string" || typeof target.ownedHash !== "string") throw new Error(`state target ${id} is malformed`);
  }
  return parsed as unknown as PolicyState;
}

export function emptyState(): PolicyState {
  return { schemaVersion: 1, targets: {} };
}
