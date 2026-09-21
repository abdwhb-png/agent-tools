import { expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emptyState } from "../src/config.js";
import { assessTargets, loadState, nodeFileOps, synchronize, type FileOps } from "../src/sync.js";
import type { PolicyConfig } from "../src/types.js";

async function sandbox(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "agent-policy-test-"));
}

function piOnly(agentDir: string): PolicyConfig {
  return {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: true, agentDir },
      codex: { enabled: false },
      vscode: { enabled: false },
    },
  };
}

const source = {
  invariants: "invariants\n",
  preferences: "preferences\n",
  technologyDefaults: "technology defaults\n",
  harnessInstructions: {
    pi: ["append\n"],
    codex: ["Codex only\n"],
    vscode: [],
    zed: [],
  },
};

test("sync creates missing targets, records state, and becomes idempotent", async () => {
  const root = await sandbox();
  const config = piOnly(path.join(root, "pi", "agent"));
  const statePath = path.join(root, "state", "state.json");
  await synchronize(config, emptyState(), statePath, source);
  expect(await fs.readFile(path.join(config.harnesses.pi.agentDir!, "SYSTEM.md"), "utf8")).toBe("invariants\n");
  const state = await loadState(statePath);
  expect((await assessTargets(config, state, source)).every((item) => item.status === "current")).toBe(true);
});

test("a preflight conflict prevents stale sibling targets from being overwritten", async () => {
  const root = await sandbox();
  const config = piOnly(path.join(root, "pi", "agent"));
  const statePath = path.join(root, "state", "state.json");
  await synchronize(config, emptyState(), statePath, source);
  await fs.writeFile(path.join(config.harnesses.pi.agentDir!, "AGENTS.md"), "manual edit\n");
  const changedSource = { ...source, invariants: "new invariants\n" };
  await expect(synchronize(config, await loadState(statePath), statePath, changedSource)).rejects.toThrow("sync preflight failed");
  expect(await fs.readFile(path.join(config.harnesses.pi.agentDir!, "SYSTEM.md"), "utf8")).toBe("invariants\n");
});

test("a write failure rolls back targets already replaced and retains backups", async () => {
  const root = await sandbox();
  const config = piOnly(path.join(root, "pi", "agent"));
  const statePath = path.join(root, "state", "state.json");
  await synchronize(config, emptyState(), statePath, source);
  const failingIo: FileOps = {
    ...nodeFileOps,
    rename: async (from, to) => {
      if (to.endsWith("AGENTS.md")) {
        const error = new Error("simulated replacement failure") as Error & { code?: string };
        error.code = "EACCES";
        throw error;
      }
      await nodeFileOps.rename(from, to);
    },
  };
  await expect(synchronize(config, await loadState(statePath), statePath, { ...source, invariants: "new\n", preferences: "new\n", technologyDefaults: "new defaults\n", harnessInstructions: { ...source.harnessInstructions, pi: ["new\n"] } }, {}, failingIo)).rejects.toThrow("changed targets were rolled back");
  expect(await fs.readFile(path.join(config.harnesses.pi.agentDir!, "SYSTEM.md"), "utf8")).toBe("invariants\n");
  expect((await fs.readdir(path.join(root, "state", "backups"))).length).toBe(1);
});

test("adopt explicitly replaces an unmanaged target and records a recovery backup", async () => {
  const root = await sandbox();
  const config = piOnly(path.join(root, "pi", "agent"));
  const statePath = path.join(root, "state", "state.json");
  await fs.mkdir(config.harnesses.pi.agentDir!, { recursive: true });
  await fs.writeFile(path.join(config.harnesses.pi.agentDir!, "AGENTS.md"), "unmanaged preference\n");
  const result = await synchronize(config, emptyState(), statePath, source, { adopt: true, adoptTargets: new Set(["pi-agents"]) });
  expect(result.changed).toEqual(["pi-agents"]);
  expect(await fs.readFile(path.join(config.harnesses.pi.agentDir!, "AGENTS.md"), "utf8")).toBe("preferences\n\ntechnology defaults\n");
  expect(result.backups).toHaveLength(1);
  expect((await loadState(statePath)).targets["pi-agents"]).toBeDefined();
});

test("assessment reports an unmanaged Codex value as a conflict without throwing", async () => {
  const root = await sandbox();
  const codexHome = path.join(root, "codex");
  await fs.mkdir(codexHome, { recursive: true });
  await fs.writeFile(path.join(codexHome, "config.toml"), 'developer_instructions = """\nexisting\n"""\n');
  const config: PolicyConfig = {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: true, home: codexHome },
      vscode: { enabled: false },
    },
  };
  const assessments = await assessTargets(config, emptyState(), source);
  expect(assessments.find((item) => item.target.id === "codex-config")).toMatchObject({
    status: "conflict",
    detail: expect.stringContaining("unmanaged"),
  });
});

