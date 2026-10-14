import crypto from "node:crypto";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { emptyState, parsePolicyState } from "./config.js";
import {
  commitChanges,
  nodeFileOps,
  readOptional,
  type FileChange,
  type FileOps,
} from "./files.js";
import { managedCodexBlock } from "./renderers.js";
import { normalizeInstruction, type CanonicalSources } from "./sources.js";
import { agentDirectories, renderTargets } from "./targets.js";
import type { PolicyConfig, PolicyState, RenderedTarget, SyncDomain } from "./types.js";

export { nodeFileOps, type FileOps } from "./files.js";

export type TargetStatus = "current" | "stale" | "conflict" | "untracked" | "missing" | "obsolete";

export interface TargetAssessment {
  target: RenderedTarget;
  status: TargetStatus;
  existing?: string;
  detail: string;
}

function hash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function ownedContent(target: RenderedTarget, existing: string | undefined): string | undefined {
  if (existing === undefined) return undefined;
  return target.kind === "codex" ? managedCodexBlock(existing) : normalizeInstruction(existing);
}

export async function assessTargets(
  config: PolicyConfig,
  state: PolicyState,
  sources: CanonicalSources,
  io: FileOps = nodeFileOps,
  adoptUnmanaged = false,
): Promise<TargetAssessment[]> {
  const codexHomes =
    config.harnesses.codex.enabled && config.resources?.instructions !== false
      ? [
          { id: "codex", home: config.harnesses.codex.home! },
          ...(config.harnesses.codex.additionalHomes || []).map(({ id, home }) => ({
            id: `codex-${id}`,
            home,
          })),
        ]
      : [];
  const codexConfigs: Record<string, string | undefined> = {};
  for (const { id, home } of codexHomes)
    codexConfigs[id] = await readOptional(io, path.join(home, "config.toml"));
  // Rendering the adoption form here lets read-only commands classify an
  // unmanaged Codex value as a conflict. synchronize still rejects that
  // conflict unless the caller selected it through explicit adoption.
  const targets = renderTargets(config, sources, codexConfigs, true);
  for (const [id, prior] of Object.entries(state.targets)) {
    if (prior.agentDirectory === undefined || targets.some((target) => target.id === id)) continue;
    const scope = agentDirectories(config).find(
      (scope) => scope.directory === prior.agentDirectory && id.startsWith(`${scope.id}-agent-`),
    );
    if (!scope) continue; // Disabling or moving a harness never retires its old files.
    if (
      path.dirname(prior.path) !== scope.directory ||
      !path.basename(prior.path).endsWith(scope.extension)
    )
      throw new Error(`invalid managed agent path for ${id}`);
    targets.push({
      id,
      path: prior.path,
      kind: "file",
      desired: "",
      owned: "",
      agentDirectory: scope.directory,
      operation: "delete",
    });
  }
  const targetPaths = new Set<string>();
  for (const target of targets) {
    if (targetPaths.has(target.path))
      throw new Error(
        `duplicate target path: ${target.path}; resolve the managed agent identity before syncing`,
      );
    targetPaths.add(target.path);
  }
  const assessments: TargetAssessment[] = [];
  for (const target of targets) {
    const existing =
      target.kind === "codex"
        ? codexConfigs[target.id.slice(0, -"-config".length)]
        : await readOptional(io, target.path);
    const owned = ownedContent(target, existing);
    const prior = state.targets[target.id];
    if (target.operation === "delete") {
      const sameOwner =
        prior?.path === target.path &&
        prior.agentDirectory === target.agentDirectory;
      const status =
        prior && !sameOwner
          ? "conflict"
          : existing === undefined
            ? prior
              ? "obsolete"
              : "current"
            : sameOwner && owned !== undefined && hash(owned) === prior.ownedHash
              ? "obsolete"
              : "conflict";
      assessments.push({
        target,
        existing,
        status,
        detail:
          status === "current"
            ? `retired ${target.agentDirectory ? "agent" : "instruction"} is absent`
            : status === "obsolete"
              ? `managed ${target.agentDirectory ? "agent" : "instruction"} is scheduled for removal`
              : "retired target is unmanaged, changed independently or owned at another path; preserve it or adopt explicitly",
      });
      continue;
    }
    if (prior) {
      if (prior.path !== target.path || owned === undefined) {
        assessments.push({
          target,
          status: "conflict",
          existing,
          detail: "target is missing or no longer has its managed region",
        });
      } else if (hash(owned) !== prior.ownedHash) {
        assessments.push({
          target,
          status: "conflict",
          existing,
          detail: "target changed independently since the last successful sync",
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
        detail: "target matches rendered output but is not in local state",
      });
    } else {
      assessments.push({
        target,
        status: "conflict",
        existing,
        detail: "target is unmanaged and differs from rendered output; run adopt explicitly",
      });
    }
  }
  return assessments;
}

export interface SyncResult {
  assessments: TargetAssessment[];
  changed: string[];
  backups: string[];
  actions: {
    id: string;
    path: string;
    action: "create" | "update" | "remove" | "record" | "forget" | "unchanged" | "skip" | "blocked";
  }[];
  issues: string[];
  stateChanged: boolean;
}

export async function loadState(
  statePath: string,
  io: FileOps = nodeFileOps,
  domain?: SyncDomain,
): Promise<PolicyState> {
  const raw = await readOptional(io, statePath);
  if (raw === undefined) return emptyState();
  return parsePolicyState(raw, domain);
}

export async function synchronize(
  config: PolicyConfig,
  state: PolicyState,
  statePath: string,
  sources: CanonicalSources,
  options: {
    adopt?: boolean;
    adoptTargets?: Set<string>;
    adoptAll?: boolean;
    dryRun?: boolean;
  } = {},
  io: FileOps = nodeFileOps,
): Promise<SyncResult> {
  const stateSnapshot = await readOptional(io, statePath);
  if (
    !isDeepStrictEqual(
      stateSnapshot === undefined ? emptyState() : parsePolicyState(stateSnapshot),
      state,
    )
  )
    throw new Error("ownership state changed; reload it before synchronizing");
  const assessments = await assessTargets(config, state, sources, io, options.adopt === true);
  const selected = options.adoptAll
    ? new Set(assessments.map((item) => item.target.id))
    : options.adoptTargets;
  const blocked = assessments.filter((item) => {
    if (options.adopt && !selected?.has(item.target.id)) return false;
    if (options.adopt && selected?.has(item.target.id) && item.status !== "missing") return false;
    return item.status === "conflict";
  });
  const issues: string[] = [];
  if (blocked.length > 0)
    issues.push(`sync preflight failed: ${blocked.map((item) => item.target.id).join(", ")}`);
  if (options.adopt && selected) {
    const unknown = [...selected].filter(
      (id) => !assessments.some((item) => item.target.id === id),
    );
    if (unknown.length > 0) issues.push(`unknown target(s): ${unknown.join(", ")}`);
  }
  const writes = assessments.filter((item) => {
    if (item.target.operation === "delete") return item.existing !== undefined && !options.adopt;
    if (options.adopt)
      return (
        selected?.has(item.target.id) === true &&
        item.status !== "missing" &&
        item.existing !== item.target.desired
      );
    return item.status === "missing" || item.status === "stale";
  });
  const nextState: PolicyState = { schemaVersion: 1, targets: { ...state.targets } };
  for (const item of assessments) {
    if (item.target.operation === "delete") {
      if (!options.adopt) delete nextState.targets[item.target.id];
      else if (selected?.has(item.target.id) && item.existing !== undefined)
        nextState.targets[item.target.id] = {
          path: item.target.path,
          ownedHash: hash(normalizeInstruction(item.existing)),
          agentDirectory: item.target.agentDirectory,
        };
      continue;
    }
    const normalSyncRecord =
      !options.adopt && ["current", "stale", "missing", "untracked"].includes(item.status);
    const adoptedRecord =
      options.adopt && selected?.has(item.target.id) && item.status !== "missing";
    if (normalSyncRecord || adoptedRecord)
      nextState.targets[item.target.id] = {
        path: item.target.path,
        ownedHash: hash(item.target.owned),
        ...(item.target.agentDirectory ? { agentDirectory: item.target.agentDirectory } : {}),
      };
  }
  const actions: SyncResult["actions"] = assessments.map((item) => {
    const id = item.target.id;
    let action: SyncResult["actions"][number]["action"] = "unchanged";
    if (blocked.includes(item)) action = "blocked";
    else if (writes.includes(item))
      action =
        item.target.operation === "delete"
          ? "remove"
          : item.existing === undefined
            ? "create"
            : "update";
    else if (state.targets[id] && !nextState.targets[id]) action = "forget";
    else if (!isDeepStrictEqual(state.targets[id], nextState.targets[id])) action = "record";
    else if (options.adopt && (!selected?.has(id) || item.status === "missing")) action = "skip";
    return { id, path: item.target.path, action };
  });
  const stateChanged = !isDeepStrictEqual(state, nextState);
  if (options.dryRun)
    return { assessments, actions, issues, stateChanged, changed: [], backups: [] };
  if (issues.length) throw new Error(issues.join("; "));
  const changes: FileChange[] = writes.map((item) => ({
    id: item.target.id,
    path: item.target.path,
    existing: item.existing,
    desired: item.target.operation === "delete" ? undefined : item.target.desired,
  }));
  if (stateChanged)
    changes.push({
      id: "ownership-state",
      path: statePath,
      existing: stateSnapshot,
      desired: `${JSON.stringify(nextState, null, 2)}\n`,
    });
  const backups = await commitChanges(changes, path.dirname(statePath), io);
  return {
    assessments,
    actions,
    issues,
    stateChanged,
    changed: writes.map((item) => item.target.id),
    backups,
  };
}
