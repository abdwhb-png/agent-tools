import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  currentEnvironment,
  defaultConfigPath,
  defaultPolicyConfig,
  defaultStatePath,
  domainHarnesses,
  parsePolicyConfig,
  profileConfig,
} from "./config.js";
import {
  commitChanges,
  nodeFileOps,
  readOptional,
  type FileChange,
  type FileOps,
} from "./files.js";
import { importLegacy } from "./migration.js";
import { loadCanonicalSources } from "./sources.js";
import { assessTargets, loadState, synchronize, type SyncResult } from "./sync.js";
import type { HomeHarnessConfig, PolicyConfig, SyncDomain } from "./types.js";

type Arguments = { positional: string[]; values: Map<string, string[]>; flags: Set<string> };
const commandNames = { instructions: "instruction-sync", agents: "agent-sync" } as const;

function parseArguments(argv: string[]): Arguments {
  const result: Arguments = { positional: [], values: new Map(), flags: new Set() };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      result.positional.push(argument);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result.values.set(argument, [...(result.values.get(argument) || []), next]);
      index += 1;
    } else {
      if (result.flags.has(argument)) throw new Error(`${argument} must be supplied once`);
      result.flags.add(argument);
    }
  }
  return result;
}

function value(args: Arguments, name: string): string | undefined {
  return args.values.get(name)?.at(-1);
}
function values(args: Arguments, name: string): string[] {
  return args.values.get(name) || [];
}

function validateArguments(domain: SyncDomain, command: string, args: Arguments): void {
  if (!["configure", "doctor", "check", "sync", "adopt"].includes(command))
    throw new Error(`unknown command: ${command}`);
  if (args.positional.length !== 1) throw new Error("expected one command");
  const harnesses = domainHarnesses[domain];
  const configureValues = [
    "--pi-agent-dir",
    "--codex-home",
    "--codex-additional-home",
    ...(domain === "instructions"
      ? ["--zed-home", "--zed-additional-home", "--vscode-target"]
      : ["--vscode-agent-dir"]),
  ];
  const allowedValues = [
    "--config",
    "--state",
    ...(command === "configure" ? [...configureValues, "--legacy-config", "--legacy-state"] : []),
    ...(command === "adopt" ? ["--target"] : []),
  ];
  const allowedFlags = [
    "--help",
    ...(["configure", "sync", "adopt"].includes(command) ? ["--dry-run"] : []),
    ...(["configure", "adopt"].includes(command) ? ["--apply"] : []),
    ...(command === "configure"
      ? [
          "--import-legacy",
          "--enable",
          "--disable",
          ...harnesses.flatMap((name) => [`--enable-${name}`, `--disable-${name}`]),
        ]
      : []),
    ...(command === "adopt" ? ["--all"] : []),
  ];
  const repeatable = [
    "--target",
    "--codex-additional-home",
    "--zed-additional-home",
    "--vscode-target",
    "--vscode-agent-dir",
  ];
  for (const [option, entries] of args.values) {
    if (!allowedValues.includes(option)) throw new Error(`unknown or invalid option: ${option}`);
    if (entries.length > 1 && !repeatable.includes(option))
      throw new Error(`${option} must be supplied once`);
  }
  for (const option of args.flags) {
    if (allowedValues.includes(option)) throw new Error(`${option} requires a value`);
    if (!allowedFlags.includes(option)) throw new Error(`unknown option: ${option}`);
  }
  if (args.flags.has("--apply") && args.flags.has("--dry-run"))
    throw new Error("--apply and --dry-run cannot be combined");
  for (const name of ["", ...harnesses.map((name) => `-${name}`)]) {
    if (args.flags.has(`--enable${name}`) && args.flags.has(`--disable${name}`))
      throw new Error(`--enable${name} and --disable${name} cannot be combined`);
  }
  if (command === "adopt" && args.flags.has("--all") && values(args, "--target").length)
    throw new Error("--all and --target cannot be combined");
  if (
    (value(args, "--legacy-config") || value(args, "--legacy-state")) &&
    !args.flags.has("--import-legacy")
  )
    throw new Error("legacy paths require --import-legacy");
  if (
    args.flags.has("--import-legacy") &&
    (configureValues.some((option) => args.values.has(option)) ||
      [...args.flags].some(
        (option) => option.startsWith("--enable") || option.startsWith("--disable"),
      ))
  )
    throw new Error("import legacy settings first, then configure destinations or enabled status");
}

