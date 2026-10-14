import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emptyState, parsePolicyConfig, profileConfig } from "../src/config.js";
import { loadCanonicalSources } from "../src/sources.js";
import { renderTargets } from "../src/targets.js";
import { assessTargets, loadState, synchronize } from "../src/sync.js";
import { nodeFileOps } from "../src/files.js";
import { renderVsCodeAgent } from "../src/agents.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-vscode-"));
  roots.push(root);
  const directory = path.join(root, "agents", "scout");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "role.md"), "Inspect the requested code.\n");
  await fs.writeFile(path.join(directory, "agent.json"), JSON.stringify({
    description: "Find relevant code.",
    vscode: { name: "Code Scout", tools: ["read", "search"] },
  }));
  const profile = {
    schemaVersion: 2,
    kind: "agents",
    enabled: true,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: false },
      vscode: { enabled: true, directories: [{ id: "insiders", path: path.join(root, "prompts") }] },
    },
  };
  return { root, directory, profile };
}

test("renders a VS Code-only role into its named agent directory", async () => {
  const f = await fixture();
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  const targets = renderTargets(config, sources);
  expect(targets).toHaveLength(1);
  expect(targets[0].id).toBe("vscode-insiders-agent-scout");
  expect(targets[0].path).toBe(path.join(f.root, "prompts", "scout.agent.md"));
  expect(Bun.YAML.parse(targets[0].desired.split("---\n")[1])).toEqual({
    name: "Code Scout", description: "Find relevant code.", tools: ["read", "search"],
  });
  expect(targets[0].desired.split("---\n")[2]).toBe("\nInspect the requested code.\n");
});

test("preserves VS Code frontmatter values and composes native procedures after the shared role", async () => {
  const f = await fixture();
  const native = {
    name: "Scout: Unicode Ω",
    fileName: "codebase-scout.agent.md",
    description: "Quoted \"paths\" C:\\source\n---\nNext\u0085line\u2028separator\u2029end",
    model: ["Model B (vendor)", "Model A (vendor)"],
    tools: ["read", "search", "docs/*"],
    agents: [],
    "argument-hint": "Inspect a path: #file",
    "user-invocable": false,
    "disable-model-invocation": true,
  };
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify({ description: "Shared description", vscode: native }));
  await fs.writeFile(path.join(f.root, "agents", "vscode.md"), "Shared native procedures.\r\n");
  await fs.writeFile(path.join(f.directory, "vscode.md"), "Use enabled search tools.\n");
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const [target] = renderTargets(config, await loadCanonicalSources(f.root, config.resources));
  const { fileName, ...expected } = native;
  expect(target.path).toBe(path.join(f.root, "prompts", fileName));
  expect(Bun.YAML.parse(target.desired.split("---\n")[1])).toEqual(expected);
  expect(target.desired.split("---\n")[2]).toBe("\nShared native procedures.\n\nInspect the requested code.\n\nUse enabled search tools.\n");
  expect(target.desired).not.toContain("fileName:");
});

test.each([
  [{ model: [] }, "model"],
  [{ model: 12 }, "model"],
  [{ model: ["usable", ""] }, "model"],
  [{ tools: "read,search" }, "tools"],
  [{ agents: "anything" }, "agents"],
  [{ agents: ["Worker"], tools: ["read"] }, "agent tool"],
  [{ "user-invocable": "false" }, "boolean"],
  [{ "disable-model-invocation": 1 }, "boolean"],
  [{ name: "" }, "name"],
  [{ name: "Unsafe\nName" }, "name"],
  [{ fileName: "../outside.agent.md" }, "fileName"],
  [{ fileName: "not-an-agent.md" }, "fileName"],
  [{ hooks: {} }, "unsupported"],
  [{ tools: ["bad\ud800"] }, "Unicode"],
])("rejects invalid VS Code native fields %j", async (fields, message) => {
  const f = await fixture();
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify({
    description: "Shared", vscode: { name: "Scout", tools: ["read"], ...fields },
  }));
  await expect(loadCanonicalSources(f.root, { instructions: false, agents: true })).rejects.toThrow(message);
});