test("sync manages primary and named Codex homes independently", async () => {
  const root = await sandbox();
  const wsl = path.join(root, "wsl");
  const windows = path.join(root, "windows");
  const statePath = path.join(root, "state.json");
  const config: PolicyConfig = {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: true, home: wsl, additionalHomes: [{ id: "windows", home: windows }] },
      vscode: { enabled: false },
    },
  };
  const result = await synchronize(config, emptyState(), statePath, source);
  expect(result.changed).toEqual(["codex-config", "codex-agents", "codex-windows-config", "codex-windows-agents"]);
  await fs.appendFile(path.join(windows, "config.toml"), 'model = "windows-model"\n');
  expect(await fs.readFile(path.join(windows, "config.toml"), "utf8")).toContain('model = "windows-model"');
  expect((await assessTargets(config, await loadState(statePath), source)).every((item) => item.status === "current")).toBe(true);
});

test("adding a named Codex home preserves primary target state", async () => {
  const root = await sandbox();
  const statePath = path.join(root, "state.json");
  const primary = path.join(root, "wsl");
  const config: PolicyConfig = {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: true, home: primary },
      vscode: { enabled: false },
    },
  };
  await synchronize(config, emptyState(), statePath, source);
  config.harnesses.codex.additionalHomes = [{ id: "windows", home: path.join(root, "windows") }];
  const assessment = await assessTargets(config, await loadState(statePath), source);
  expect(assessment.map(({ target, status }) => [target.id, status])).toEqual([
    ["codex-config", "current"],
    ["codex-agents", "current"],
    ["codex-windows-config", "missing"],
    ["codex-windows-agents", "missing"],
  ]);
});

test("sync writes composed personal instructions to both Zed homes", async () => {
  const root = await sandbox();
  const windows = path.join(root, "windows-zed");
  const linux = path.join(root, "linux-zed");
  const statePath = path.join(root, "state.json");
  const config: PolicyConfig = {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: false },
      vscode: { enabled: false },
      zed: { enabled: true, home: windows, additionalHomes: [{ id: "linux", home: linux }] },
    },
  };
  const zedSource = { ...source, harnessInstructions: { ...source.harnessInstructions, zed: ["Zed only\n"] } };
  const result = await synchronize(config, emptyState(), statePath, zedSource);
  expect(result.changed).toEqual(["zed-agents", "zed-linux-agents"]);
  const expected = "invariants\n\nZed only\n\npreferences\n\ntechnology defaults\n";
  expect(await fs.readFile(path.join(windows, "AGENTS.md"), "utf8")).toBe(expected);
  expect(await fs.readFile(path.join(linux, "AGENTS.md"), "utf8")).toBe(expected);
});

test("Zed home order does not change state identity and a conflict blocks other writes", async () => {
  const root = await sandbox();
  const statePath = path.join(root, "state.json");
  const windows = path.join(root, "windows");
  const linux = path.join(root, "linux");
  const preview = path.join(root, "preview");
  const config: PolicyConfig = {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: false },
      vscode: { enabled: false },
      zed: { enabled: true, home: windows, additionalHomes: [{ id: "linux", home: linux }, { id: "preview", home: preview }] },
    },
  };
  await synchronize(config, emptyState(), statePath, source);
  config.harnesses.zed!.additionalHomes!.reverse();
  const state = await loadState(statePath);
  expect((await assessTargets(config, state, source)).every(({ status }) => status === "current")).toBe(true);
  await fs.writeFile(path.join(linux, "AGENTS.md"), "manual edit\n");
  const changed = { ...source, invariants: "new invariants\n" };
  await expect(synchronize(config, state, statePath, changed)).rejects.toThrow("sync preflight failed: zed-linux-agents");
  expect(await fs.readFile(path.join(windows, "AGENTS.md"), "utf8")).toBe("invariants\n\npreferences\n\ntechnology defaults\n");
});

test("overlapping Zed and Codex homes fail before writing targets", async () => {
  const root = await sandbox();
  const shared = path.join(root, "shared-home");
  const config: PolicyConfig = {
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: true, home: shared },
      vscode: { enabled: false },
      zed: { enabled: true, home: shared },
    },
  };
  await expect(synchronize(config, emptyState(), path.join(root, "state.json"), source)).rejects.toThrow("duplicate target path");
  expect(await fs.exists(path.join(shared, "AGENTS.md"))).toBe(false);
});