function usage(domain: SyncDomain): string {
  const name = commandNames[domain];
  const nativeOptions =
    domain === "instructions"
      ? "\n  --zed-home PATH --zed-additional-home ID=PATH (repeatable)\n  --vscode-target PATH (repeatable)\n  --enable-zed --disable-zed"
      : "\n  --vscode-agent-dir ID=PATH (repeatable; exact agent directory)";
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
  --enable-pi --disable-pi --enable-codex --disable-codex
  --enable-vscode --disable-vscode${nativeOptions}

adopt options:
  --dry-run           Preview adoption without writing anything
  --apply             Apply adoption with recovery backups
  --target ID         Adopt one existing target (repeatable)
  --all               Adopt every existing target in this domain
`;
}

function setAdditionalHomes(config: HomeHarnessConfig, entries: string[], option: string): void {
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    if (separator < 1) throw new Error(`${option} requires ID=PATH`);
    const id = entry.slice(0, separator);
    const home = entry.slice(separator + 1);
    config.additionalHomes ||= [];
    const existing = config.additionalHomes.find((item) => item.id === id);
    if (existing) existing.home = home;
    else config.additionalHomes.push({ id, home });
  }
}

function configuredPolicy(base: PolicyConfig, domain: SyncDomain, args: Arguments): PolicyConfig {
  const result = structuredClone(base);
  const pi = value(args, "--pi-agent-dir");
  const codex = value(args, "--codex-home");
  if (pi) result.harnesses.pi.agentDir = pi;
  if (codex) result.harnesses.codex.home = codex;
  setAdditionalHomes(
    result.harnesses.codex,
    values(args, "--codex-additional-home"),
    "--codex-additional-home",
  );
  if (domain === "instructions") {
    const zed = value(args, "--zed-home");
    const additional = values(args, "--zed-additional-home");
    if (
      zed ||
      additional.length ||
      args.flags.has("--enable-zed") ||
      args.flags.has("--disable-zed")
    )
      result.harnesses.zed ||= { enabled: false };
    if (zed) result.harnesses.zed!.home = zed;
    if (additional.length)
      setAdditionalHomes(result.harnesses.zed!, additional, "--zed-additional-home");
    const vscode = values(args, "--vscode-target");
    if (vscode.length) result.harnesses.vscode.targets = vscode;
  } else {
    for (const entry of values(args, "--vscode-agent-dir")) {
      const separator = entry.indexOf("=");
      if (separator < 1) throw new Error("--vscode-agent-dir requires ID=PATH");
      const id = entry.slice(0, separator);
      const directory = entry.slice(separator + 1);
      result.harnesses.vscode.directories ||= [];
      const existing = result.harnesses.vscode.directories.find((item) => item.id === id);
      if (existing) existing.path = directory;
      else result.harnesses.vscode.directories.push({ id, path: directory });
    }
  }
  for (const name of domainHarnesses[domain]) {
    if (args.flags.has(`--enable-${name}`)) result.harnesses[name]!.enabled = true;
    if (args.flags.has(`--disable-${name}`)) result.harnesses[name]!.enabled = false;
  }
  if (args.flags.has("--enable") || args.flags.has("--disable"))
    result.resources = {
      instructions: domain === "instructions" && args.flags.has("--enable"),
      agents: domain === "agents" && args.flags.has("--enable"),
    };
  return parsePolicyConfig(JSON.stringify(profileConfig(result, domain)), process.platform, domain);
}

function printAssessments(
  items: Awaited<ReturnType<typeof assessTargets>>,
  changed = new Set<string>(),
): void {
  const width = Math.max(18, ...items.map(({ target }) => target.id.length));
  for (const item of items) {
    const written = changed.has(item.target.id) && item.status === "current";
    const removed = written && item.target.operation === "delete";
    const status = removed ? "removed" : written ? "changed" : item.status;
    const detail = removed ? "deleted this run" : written ? "written this run" : item.detail;
    console.log(
      `${status.padEnd(10)} ${item.target.id.padEnd(width)} ${item.target.path} — ${detail}`,
    );
  }
}

function printBackups(backups: string[]): void {
  if (backups.length)
    console.log(
      `Backups: ${path.dirname(backups[0])} (${backups.length} ${backups.length === 1 ? "file" : "files"})`,
    );
}

function printWriteResults(
  items: Awaited<ReturnType<typeof assessTargets>>,
  result: SyncResult,
): void {
  const changed = new Set(result.changed);
  const removed = result.assessments.filter(
    (item) => changed.has(item.target.id) && item.target.operation === "delete",
  );
  items = [
    ...items.filter((item) => !removed.some((removed) => removed.target.id === item.target.id)),
    ...removed.map((item) => ({ ...item, status: "current" as const })),
  ];
  console.log(
    changed.size
      ? `Changed ${changed.size} target${changed.size === 1 ? "" : "s"}.`
      : "No target files changed.",
  );
  printAssessments(
    [...items].sort((a, b) => Number(changed.has(b.target.id)) - Number(changed.has(a.target.id))),
    changed,
  );
  printBackups(result.backups);
}

function printPlan(operations: SyncResult["actions"] | FileChange[], stateChanged: boolean): void {
  const width = Math.max(18, ...operations.map((item) => item.id.length));
  const counts = new Map<string, number>();
  for (const item of operations) {
    const action =
      "action" in item
        ? item.action
        : item.desired === undefined
          ? "remove"
          : item.existing === undefined
            ? "create"
            : "update";
    console.log(`${action.padEnd(10)} ${item.id.padEnd(width)} ${item.path}`);
    counts.set(action, (counts.get(action) || 0) + 1);
  }
  console.log(
    `Plan: ${[...counts].map(([action, count]) => `${count} ${action}`).join(", ") || "no changes"}. Ownership state: ${stateChanged ? "would update" : "unchanged"}.`,
  );
}

function printPreview(result: SyncResult): void {
  printPlan(result.actions, result.stateChanged);
  for (const issue of result.issues) console.error(issue);
  console.log("Preview only. No files changed.");
}

async function main(
  domain: SyncDomain,
  moduleUrl: string,
  argv: string[],
  io: FileOps,
): Promise<void> {
  const name = commandNames[domain];
  const args = parseArguments(argv);
  const command = args.positional[0];
  if ((!command && args.flags.has("--help")) || command === "help" || !argv.length) {
    console.log(usage(domain));
    return;
  }
  if (!command) throw new Error("expected one command");
  validateArguments(domain, command, args);
  if (args.flags.has("--help")) {
    console.log(usage(domain));
    return;
  }
  const environment = currentEnvironment();
  const toolDirectory = path.resolve(path.dirname(fileURLToPath(moduleUrl)), "..");
  const repositoryRoot = path.resolve(toolDirectory, "../..");
  const configPath = path.resolve(
    value(args, "--config") || defaultConfigPath(environment, toolDirectory, domain),
  );
  const statePath = path.resolve(value(args, "--state") || defaultStatePath(environment, domain));
  if (configPath === statePath)
    throw new Error("configuration and ownership state must use different paths");
  if (command === "configure" && args.flags.has("--import-legacy")) {
    const result = await importLegacy(
      domain,
      {
        config: configPath,
        state: statePath,
        legacyConfig:
          value(args, "--legacy-config") || defaultConfigPath(environment, toolDirectory),
        legacyState: value(args, "--legacy-state") || defaultStatePath(environment),
      },
      !args.flags.has("--apply"),
      io,
    );
    console.log(
      `Configuration: ${configPath}\n${JSON.stringify(result.profile, null, 2)}\nState: ${statePath}\nOwnership records: ${Object.keys(result.state.targets).length}`,
    );
    printPlan(
      result.changes,
      result.changes.some((change) => change.id === "ownership-state"),
    );
    console.log(
      args.flags.has("--apply")
        ? result.changes.length
          ? "Legacy settings and ownership imported. Runtime targets unchanged."
          : "Legacy settings and ownership already imported."
        : "Preview only. Re-run with --apply to import settings and ownership.",
    );
    printBackups(result.backups);
    return;
  }
  const rawConfig = await readOptional(io, configPath);
  if (command === "configure") {
    const base = rawConfig
      ? parsePolicyConfig(rawConfig, environment.platform, domain)
      : defaultPolicyConfig(environment, domain);
    const rendered = `${JSON.stringify(profileConfig(configuredPolicy(base, domain, args), domain), null, 2)}\n`;
    const changes: FileChange[] =
      rawConfig === rendered
        ? []
        : [{ id: "configuration", path: configPath, existing: rawConfig, desired: rendered }];
    console.log(`Configuration: ${configPath}\n${rendered}`);
    printPlan(changes, false);
    if (!args.flags.has("--apply")) {
      console.log("Preview only. Re-run with --apply to write this configuration.");
      return;
    }
    const backups = await commitChanges(changes, path.dirname(statePath), io);
    console.log(changes.length ? "Configuration written." : "Configuration unchanged.");
    printBackups(backups);
    return;
  }
  if (!rawConfig)
    throw new Error(
      `configuration does not exist: ${configPath}; run ${name} configure or provide --config`,
    );
  const config = parsePolicyConfig(rawConfig, environment.platform, domain);
  if (!config.resources?.[domain])
    throw new Error(`${name} is disabled; run configure --enable --apply`);
  const state = await loadState(statePath, io, domain);
  const sources = await loadCanonicalSources(repositoryRoot, {
    instructions: domain === "instructions",
    agents: domain === "agents",
  });
  if (command === "doctor" || command === "check") {
    const assessments = await assessTargets(config, state, sources, io);
    console.log(`Config: ${configPath}\nState:  ${statePath}`);
    printAssessments(assessments);
    if (assessments.some((item) => item.status !== "current")) process.exitCode = 1;
    return;
  }
  const adopt = command === "adopt";
  if (adopt && !args.flags.has("--apply") && !args.flags.has("--dry-run"))
    throw new Error("adopt requires --dry-run or --apply");
  const selected = new Set(values(args, "--target"));
  if (adopt && !selected.size && !args.flags.has("--all"))
    throw new Error("adopt requires --target or --all");
  const result = await synchronize(
    config,
    state,
    statePath,
    sources,
    {
      adopt,
      adoptTargets: adopt ? selected : undefined,
      adoptAll: adopt && args.flags.has("--all"),
      dryRun: args.flags.has("--dry-run"),
    },
    io,
  );
  if (args.flags.has("--dry-run")) {
    printPreview(result);
    if (result.issues.length) process.exitCode = 2;
    return;
  }
  const updated = await assessTargets(config, await loadState(statePath, io, domain), sources, io);
  printWriteResults(
    adopt && !args.flags.has("--all")
      ? updated.filter((item) => selected.has(item.target.id))
      : updated,
    result,
  );
}

export async function runCli(
  domain: SyncDomain,
  moduleUrl: string,
  argv = process.argv.slice(2),
  io = nodeFileOps,
): Promise<void> {
  try {
    await main(domain, moduleUrl, argv, io);
  } catch (error: any) {
    console.error(`${commandNames[domain]}: ${error?.message || error}`);
    process.exitCode = 2;
  }
}
