import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export interface FileOps {
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(
    path: string,
    content: string,
    encoding: string | { encoding: string; mode: number },
  ): Promise<void>;
  mkdir(path: string, options: { recursive: boolean; mode?: number }): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  unlink(path: string): Promise<void>;
}

export const nodeFileOps: FileOps = fs as FileOps;

export interface FileSnapshot {
  id: string;
  path: string;
  existing: string | undefined;
}

export interface FileChange extends FileSnapshot {
  desired: string | undefined;
}

export async function readOptional(io: FileOps, filePath: string): Promise<string | undefined> {
  try {
    return await io.readFile(filePath, "utf8");
  } catch (error: any) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

let temporaryId = 0;
let transactionId = 0;

async function atomicWrite(io: FileOps, destination: string, content: string): Promise<void> {
  const directory = path.dirname(destination);
  await io.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(
    directory,
    `.${path.basename(destination)}.harness-sync-${process.pid}-${Date.now()}-${++temporaryId}.tmp`,
  );
  try {
    await io.writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
    await io.rename(temporary, destination);
  } catch (error) {
    try {
      await io.unlink(temporary);
    } catch (cleanupError: any) {
      if (cleanupError?.code !== "ENOENT")
        throw new Error(`${String(error)}; temporary file cleanup failed: ${String(cleanupError)}`);
    }
    throw error;
  }
}

// Configuration, ownership state and runtime targets share this transaction.
// Callers supply snapshots; every replacement/deletion is rechecked before use.
export async function commitChanges(
  changes: FileChange[],
  backupParent: string,
  io: FileOps = nodeFileOps,
  preserve: FileSnapshot[] = [],
): Promise<string[]> {
  const paths = new Set<string>();
  for (const item of changes) {
    if (paths.has(item.path)) throw new Error(`duplicate transaction path: ${item.path}`);
    paths.add(item.path);
  }
  for (const item of [...changes, ...preserve]) {
    if ((await readOptional(io, item.path)) !== item.existing)
      throw new Error(`${item.id} changed after preflight`);
  }
  if (!changes.length) return [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.join(
    backupParent,
    "backups",
    `${timestamp}-${process.pid}-${++transactionId}`,
  );
  const backups: string[] = [];
  const backedUp = new Set<string>();
  for (const item of [...preserve, ...changes]) {
    if (item.existing === undefined || backedUp.has(item.path)) continue;
    const backupPath = path.join(backupRoot, `${item.id.replace(/[^a-z0-9-]/gi, "_")}.bak`);
    await io.mkdir(path.dirname(backupPath), { recursive: true, mode: 0o700 });
    await io.writeFile(backupPath, item.existing, { encoding: "utf8", mode: 0o600 });
    backups.push(backupPath);
    backedUp.add(item.path);
  }
  const changed: FileChange[] = [];
  try {
    for (const item of changes) {
      if ((await readOptional(io, item.path)) !== item.existing)
        throw new Error(`${item.id} changed after preflight`);
      if (item.desired === undefined) await io.unlink(item.path);
      else await atomicWrite(io, item.path, item.desired);
      changed.push(item);
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const item of [...changed].reverse()) {
      try {
        if (item.existing === undefined) await io.unlink(item.path);
        else await atomicWrite(io, item.path, item.existing);
      } catch (rollbackError: any) {
        rollbackErrors.push(`${item.id}: ${rollbackError?.message || "rollback failed"}`);
      }
    }
    const suffix = rollbackErrors.length
      ? `; rollback failures: ${rollbackErrors.join(", ")}`
      : "; changed targets were rolled back";
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}${suffix}; backups: ${backups.join(", ") || "none"}`,
    );
  }
  return backups;
}
