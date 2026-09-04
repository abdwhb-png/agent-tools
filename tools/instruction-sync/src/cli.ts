import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { currentEnvironment, defaultConfigPath, defaultPolicyConfig, defaultStatePath, parsePolicyConfig } from "./config.js";
import { normalizeInstruction } from "./renderers.js";
import { assessTargets, loadState, synchronize } from "./sync.js";
import type { PolicyConfig } from "./types.js";

type Arguments = { positional: string[]; values: Map<string, string[]>; flags: Set<string> };

function parseArguments(argv: string[]): Arguments {
  const positional: string[] = [];
  const values = new Map<string, string[]>();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
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

function value(arguments_: Arguments, name: string): string | undefined {
  return arguments_.values.get(name)?.at(-1);
}

function values(arguments_: Arguments, name: string): string[] {
  return arguments_.values.get(name) || [];
}

function usage(): string {
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

async function readOptional(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error: any) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

async function atomicWrite(destination: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.agent-policy-${process.pid}.tmp`);
  await fs.writeFile(temporary, content, "utf8");
  await fs.rename(temporary, destination);
}

function configuredPolicy(base: PolicyConfig, arguments_: Arguments): PolicyConfig {
  const result: PolicyConfig = structuredClone(base);
  const pi = value(arguments_, "--pi-agent-dir");
  const codex = value(arguments_, "--codex-home");
  const vscode = values(arguments_, "--vscode-target");
  if (pi) result.harnesses.pi.agentDir = pi;
  if (codex) result.harnesses.codex.home = codex;
  if (vscode.length > 0) result.harnesses.vscode.targets = vscode;
  if (arguments_.flags.has("--enable-pi")) result.harnesses.pi.enabled = true;
  if (arguments_.flags.has("--enable-codex")) result.harnesses.codex.enabled = true;
  if (arguments_.flags.has("--enable-vscode")) result.harnesses.vscode.enabled = true;
  if (arguments_.flags.has("--disable-pi")) result.harnesses.pi.enabled = false;
  if (arguments_.flags.has("--disable-codex")) result.harnesses.codex.enabled = false;
  if (arguments_.flags.has("--disable-vscode")) result.harnesses.vscode.enabled = false;
  return parsePolicyConfig(JSON.stringify(result));
}

function repositoryRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

function toolDirectory(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

async function canonicalSources() {
  const root = repositoryRoot();
  const read = async (...parts: string[]) => normalizeInstruction(await fs.readFile(path.join(root, ...parts), "utf8"));
  return {
    invariants: await read("instructions", "evidence-led.md"),
    preferences: await read("instructions", "user-indications.md"),
    piAppend: await read("instructions", "pi", "append-system.md"),
  };
}

function printAssessments(items: Awaited<ReturnType<typeof assessTargets>>): void {
  for (const item of items) console.log(`${item.status.padEnd(10)} ${item.target.id.padEnd(18)} ${item.target.path} — ${item.detail}`);
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2));
  const command = arguments_.positional[0];
  if (!command || command === "--help" || command === "help") {
    console.log(usage());
    return;
  }
  const environment = currentEnvironment();
  const configPath = value(arguments_, "--config") || defaultConfigPath(environment, toolDirectory());
  const statePath = value(arguments_, "--state") || defaultStatePath(environment);
  if (command === "configure") {
    const existing = await readOptional(configPath);
    const base = existing ? parsePolicyConfig(existing) : defaultPolicyConfig(environment);
    const next = configuredPolicy(base, arguments_);
    const rendered = `${JSON.stringify(next, null, 2)}\n`;
    console.log(`Configuration: ${configPath}\n${rendered}`);
    if (!arguments_.flags.has("--apply")) {
      console.log("Dry run only. Re-run with --apply to write this configuration.");
      return;
    }
    await atomicWrite(configPath, rendered);
    console.log("Configuration written.");
    return;
  }
  const rawConfig = await readOptional(configPath);
  if (!rawConfig) throw new Error(`configuration does not exist: ${configPath}; run configure or provide --config`);
  const config = parsePolicyConfig(rawConfig);
  const sources = await canonicalSources();
  const state = await loadState(statePath);
  if (command === "doctor" || command === "check") {
    const assessments = await assessTargets(config, state, sources);
    console.log(`Config: ${configPath}\nState:  ${statePath}`);
    printAssessments(assessments);
    if (assessments.some((item) => item.status !== "current")) process.exitCode = 1;
    return;
  }
  if (command === "sync") {
    printAssessments(await assessTargets(config, state, sources));
    const result = await synchronize(config, state, statePath, sources);
    console.log(result.changed.length ? `Updated: ${result.changed.join(", ")}` : "No target files changed.");
    return;
  }
  if (command === "adopt") {
    if (!arguments_.flags.has("--apply")) throw new Error("adopt requires --apply");
    const preliminary = await assessTargets(config, state, sources, undefined, true);
    printAssessments(preliminary);
    const selected = arguments_.flags.has("--all") ? new Set(preliminary.map((item) => item.target.id)) : new Set(values(arguments_, "--target"));
    if (selected.size === 0) throw new Error("adopt requires --target or --all");
    const result = await synchronize(config, state, statePath, sources, { adopt: true, adoptTargets: selected });
    console.log(`Adopted: ${result.changed.join(", ") || "no changed target files"}`);
    if (result.backups.length) console.log(`Backups: ${result.backups.join(", ")}`);
    return;
  }
  throw new Error(`unknown command: ${command}\n\n${usage()}`);
}

main().catch((error: any) => {
  console.error(`agent-policy: ${error?.message || error}`);
  process.exitCode = 2;
});