test("rejects duplicate VS Code display names even when a role uses its default name", async () => {
  const f = await fixture();
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify({ description: "Scout", vscode: {} }));
  const other = path.join(f.root, "agents", "other");
  await fs.mkdir(other);
  await fs.writeFile(path.join(other, "role.md"), "Another role.\n");
  await fs.writeFile(path.join(other, "agent.json"), JSON.stringify({ description: "Other", vscode: { name: "scout" } }));
  await expect(loadCanonicalSources(f.root, { instructions: false, agents: true })).rejects.toThrow("duplicate vscode agent name: scout");
});

test("accepts a single native model and an explicit wildcard subagent selection", async () => {
  const f = await fixture();
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify({
    description: "Shared", vscode: { model: "Single model", tools: ["agent", "read"], agents: "*" },
  }));
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const [target] = renderTargets(config, await loadCanonicalSources(f.root, config.resources));
  expect(Bun.YAML.parse(target.desired.split("---\n")[1])).toEqual({
    name: "scout", description: "Shared", model: "Single model", tools: ["agent", "read"], agents: "*",
  });
});

test("rendering rejects a VS Code profile without its composed prompt", () => {
  expect(() => renderVsCodeAgent({
    id: "reviewer", description: "Review", role: "Review the change", piInstructions: "", codexInstructions: "",
    vscode: { tools: ["read"] },
  })).toThrow("vscodeInstructions");
});

test("rejects colliding filename overrides before targets or ownership are written", async () => {
  const f = await fixture();
  const directory = path.join(f.root, "agents", "other");
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, "role.md"), "Other responsibility\n");
  await fs.writeFile(path.join(directory, "agent.json"), JSON.stringify({
    description: "Other", vscode: { fileName: "scout.agent.md" },
  }));
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  const statePath = path.join(f.root, "state.json");
  await expect(synchronize(config, emptyState(), statePath, sources)).rejects.toThrow("duplicate target path");
  expect(await fs.exists(path.join(f.root, "prompts"))).toBe(false);
  expect(await fs.exists(statePath)).toBe(false);
});

test("retires an unchanged owned .agent.md after source removal and preserves unmanaged files", async () => {
  const f = await fixture();
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const statePath = path.join(f.root, "state.json");
  const sources = await loadCanonicalSources(f.root, config.resources);
  await synchronize(config, emptyState(), statePath, sources);
  const file = path.join(f.root, "prompts", "scout.agent.md");
  const original = await fs.readFile(file, "utf8");
  const unknown = path.join(f.root, "prompts", "local.agent.md");
  await fs.writeFile(unknown, "Unmanaged agent\n");
  const removed = { ...sources, agents: [] };
  const preview = await synchronize(config, await loadState(statePath), statePath, removed, { dryRun: true });
  expect(preview.actions[0].action).toBe("remove");
  expect(await fs.readFile(file, "utf8")).toBe(original);
  const result = await synchronize(config, await loadState(statePath), statePath, removed);
  expect(await fs.exists(file)).toBe(false);
  expect(await fs.readFile(unknown, "utf8")).toBe("Unmanaged agent\n");
  expect(await fs.readFile(result.backups[0], "utf8")).toBe(original);
  expect((await loadState(statePath)).targets).toEqual({});
});

test("normalizes destination paths so owned agents can be retired after configuration round-trip", async () => {
  const f = await fixture();
  f.profile.harnesses.vscode.directories[0].path = path.join(f.root, "prompts") + "/./";
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  expect(config.harnesses.vscode.directories![0].path).toBe(path.join(f.root, "prompts"));
  expect(profileConfig(config, "agents").harnesses.vscode).toEqual(config.harnesses.vscode);
  const statePath = path.join(f.root, "state.json");
  const sources = await loadCanonicalSources(f.root, config.resources);
  await synchronize(config, emptyState(), statePath, sources);
  await synchronize(config, await loadState(statePath), statePath, { ...sources, agents: [] });
  expect(await fs.exists(path.join(f.root, "prompts", "scout.agent.md"))).toBe(false);
});

