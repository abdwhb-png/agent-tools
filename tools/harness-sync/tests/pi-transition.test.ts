import { afterEach, expect, test } from "bun:test";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emptyState } from "../src/config.js";
import { loadState, nodeFileOps, synchronize, type FileOps } from "../src/sync.js";
import type { PolicyConfig } from "../src/types.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
const sources = {
  invariants: "Operating rule\n", preferences: "Preference\n", technologyDefaults: "Technology\n", piAppendSystem: "Append rule\n",
  harnessInstructions: { pi: { system: [], agents: [] }, codex: { system: [], agents: [] }, zed: { system: [], agents: [] }, vscode: { system: [], agents: [] } },
};
const hash = (content: string) => crypto.createHash("sha256").update(content).digest("hex");
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-instruction-transition-"));
  roots.push(root);
  const agentDir = path.join(root, "pi");
  await fs.mkdir(agentDir);
  const config: PolicyConfig = { schemaVersion: 1, harnesses: { pi: { enabled: true, agentDir }, codex: { enabled: false }, vscode: { enabled: false } } };
  const system = path.join(agentDir, "SYSTEM.md");
  const append = path.join(agentDir, "APPEND_SYSTEM.md");
  const statePath = path.join(root, "state.json");
  const state = emptyState();
  state.targets["pi-system"] = { path: system, ownedHash: hash("Previous operating rule\n") };
  state.targets["pi-append-system"] = { path: append, ownedHash: hash("Append rule\n") };
  await fs.writeFile(system, "Previous operating rule\n");
  await fs.writeFile(append, "Append rule\n");
  await fs.writeFile(statePath, JSON.stringify(state));
  return { root, config, system, append, statePath, state };
}

test.each([false, true])("Pi transition retires owned SYSTEM (already absent: %s) and is idempotent", async (absent) => {
  const f = await fixture();
  if (absent) await fs.unlink(f.system);
  const before = await fs.readFile(f.statePath, "utf8");
  const preview = await synchronize(f.config, f.state, f.statePath, sources, { dryRun: true });
  expect(preview.issues).toEqual([]);
  expect(preview.actions.find(({ id }) => id === "pi-system")?.action).toBe(absent ? "forget" : "remove");
  expect(await fs.exists(f.system)).toBe(!absent);
  expect(await fs.readFile(f.append, "utf8")).toBe("Append rule\n");
  expect(await fs.readFile(f.statePath, "utf8")).toBe(before);
  expect(await fs.exists(path.join(f.root, "backups"))).toBe(false);
  const result = await synchronize(f.config, f.state, f.statePath, sources);
  expect(result.actions).toEqual(preview.actions);
  expect(await fs.exists(f.system)).toBe(false);
  expect(await fs.readFile(f.append, "utf8")).toBe("Operating rule\n\nAppend rule\n");
  expect((await loadState(f.statePath)).targets["pi-system"]).toBeUndefined();
  if (!absent) {
    const backup = result.backups.find((file) => file.endsWith("pi-system.bak"));
    expect(backup).toBeDefined();
    expect(await fs.readFile(backup!, "utf8")).toBe("Previous operating rule\n");
  }
  const repeated = await synchronize(f.config, await loadState(f.statePath), f.statePath, sources);
  expect(repeated.changed).toEqual([]);
  expect(repeated.backups).toEqual([]);
  expect(repeated.stateChanged).toBe(false);
  expect(await fs.exists(f.system)).toBe(false);
});

