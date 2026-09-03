import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { emptyState } from "./config.js";
import { managedCodexBlock, normalizeInstruction } from "./renderers.js";
import { renderTargets, type CanonicalSources } from "./targets.js";
import type { PolicyConfig, PolicyState, RenderedTarget } from "./types.js";

export interface FileOps {
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(path: string, content: string, encoding: string): Promise<void>;
  mkdir(path: string, options: { recursive: boolean }): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  unlink(path: string): Promise<void>;
}

export const nodeFileOps: FileOps = fs as FileOps;

export type TargetStatus = "current" | "stale" | "conflict" | "untracked" | "missing";

export interface TargetAssessment {
  target: RenderedTarget;
  status: TargetStatus;
  existing?: string;
  detail: string;
}

function hash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function readOptional(io: FileOps, targetPath: string): Promise<string | undefined> {
  try {
    return normalizeInstruction(await io.readFile(targetPath, "utf8"));
  } catch (error: any) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

function ownedContent(target: RenderedTarget, existing: string | undefined): string | undefined {
  if (existing === undefined) return undefined;
  return target.kind === "codex" ? managedCodexBlock(existing) : existing;
}

export async function assessTargets(
  config: PolicyConfig,
  state: PolicyState,
  sources: CanonicalSources,
  io: FileOps = nodeFileOps,
  adoptUnmanaged = false,
): Promise<TargetAssessment[]> {
  const codexPath = config.harnesses.codex.enabled ? path.join(config.harnesses.codex.home!, "config.toml") : undefined;
  const codexConfig = codexPath ? await readOptional(io, codexPath) : undefined;
  const targets = renderTargets(config, sources, codexConfig, adoptUnmanaged);
  const assessments: TargetAssessment[] = [];
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

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupName(id: string): string {
  return `${id.replace(/[^a-z0-9-]/gi, "_")}.bak`;
}

async function atomicWrite(io: FileOps, destination: string, content: string): Promise<void> {
  const directory = path.dirname(destination);
  await io.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(destination)}.agent-policy-${process.pid}-${Date.now()}.tmp`);
  await io.writeFile(temporary, content, "utf8");
  await io.rename(temporary, destination);
}

export interface SyncResult {
  assessments: TargetAssessment[];
  changed: string[];
  backups: string[];
}

async function writeState(io: FileOps, statePath: string, state: PolicyState): Promise<void> {
  await atomicWrite(io, statePath, `${JSON.stringify(state, null, 2)}\n`);
}

export async function loadState(statePath: string, io: FileOps = nodeFileOps): Promise<PolicyState> {
  const raw = await readOptional(io, statePath);
  if (raw === undefined) return emptyState();
  const { parsePolicyState } = await import("./config.js");
  return parsePolicyState(raw);
}

export async function synchronize(
  config: PolicyConfig,
  state: PolicyState,
  statePath: string,
  sources: CanonicalSources,
  options: { adopt?: boolean; adoptTargets?: Set<string> } = {},
  io: FileOps = nodeFileOps,
): Promise<SyncResult> {
  const assessments = await assessTargets(config, state, sources, io, options.adopt === true);
  const selected = options.adoptTargets;
  const blocked = assessments.filter((item) => {
    if (options.adopt && selected?.has(item.target.id) && item.status !== "missing") return false;
    return item.status === "conflict";
  });
  if (blocked.length > 0) throw new Error(`sync preflight failed: ${blocked.map((item) => item.target.id).join(", ")}`);
  if (options.adopt && selected) {
    const unknown = [...selected].filter((id) => !assessments.some((item) => item.target.id === id));
    if (unknown.length > 0) throw new Error(`unknown target(s): ${unknown.join(", ")}`);
  }
  const writes = assessments.filter((item) => {
    if (options.adopt) return selected?.has(item.target.id) === true && item.status !== "missing" && item.existing !== item.target.desired;
    return item.status === "missing" || item.status === "stale";
  });
  const backupRoot = path.join(path.dirname(statePath), "backups", timestamp());
  const backups: string[] = [];
  for (const item of writes) {
    if (item.existing !== undefined) {
      const backupPath = path.join(backupRoot, backupName(item.target.id));
      await io.mkdir(path.dirname(backupPath), { recursive: true });
      await io.writeFile(backupPath, item.existing, "utf8");
      backups.push(backupPath);
    }
  }
  const changed: TargetAssessment[] = [];
  try {
    for (const item of writes) {
      await atomicWrite(io, item.target.path, item.target.desired);
      changed.push(item);
    }
    const nextState: PolicyState = { schemaVersion: 1, targets: { ...state.targets } };
    for (const item of assessments) {
      const normalSyncRecord = !options.adopt && (item.status === "current" || item.status === "stale" || item.status === "missing" || item.status === "untracked");
      const adoptedRecord = options.adopt && selected?.has(item.target.id) && item.status !== "missing";
      if (normalSyncRecord || adoptedRecord) {
        nextState.targets[item.target.id] = { path: item.target.path, ownedHash: hash(item.target.owned) };
      }
    }
    await writeState(io, statePath, nextState);
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const item of [...changed].reverse()) {
      try {
        if (item.existing === undefined) await io.unlink(item.target.path);
        else await atomicWrite(io, item.target.path, item.existing);
      } catch (rollbackError: any) {
        rollbackErrors.push(`${item.target.id}: ${rollbackError?.message || "rollback failed"}`);
      }
    }
    const suffix = rollbackErrors.length > 0 ? `; rollback failures: ${rollbackErrors.join(", ")}` : "; changed targets were rolled back";
    throw new Error(`${error instanceof Error ? error.message : String(error)}${suffix}; backups: ${backups.join(", ") || "none"}`);
  }
  return { assessments, changed: writes.map((item) => item.target.id), backups };
}