test("rejects ambiguous target identities across roles and named destinations", async () => {
  const f = await fixture();
  f.profile.harnesses.vscode.directories.push({ id: "insiders-agent", path: path.join(f.root, "other-prompts") });
  const directory = path.join(f.root, "agents", "agent-scout");
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, "role.md"), "Other role\n");
  await fs.writeFile(path.join(directory, "agent.json"), JSON.stringify({ description: "Other", vscode: {} }));
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  expect(() => renderTargets(config, sources)).toThrow("duplicate target id");
});

test.each([
  [null, "boolean enabled"],
  [{ enabled: true }, "directories array"],
  [{ enabled: true, directories: [] }, "directories array"],
  [{ enabled: false, directories: "bad" }, "array"],
  [{ enabled: true, directories: [{ id: "Insiders", path: "/prompts" }] }, "lowercase id"],
  [{ enabled: true, directories: [{ id: "local", path: "relative" }] }, "absolute path"],
  [{ enabled: true, directories: [{ id: "local", path: "/bad\0path" }] }, "invalid path"],
  [{ enabled: true, directories: [{ id: "local", path: "/bad\ud800" }] }, "invalid path"],
  [{ enabled: true, directories: [{ id: "local", path: "/one" }, { id: "local", path: "/two" }] }, "duplicate VS Code directory id"],
  [{ enabled: true, directories: [{ id: "one", path: "/same" }, { id: "two", path: "/same/./" }] }, "duplicate VS Code directory path"],
  [{ enabled: false, targets: [] }, "unsupported key: targets"],
])("rejects malformed VS Code agent destinations %j", (vscode, message) => {
  expect(() => parsePolicyConfig(JSON.stringify({
    schemaVersion: 2, kind: "agents", enabled: true,
    harnesses: { pi: { enabled: false }, codex: { enabled: false }, vscode },
  }), "linux", "agents")).toThrow(message);
});

test("Windows destinations use Windows absolute paths and detect case-insensitive aliases", () => {
  const profile = {
    schemaVersion: 2, kind: "agents", enabled: true,
    harnesses: { pi: { enabled: false }, codex: { enabled: false }, vscode: {
      enabled: true, directories: [{ id: "insiders", path: "C:\\Users\\agent\\Prompts" }],
    } },
  };
  expect(parsePolicyConfig(JSON.stringify(profile), "win32", "agents").harnesses.vscode.directories).toEqual(profile.harnesses.vscode.directories);
  expect(() => parsePolicyConfig(JSON.stringify(profile), "linux", "agents")).toThrow("absolute path");
  profile.harnesses.vscode.directories.push({ id: "other", path: "c:\\users\\agent\\prompts\\" });
  expect(() => parsePolicyConfig(JSON.stringify(profile), "win32", "agents")).toThrow("duplicate VS Code directory path");
});

test("VS Code agent directories do not leak into instruction settings or legacy agent imports", () => {
  const legacy = {
    schemaVersion: 1, harnesses: { pi: { enabled: false }, codex: { enabled: false },
      vscode: { enabled: true, targets: ["/instruction.md"] } },
  };
  expect(profileConfig(parsePolicyConfig(JSON.stringify(legacy)), "agents").harnesses.vscode).toBeUndefined();
  const config = parsePolicyConfig(JSON.stringify({
    schemaVersion: 2, kind: "agents", enabled: true,
    harnesses: { pi: { enabled: false }, codex: { enabled: false },
      vscode: { enabled: true, directories: [{ id: "user", path: "/prompts" }] } },
  }), "linux", "agents");
  expect(profileConfig(config, "instructions").harnesses.vscode).toEqual({ enabled: false });
});

