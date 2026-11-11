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
  lstat?(path: string): Promise<{ isSymbolicLink(): boolean; isDirectory(): boolean }>;
  readlink?(path: string): Promise<string>;
  symlink?(target: string, path: string, type?: string): Promise<void>;
  readdir?(path: string): Promise<string[]>;
  rmdir?(path: string): Promise<void>;
}

export const nodeFileOps: FileOps = fs as FileOps;

export interface FileSnapshot {
  id: string;
  path: string;
  existing: string | undefined;
  kind?: "file" | "symlink";
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

export async function readSymlinkOptional(
  io: FileOps,
  linkPath: string,
  desiredTarget?: string,
): Promise<string | undefined> {
  const lstat = io.lstat ?? fs.lstat;
  const readlink = io.readlink ?? fs.readlink;
  const readdir = io.readdir ?? fs.readdir;
  let stat: { isSymbolicLink(): boolean; isDirectory(): boolean };
  try {
    stat = await lstat(linkPath);
  } catch (error: any) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
  if (stat.isSymbolicLink()) {
    const raw = await readlink(linkPath);
    const direct = path.resolve(path.dirname(linkPath), raw);
    if (desiredTarget !== undefined) {
      const expected = path.resolve(desiredTarget);
      let current = direct;
      for (let depth = 0; depth < 8; depth += 1) {
        if (current === expected) return desiredTarget;
        try {
          const nextStat = await lstat(current);
          if (!nextStat.isSymbolicLink()) break;
          const nextRaw = await readlink(current);
          current = path.resolve(path.dirname(current), nextRaw);
        } catch {
          break;
        }
      }
    }
    return direct;
  }
  if (stat.isDirectory()) {
    const entries = await readdir(linkPath);
    return entries.length === 0 ? undefined : "\0non-empty-directory";
  }
  return "\0regular-file";
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

async function writeSymlink(io: FileOps, destination: string, target: string): Promise<void> {
  if (target.startsWith("\0"))
    throw new Error(`cannot replace non-symlink target at ${destination}`);
  const directory = path.dirname(destination);
  await io.mkdir(directory, { recursive: true, mode: 0o700 });
  const lstat = io.lstat ?? fs.lstat;
  const readdir = io.readdir ?? fs.readdir;
  const rmdir = io.rmdir ?? fs.rmdir;
  const symlink = io.symlink ?? fs.symlink;
  try {
    const stat = await lstat(destination);
    if (stat.isSymbolicLink()) {
      await io.unlink(destination);
    } else if (stat.isDirectory()) {
      const entries = await readdir(destination);
      if (entries.length > 0)
        throw new Error(`cannot replace non-empty directory with symlink: ${destination}`);
      await rmdir(destination);
    } else {
      await io.unlink(destination);
    }
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  await symlink(target, destination, "dir");
}

async function readSnapshot(io: FileOps, item: FileSnapshot & { desired?: string }): Promise<string | undefined> {
  return item.kind === "symlink"
    ? readSymlinkOptional(io, item.path, item.desired ?? item.existing)
    : readOptional(io, item.path);
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
    if ((await readSnapshot(io, item)) !== item.existing)
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
    if (item.existing === undefined || item.existing.startsWith("\0") || backedUp.has(item.path))
      continue;
    const backupPath = path.join(backupRoot, `${item.id.replace(/[^a-z0-9-]/gi, "_")}.bak`);
    await io.mkdir(path.dirname(backupPath), { recursive: true, mode: 0o700 });
    await io.writeFile(backupPath, item.existing, { encoding: "utf8", mode: 0o600 });
    backups.push(backupPath);
    backedUp.add(item.path);
  }
  const changed: FileChange[] = [];
  try {
    for (const item of changes) {
      if ((await readSnapshot(io, item)) !== item.existing)
        throw new Error(`${item.id} changed after preflight`);
      if (item.desired === undefined) await io.unlink(item.path);
      else if (item.kind === "symlink") await writeSymlink(io, item.path, item.desired);
      else await atomicWrite(io, item.path, item.desired);
      changed.push(item);
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const item of [...changed].reverse()) {
      try {
        if (item.existing === undefined) await io.unlink(item.path);
        else if (item.kind === "symlink") await writeSymlink(io, item.path, item.existing);
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
