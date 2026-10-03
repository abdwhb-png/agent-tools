import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  emptyState,
  parsePolicyConfig,
  parsePolicyState,
  profileConfig,
  stateForDomain,
} from "./config.js";
import {
  commitChanges,
  nodeFileOps,
  readOptional,
  type FileChange,
  type FileOps,
} from "./files.js";
import type { PolicyState, SyncDomain, SyncProfile } from "./types.js";

export interface ImportPaths {
  config: string;
  state: string;
  legacyConfig: string;
  legacyState: string;
}

export async function importLegacy(
  domain: SyncDomain,
  paths: ImportPaths,
  dryRun = true,
  io: FileOps = nodeFileOps,
): Promise<{ profile: SyncProfile; state: PolicyState; changes: FileChange[]; backups: string[] }> {
  paths = Object.fromEntries(
    Object.entries(paths).map(([key, value]) => [key, path.resolve(value)]),
  ) as unknown as ImportPaths;
  if (
    paths.config === paths.state ||
    [paths.config, paths.state].some(
      (destination) => destination === paths.legacyConfig || destination === paths.legacyState,
    )
  )
    throw new Error("legacy inputs and new configuration/state must use distinct paths");
  const legacyConfig = await readOptional(io, paths.legacyConfig);
  if (legacyConfig === undefined)
    throw new Error(`legacy configuration does not exist: ${paths.legacyConfig}`);
  const profile = profileConfig(parsePolicyConfig(legacyConfig), domain);
  const legacyState = await readOptional(io, paths.legacyState);
  const state = stateForDomain(
    legacyState === undefined ? emptyState() : parsePolicyState(legacyState),
    domain,
  );
  const changes: FileChange[] = [];
  for (const [id, destination, expected] of [
    ["configuration", paths.config, profile],
    ["ownership-state", paths.state, state],
  ] as const) {
    const existing = await readOptional(io, destination);
    if (existing !== undefined) {
      const parsed =
        id === "configuration"
          ? profileConfig(parsePolicyConfig(existing, undefined, domain), domain)
          : parsePolicyState(existing, domain);
      if (!isDeepStrictEqual(parsed, expected))
        throw new Error(`legacy import would overwrite divergent ${id}: ${destination}`);
    } else {
      changes.push({
        id,
        path: destination,
        existing,
        desired: `${JSON.stringify(expected, null, 2)}\n`,
      });
    }
  }
  const backups = dryRun
    ? []
    : await commitChanges(changes, path.dirname(paths.state), io, [
        { id: "legacy-configuration", path: paths.legacyConfig, existing: legacyConfig },
        { id: "legacy-ownership-state", path: paths.legacyState, existing: legacyState },
      ]);
  return { profile, state, changes, backups };
}
