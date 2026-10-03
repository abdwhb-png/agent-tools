import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { importLegacy } from "../src/migration.js";
import { nodeFileOps, type FileOps } from "../src/files.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-import-"));
  roots.push(root);
  const paths = {
    config: path.join(root, "new", "config.json"),
    state: path.join(root, "new", "state.json"),
    legacyConfig: path.join(root, "config.json"),
    legacyState: path.join(root, "state.json"),
  };
  const pi = path.join(root, "pi");
  const codex = path.join(root, "codex");
  const windows = path.join(root, "windows");
  const harnesses = {
    pi: { enabled: true, agentDir: pi },
    codex: {
      enabled: true,
      home: codex,
      additionalHomes: [{ id: "windows", home: windows, retiredAgents: ["explore.toml"] }],
    },
    vscode: { enabled: true, targets: [path.join(root, "vscode.md")] },
    zed: { enabled: true, home: path.join(root, "zed") },
  };
  const instruction = { path: path.join(pi, "SYSTEM.md"), ownedHash: "a".repeat(64) };
  const agent = {
    path: path.join(pi, "agents", "scout.md"),
    ownedHash: "b".repeat(64),
    agentDirectory: path.join(pi, "agents"),
  };
  const config = JSON.stringify({
    schemaVersion: 1,
    resources: { instructions: false, agents: true },
    harnesses,
  });
  const state = JSON.stringify({
    schemaVersion: 1,
    targets: { "pi-system": instruction, "pi-agent-scout": agent },
  });
  await fs.writeFile(paths.legacyConfig, config);
  await fs.writeFile(paths.legacyState, state);
  return { root, paths, config, state, instruction, agent, harnesses };
}

test.each(["instructions", "agents"] as const)(
  "%s import performs zero mutations during preview and preserves disabled status and native settings",
  async (domain) => {
    const f = await fixture();
    const mutations: string[] = [];
    const io: FileOps = { ...nodeFileOps };
    for (const operation of ["writeFile", "mkdir", "rename", "unlink"] as const)
      io[operation] = async () => {
        mutations.push(operation);
        throw new Error("unexpected mutation");
      };
    const result = await importLegacy(domain, f.paths, true, io);
    expect(mutations).toEqual([]);
    expect(await fs.readdir(f.root)).toEqual(["config.json", "state.json"]);
    expect(result.profile.kind).toBe(domain);
    expect(result.profile.enabled).toBe(domain === "agents");
    expect(result.state.targets).toEqual(
      domain === "agents" ? { "pi-agent-scout": f.agent } : { "pi-system": f.instruction },
    );
    expect(result.profile.harnesses.codex.additionalHomes).toEqual([
      {
        id: "windows",
        home: f.harnesses.codex.additionalHomes[0].home,
        ...(domain === "agents" ? { retiredAgents: ["explore.toml"] } : {}),
      },
    ]);
    expect(result.profile.harnesses.vscode).toEqual(
      domain === "agents" ? undefined : f.harnesses.vscode,
    );
  },
);

test("import is idempotent, preserves original bytes, and stores private recovery copies", async () => {
  const f = await fixture();
  const first = await importLegacy("agents", f.paths, false);
  expect(first.backups).toHaveLength(2);
  expect(await fs.readFile(first.backups[0], "utf8")).toBe(f.config);
  expect(await fs.readFile(first.backups[1], "utf8")).toBe(f.state);
  for (const file of [...first.backups, f.paths.config, f.paths.state])
    expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
  const before = await fs.stat(f.paths.state);
  const second = await importLegacy("agents", f.paths, false);
  expect(second.changes).toEqual([]);
  expect(second.backups).toEqual([]);
  expect((await fs.stat(f.paths.state)).mtimeMs).toBe(before.mtimeMs);
  expect(await fs.readFile(f.paths.legacyConfig, "utf8")).toBe(f.config);
  expect(await fs.readFile(f.paths.legacyState, "utf8")).toBe(f.state);
});

test.each(["config", "state"] as const)(
  "a divergent destination %s blocks the entire import before writes",
  async (destination) => {
    const f = await fixture();
    const preview = await importLegacy("agents", f.paths);
    const value =
      destination === "config"
        ? { ...preview.profile, enabled: false }
        : { schemaVersion: 1, targets: {} };
    await fs.mkdir(path.dirname(f.paths[destination]), { recursive: true });
    const independent = JSON.stringify(value);
    await fs.writeFile(f.paths[destination], independent);
    await expect(importLegacy("agents", f.paths, false)).rejects.toThrow("divergent");
    expect(await fs.readFile(f.paths[destination], "utf8")).toBe(independent);
    expect(await fs.exists(f.paths[destination === "config" ? "state" : "config"])).toBe(false);
    expect(await fs.exists(path.join(f.root, "new", "backups"))).toBe(false);
  },
);

test("state-write failure rolls back an imported configuration and retains both legacy backups", async () => {
  const f = await fixture();
  const io: FileOps = {
    ...nodeFileOps,
    async rename(from, to) {
      if (to === f.paths.state) throw new Error("injected import state failure");
      await nodeFileOps.rename(from, to);
    },
  };
  await expect(importLegacy("agents", f.paths, false, io)).rejects.toThrow("rolled back");
  expect(await fs.exists(f.paths.config)).toBe(false);
  expect(await fs.exists(f.paths.state)).toBe(false);
  expect(await fs.readFile(f.paths.legacyConfig, "utf8")).toBe(f.config);
  expect(await fs.readFile(f.paths.legacyState, "utf8")).toBe(f.state);
  const [run] = await fs.readdir(path.join(f.root, "new", "backups"));
  expect(
    await fs.readFile(path.join(f.root, "new", "backups", run, "legacy-configuration.bak"), "utf8"),
  ).toBe(f.config);
  expect((await fs.readdir(path.join(f.root, "new"))).some((file) => file.endsWith(".tmp"))).toBe(
    false,
  );
});

test("import rejects overlapping source/destination paths and malformed legacy state", async () => {
  const f = await fixture();
  await expect(
    importLegacy("agents", { ...f.paths, config: f.paths.legacyConfig }, false),
  ).rejects.toThrow("distinct paths");
  await fs.writeFile(f.paths.legacyState, "invalid-json-placeholder");
  await expect(importLegacy("agents", f.paths, false)).rejects.toThrow("state is not valid JSON");
  expect(await fs.exists(f.paths.config)).toBe(false);
  expect(await fs.exists(path.join(f.root, "new"))).toBe(false);
});
