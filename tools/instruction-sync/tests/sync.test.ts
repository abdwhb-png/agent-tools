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

const source = { invariants: "invariants\n", preferences: "preferences\n", piAppend: "append\n" };

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
  await expect(synchronize(config, await loadState(statePath), statePath, { invariants: "new\n", preferences: "new\n", piAppend: "new\n" }, {}, failingIo)).rejects.toThrow("changed targets were rolled back");
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
  expect(await fs.readFile(path.join(config.harnesses.pi.agentDir!, "AGENTS.md"), "utf8")).toBe("preferences\n");
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