test("sync previews are non-mutating and repeated synchronization is current across named destinations", async () => {
  const f = await fixture();
  f.profile.harnesses.vscode.directories.push({ id: "copilot", path: path.join(f.root, "copilot") });
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  const statePath = path.join(f.root, "state.json");
  const preview = await synchronize(config, emptyState(), statePath, sources, { dryRun: true });
  expect(preview.actions.map(({ action }) => action)).toEqual(["create", "create"]);
  expect(await fs.exists(path.join(f.root, "prompts"))).toBe(false);
  expect(await fs.exists(path.join(f.root, "copilot"))).toBe(false);
  expect(await fs.exists(statePath)).toBe(false);
  const applied = await synchronize(config, emptyState(), statePath, sources);
  expect(applied.changed).toEqual(["vscode-insiders-agent-scout", "vscode-copilot-agent-scout"]);
  expect(await fs.readFile(path.join(f.root, "prompts", "scout.agent.md"), "utf8")).toBe(await fs.readFile(path.join(f.root, "copilot", "scout.agent.md"), "utf8"));
  const repeated = await synchronize(config, await loadState(statePath), statePath, sources);
  expect(repeated.changed).toEqual([]);
  expect(repeated.stateChanged).toBe(false);
  expect((await assessTargets(config, await loadState(statePath), sources)).map(({ status }) => status)).toEqual(["current", "current"]);
  await fs.writeFile(path.join(f.directory, "role.md"), "Updated canonical responsibility.\n");
  const updated = await loadCanonicalSources(f.root, config.resources);
  expect((await assessTargets(config, await loadState(statePath), updated)).map(({ status }) => status)).toEqual(["stale", "stale"]);
  await synchronize(config, await loadState(statePath), statePath, updated);
  expect(await fs.readFile(path.join(f.root, "prompts", "scout.agent.md"), "utf8")).toEndWith("Updated canonical responsibility.\n");
});

test("targeted adoption preserves conflicting unselected agents and their ownership", async () => {
  const f = await fixture();
  f.profile.harnesses.vscode.directories.push({ id: "copilot", path: path.join(f.root, "copilot") });
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  const statePath = path.join(f.root, "state.json");
  await synchronize(config, emptyState(), statePath, sources);
  const selected = path.join(f.root, "prompts", "scout.agent.md");
  const unselected = path.join(f.root, "copilot", "scout.agent.md");
  const desired = await fs.readFile(selected, "utf8");
  await fs.writeFile(selected, "Local selected edits\n");
  await fs.writeFile(unselected, "Local unselected edits\n");
  const state = await loadState(statePath);
  const preview = await synchronize(config, state, statePath, sources, {
    dryRun: true, adopt: true, adoptTargets: new Set(["vscode-insiders-agent-scout"]),
  });
  expect(preview.issues).toEqual([]);
  expect(await fs.readFile(selected, "utf8")).toBe("Local selected edits\n");
  await expect(synchronize(config, state, statePath, sources)).rejects.toThrow("preflight failed");
  const result = await synchronize(config, state, statePath, sources, {
    adopt: true, adoptTargets: new Set(["vscode-insiders-agent-scout"]),
  });
  expect(result.changed).toEqual(["vscode-insiders-agent-scout"]);
  expect(await fs.readFile(result.backups[0], "utf8")).toBe("Local selected edits\n");
  expect(await fs.readFile(selected, "utf8")).toBe(desired);
  expect(await fs.readFile(unselected, "utf8")).toBe("Local unselected edits\n");
  expect((await loadState(statePath)).targets["vscode-copilot-agent-scout"]).toEqual(state.targets["vscode-copilot-agent-scout"]);
  expect((await assessTargets(config, await loadState(statePath), sources)).map(({ status }) => status)).toEqual(["current", "conflict"]);
});