test.each(["edited-system", "unmanaged-system", "edited-append", "wrong-path"])("Pi transition blocks %s without partial writes", async (condition) => {
  const f = await fixture();
  if (condition === "edited-system") await fs.writeFile(f.system, "Independent system\n");
  if (condition === "unmanaged-system") delete f.state.targets["pi-system"];
  if (condition === "edited-append") await fs.writeFile(f.append, "Independent append\n");
  if (condition === "wrong-path") {
    f.state.targets["pi-system"].path = path.join(f.root, "previous-pi", "SYSTEM.md");
    await fs.unlink(f.system);
  }
  await fs.writeFile(f.statePath, JSON.stringify(f.state));
  const before = await fs.readFile(f.statePath, "utf8");
  const systemBefore = await fs.readFile(f.system, "utf8").catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  const appendBefore = await fs.readFile(f.append, "utf8");
  const preview = await synchronize(f.config, f.state, f.statePath, sources, { dryRun: true });
  expect(preview.issues).toEqual([`sync preflight failed: ${condition === "edited-append" ? "pi-append-system" : "pi-system"}`]);
  await expect(synchronize(f.config, f.state, f.statePath, sources)).rejects.toThrow("sync preflight failed");
  expect(await fs.readFile(f.statePath, "utf8")).toBe(before);
  expect(await fs.readFile(f.append, "utf8")).toBe(appendBefore);
  expect(await fs.exists(f.system)).toBe(systemBefore !== undefined);
  if (systemBefore !== undefined) expect(await fs.readFile(f.system, "utf8")).toBe(systemBefore);
  expect(await fs.exists(path.join(f.config.harnesses.pi.agentDir!, "AGENTS.md"))).toBe(false);
  expect(await fs.exists(path.join(f.root, "backups"))).toBe(false);
});

test("Pi retirement adoption only records ownership before a separate backed-up sync", async () => {
  const f = await fixture();
  await fs.writeFile(f.system, "Independent system\n");
  const adopted = await synchronize(f.config, f.state, f.statePath, sources, { adopt: true, adoptTargets: new Set(["pi-system"]) });
  expect(adopted.changed).toEqual([]);
  expect(await fs.readFile(f.system, "utf8")).toBe("Independent system\n");
  expect(await fs.readFile(f.append, "utf8")).toBe("Append rule\n");
  const result = await synchronize(f.config, await loadState(f.statePath), f.statePath, sources);
  expect(await fs.exists(f.system)).toBe(false);
  expect(await fs.readFile(result.backups.find((file) => file.endsWith("pi-system.bak"))!, "utf8")).toBe("Independent system\n");
});

test("Pi transition restores a removed SYSTEM and ownership after append write failure", async () => {
  const f = await fixture();
  const before = await fs.readFile(f.statePath, "utf8");
  const io: FileOps = { ...nodeFileOps, rename: async (from, to) => {
    if (to === f.append) throw new Error("append replacement failed");
    await nodeFileOps.rename(from, to);
  } };
  await expect(synchronize(f.config, f.state, f.statePath, sources, {}, io)).rejects.toThrow("changed targets were rolled back");
  expect(await fs.readFile(f.system, "utf8")).toBe("Previous operating rule\n");
  expect(await fs.readFile(f.append, "utf8")).toBe("Append rule\n");
  expect(await fs.readFile(f.statePath, "utf8")).toBe(before);
  expect(await fs.exists(path.join(f.config.harnesses.pi.agentDir!, "AGENTS.md"))).toBe(false);
});

test("disabling Pi preserves its existing instruction files and ownership", async () => {
  const f = await fixture();
  f.config.harnesses.pi.enabled = false;
  const before = await fs.readFile(f.statePath, "utf8");
  const result = await synchronize(f.config, f.state, f.statePath, sources);
  expect(result.changed).toEqual([]);
  expect(result.stateChanged).toBe(false);
  expect(await fs.readFile(f.system, "utf8")).toBe("Previous operating rule\n");
  expect(await fs.readFile(f.append, "utf8")).toBe("Append rule\n");
  expect(await fs.readFile(f.statePath, "utf8")).toBe(before);
});

test("Pi transition rejects a concurrent SYSTEM edit before deletion", async () => {
  const f = await fixture();
  const before = await fs.readFile(f.statePath, "utf8");
  const io: FileOps = { ...nodeFileOps, writeFile: async (file, content, options) => {
    await nodeFileOps.writeFile(file, content, options);
    if (file.endsWith("pi-system.bak")) await fs.writeFile(f.system, "Concurrent edit\n");
  } };
  await expect(synchronize(f.config, f.state, f.statePath, sources, {}, io)).rejects.toThrow("pi-system changed after preflight");
  expect(await fs.readFile(f.system, "utf8")).toBe("Concurrent edit\n");
  expect(await fs.readFile(f.append, "utf8")).toBe("Append rule\n");
  expect(await fs.readFile(f.statePath, "utf8")).toBe(before);
});