test("disabling or moving a VS Code destination preserves its prior agents and ownership", async () => {
  const f = await fixture();
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  const statePath = path.join(f.root, "state.json");
  await synchronize(config, emptyState(), statePath, sources);
  const state = await fs.readFile(statePath, "utf8");
  const file = path.join(f.root, "prompts", "scout.agent.md");
  const bytes = await fs.readFile(file, "utf8");
  config.harnesses.vscode.enabled = false;
  expect((await synchronize(config, await loadState(statePath), statePath, { ...sources, agents: [] })).changed).toEqual([]);
  config.harnesses.vscode.enabled = true;
  config.harnesses.vscode.directories![0].path = path.join(f.root, "moved");
  expect((await synchronize(config, await loadState(statePath), statePath, { ...sources, agents: [] })).changed).toEqual([]);
  expect(await fs.readFile(statePath, "utf8")).toBe(state);
  expect(await fs.readFile(file, "utf8")).toBe(bytes);
  await expect(synchronize(config, await loadState(statePath), statePath, sources)).rejects.toThrow("preflight failed");
});

test("VS Code retirements reject plain Markdown paths and locally edited managed agents", async () => {
  const f = await fixture();
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  const statePath = path.join(f.root, "state.json");
  await synchronize(config, emptyState(), statePath, sources);
  const state = await loadState(statePath);
  const removed = { ...sources, agents: [] };
  const file = path.join(f.root, "prompts", "scout.agent.md");
  await fs.writeFile(file, "Independent changes\n");
  await expect(synchronize(config, state, statePath, removed)).rejects.toThrow("preflight failed");
  expect(await fs.readFile(file, "utf8")).toBe("Independent changes\n");
  state.targets["vscode-insiders-agent-scout"].path = path.join(f.root, "prompts", "ordinary.md");
  await expect(assessTargets(config, state, removed)).rejects.toThrow("invalid managed agent path");
});

test("state-write failure rolls back VS Code deletions and keeps byte-exact recovery backups", async () => {
  const f = await fixture();
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  const statePath = path.join(f.root, "state.json");
  await synchronize(config, emptyState(), statePath, sources);
  const file = path.join(f.root, "prompts", "scout.agent.md");
  const bytes = "\uFEFF" + (await fs.readFile(file, "utf8")).replace(/\n/g, "\r\n");
  await fs.writeFile(file, bytes);
  const state = await fs.readFile(statePath, "utf8");
  const io = { ...nodeFileOps, async rename(from: string, to: string) {
    if (to === statePath) throw new Error("Injected state write failure");
    await nodeFileOps.rename(from, to);
  } };
  await expect(synchronize(config, await loadState(statePath), statePath, { ...sources, agents: [] }, {}, io)).rejects.toThrow("rolled back");
  expect(await fs.readFile(file, "utf8")).toBe(bytes);
  expect(await fs.readFile(statePath, "utf8")).toBe(state);
  const [backup] = await fs.readdir(path.join(f.root, "backups"));
  expect(await fs.readFile(path.join(f.root, "backups", backup, "vscode-insiders-agent-scout.bak"), "utf8")).toBe(bytes);
  expect((await fs.readdir(path.dirname(file))).filter((name) => name.endsWith(".tmp"))).toEqual([]);
});

test("concurrent edits during VS Code backup stop replacement and preserve the concurrent content", async () => {
  const f = await fixture();
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const sources = await loadCanonicalSources(f.root, config.resources);
  const statePath = path.join(f.root, "state.json");
  await synchronize(config, emptyState(), statePath, sources);
  const state = await fs.readFile(statePath, "utf8");
  const file = path.join(f.root, "prompts", "scout.agent.md");
  await fs.writeFile(path.join(f.directory, "role.md"), "New shared role\n");
  const updated = await loadCanonicalSources(f.root, config.resources);
  const io = { ...nodeFileOps, async writeFile(destination: string, content: string, options: any) {
    await nodeFileOps.writeFile(destination, content, options);
    if (destination.endsWith("vscode-insiders-agent-scout.bak")) await fs.writeFile(file, "Concurrent edit\n");
  } };
  await expect(synchronize(config, await loadState(statePath), statePath, updated, {}, io)).rejects.toThrow("changed after preflight");
  expect(await fs.readFile(file, "utf8")).toBe("Concurrent edit\n");
  expect(await fs.readFile(statePath, "utf8")).toBe(state);
});
