import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadCanonicalSources } from "../src/sources.js";
import { renderTargets } from "../src/targets.js";
import type { PolicyConfig } from "../src/types.js";
import { emptyState } from "../src/config.js";
import { synchronize, assessTargets, loadState, nodeFileOps } from "../src/sync.js";

const roots: string[] = [];
const piPackage =
  process.env.PI_SUBAGENTS_DIR ||
  path.join(os.homedir(), ".pi", "agent", "npm", "node_modules", "pi-subagents");
const piParser = path.join(piPackage, "src", "agents", "frontmatter.js");
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-agents-"));
  roots.push(root);
  await fs.mkdir(path.join(root, "instructions"));
  for (const name of ["invariant", "preferences", "technology-defaults"]) {
    await fs.writeFile(path.join(root, "instructions", `${name}.md`), `${name}\n`);
  }
  const directory = path.join(root, "agents", "reviewer");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "role.md"), "\uFEFFInspect the requested change.\r\n");
  await fs.writeFile(path.join(directory, "pi.md"), "Use the configured Pi inspection tools.\n");
  await fs.writeFile(path.join(directory, "codex.md"), "Run permitted repository checks.\n");
  const definition = {
    description: 'Reviews "quoted" paths and C:\\source',
    pi: {
      name: "pi-reviewer",
      tools: ["@review", "mcp:context7"],
      skills: ["tdd"],
      inheritSkills: false,
      turnBudget: '{ "maxTurns": 20, "graceTurns": 8 }',
      defaultReads: "",
      completionGuard: false,
    },
    codex: {
      name: "codex_reviewer",
      model: "gpt-6-luna",
      sandbox_mode: "read-only",
      tools: { view_image: true, web_search: false },
      skills: { config: [{ path: "/skills/review", enabled: true }] },
      mcp_servers: {
        docs: {
          command: "node",
          args: ["C:\\docs\\server.js", 'say "hello"'],
          env_vars: ["DOCS_TOKEN"],
          enabled_tools: ["search"],
          tools: { search: { approval_mode: "prompt", output_token_limit: 1000 } },
        },
      },
    },
  };
  await fs.writeFile(path.join(directory, "agent.json"), JSON.stringify(definition));
  const config: PolicyConfig = {
    schemaVersion: 1,
    resources: { instructions: false, agents: true },
    harnesses: {
      pi: { enabled: true, agentDir: path.join(root, "pi") },
      codex: {
        enabled: true,
        home: path.join(root, "codex"),
        additionalHomes: [{ id: "windows", home: path.join(root, "windows") }],
      },
      vscode: { enabled: false },
    },
  };
  return { root, directory, definition, config };
}

test.each([
  "prefix ${paths.serverScript}",
  "${paths.serverScript}/entry.js",
  "${paths.serverScript",
  "${paths.}",
])(
  "rejects incomplete or embedded path reference %s before synchronization writes",
  async (reference) => {
    const f = await fixture();
    f.definition.codex.mcp_servers.docs.args = [reference];
    await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
    const source = await loadCanonicalSources(f.root);
    await expect(
      synchronize(f.config, emptyState(), path.join(f.root, "state.json"), source),
    ).rejects.toThrow("must occupy the entire string");
    expect(await fs.exists(path.join(f.root, "pi"))).toBe(false);
    expect(await fs.exists(path.join(f.root, "codex"))).toBe(false);
    expect(await fs.exists(path.join(f.root, "state.json"))).toBe(false);
  },
);

test("resolved native paths preserve escaping and source definitions across rendering contexts", async () => {
  const f = await fixture();
  f.definition.codex.mcp_servers.docs.args = ["${paths.serverScript}", "${UNRELATED_VARIABLE}"];
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
  const sources = await loadCanonicalSources(f.root);
  const original = JSON.stringify(sources.agents);
  f.config.paths = { serverScript: '/fixtures/Docs "quoted"/server\\entry.js' };
  const targets = renderTargets(f.config, sources);
  const native = JSON.parse(
    execFileSync(
      "python3",
      ["-c", "import tomllib,json,sys;print(json.dumps(tomllib.loads(sys.stdin.read())))"],
      { input: targets.find(({ id }) => id === "codex-agent-reviewer")!.desired, encoding: "utf8" },
    ),
  );
  expect(native.mcp_servers.docs.args).toEqual([
    '/fixtures/Docs "quoted"/server\\entry.js',
    "${UNRELATED_VARIABLE}",
  ]);
  expect(native.mcp_servers.docs.env_vars).toEqual(["DOCS_TOKEN"]);
  expect(renderTargets(f.config, sources)).toEqual(targets);
  const moved = renderTargets(
    { ...f.config, paths: { serverScript: "/moved/server.js" } },
    sources,
  );
  expect(moved.find(({ id }) => id === "codex-agent-reviewer")!.desired).toContain(
    'args = ["/moved/server.js", "${UNRELATED_VARIABLE}"]',
  );
  expect(JSON.stringify(sources.agents)).toBe(original);
});

test("native validation rejects a resolved Pi list item that cannot be represented", async () => {
  const f = await fixture();
  f.definition.pi.skills = ["${paths.reviewSkill}"];
  f.config.paths = { reviewSkill: "/skills/contains,comma/SKILL.md" };
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
  await expect(
    synchronize(
      f.config,
      emptyState(),
      path.join(f.root, "state.json"),
      await loadCanonicalSources(f.root),
    ),
  ).rejects.toThrow("unrepresentable list item");
  expect(await fs.exists(path.join(f.root, "pi"))).toBe(false);
  expect(await fs.exists(path.join(f.root, "state.json"))).toBe(false);
});

test("unrepresentable Pi metadata blocks synchronization before any target is written", async () => {
  const f = await fixture();
  f.definition.description = "invalid\u0000control";
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
  await expect(synchronize(
    f.config, emptyState(), path.join(f.root, "state.json"), await loadCanonicalSources(f.root),
  )).rejects.toThrow("description cannot preserve");
  for (const name of ["pi", "codex", "windows", "state.json"])
    expect(await fs.exists(path.join(f.root, name))).toBe(false);
});

test("loads native profiles and renders one shared role with isolated native settings", async () => {
  const f = await fixture();
  const targets = renderTargets(f.config, await loadCanonicalSources(f.root));
  expect(targets.map(({ id }) => id)).toEqual([
    "pi-agent-reviewer",
    "codex-agent-reviewer",
    "codex-windows-agent-reviewer",
  ]);
  expect(targets[0].path).toBe(path.join(f.root, "pi", "agents", "pi-reviewer.md"));
  expect(targets[1].path).toBe(path.join(f.root, "codex", "agents", "reviewer.toml"));
  expect(targets[0].desired).toContain("inheritSkills: false\n");
  expect(targets[0].desired).toContain(
    "Inspect the requested change.\n\nUse the configured Pi inspection tools.\n",
  );
  expect(targets[0].desired).not.toContain("Run permitted repository checks.");
  const native = JSON.parse(
    execFileSync(
      "python3",
      ["-c", "import tomllib,json,sys;print(json.dumps(tomllib.loads(sys.stdin.read())))"],
      { input: targets[1].desired, encoding: "utf8" },
    ),
  );
  expect(native).toEqual({
    ...f.definition.codex,
    description: f.definition.description,
    developer_instructions: "Inspect the requested change.\n\nRun permitted repository checks.\n",
  });
  expect(targets[2].desired).toBe(targets[1].desired);
});

test("shared harness instructions precede the role and native supplement exactly once", async () => {
  const f = await fixture();
  await fs.writeFile(path.join(f.root, "agents", "pi.md"), "\uFEFFShared Pi guidance.\r\n");
  await fs.writeFile(path.join(f.root, "agents", "codex.md"), "Shared Codex guidance.\n");
  const helper = path.join(f.root, "agents", "helper");
  await fs.mkdir(helper);
  await fs.writeFile(path.join(helper, "role.md"), "Different role.\n");
  await fs.writeFile(
    path.join(helper, "agent.json"),
    JSON.stringify({ description: "Pi-only helper", pi: { name: "pi-helper", tools: "@inspect" } }),
  );
  const targets = renderTargets(f.config, await loadCanonicalSources(f.root));
  expect(targets).toHaveLength(4);
  const piHelper = targets.find(({ id }) => id === "pi-agent-helper")!;
  expect(piHelper.desired).toEndWith("Shared Pi guidance.\n\nDifferent role.\n");
  expect(piHelper.desired.match(/Shared Pi guidance\./g)).toHaveLength(1);
  expect(piHelper.desired).not.toContain("Shared Codex guidance.");
  const pi = targets.find(({ id }) => id === "pi-agent-reviewer")!;
  expect(pi.desired).toEndWith(
    "Shared Pi guidance.\n\nInspect the requested change.\n\nUse the configured Pi inspection tools.\n",
  );
  expect(pi.desired.match(/Shared Pi guidance\./g)).toHaveLength(1);
  expect(pi.desired).not.toContain("Shared Codex guidance.");
  const codex = targets.filter(({ id }) => id.startsWith("codex"));
  for (const target of codex) {
    const native = JSON.parse(
      execFileSync(
        "python3",
        ["-c", "import tomllib,json,sys;print(json.dumps(tomllib.loads(sys.stdin.read())))"],
        { input: target.desired, encoding: "utf8" },
      ),
    );
    expect(native).toEqual({
      ...f.definition.codex,
      description: f.definition.description,
      developer_instructions:
        "Shared Codex guidance.\n\nInspect the requested change.\n\nRun permitted repository checks.\n",
    });
    expect(native.developer_instructions.match(/Shared Codex guidance\./g)).toHaveLength(1);
    expect(native.developer_instructions).not.toContain("Shared Pi guidance.");
  }
  expect(codex[0].desired).toBe(codex[1].desired);
});

test("changing or removing shared instructions updates only that harness's managed prompts", async () => {
  const f = await fixture();
  const sharedPi = path.join(f.root, "agents", "pi.md");
  const sharedCodex = path.join(f.root, "agents", "codex.md");
  const statePath = path.join(f.root, "state.json");
  await fs.writeFile(sharedPi, "Original shared Pi guidance.\n");
  await fs.writeFile(sharedCodex, "");
  await synchronize(f.config, emptyState(), statePath, await loadCanonicalSources(f.root));
  const piFile = path.join(f.root, "pi", "agents", "pi-reviewer.md");
  const codexFile = path.join(f.root, "codex", "agents", "reviewer.toml");
  const originalCodex = await fs.readFile(codexFile, "utf8");
  const originalState = await fs.readFile(statePath, "utf8");
  await fs.writeFile(sharedPi, "Updated shared Pi guidance.\n");
  const sources = await loadCanonicalSources(f.root);
  const preview = await synchronize(f.config, await loadState(statePath), statePath, sources, {
    dryRun: true,
  });
  expect(preview.actions.filter(({ action }) => action === "update").map(({ id }) => id)).toEqual([
    "pi-agent-reviewer",
  ]);
  expect(await fs.readFile(statePath, "utf8")).toBe(originalState);
  expect(await fs.readFile(piFile, "utf8")).toContain("Original shared Pi guidance.");
  expect(
    (await synchronize(f.config, await loadState(statePath), statePath, sources)).changed,
  ).toEqual(["pi-agent-reviewer"]);
  expect(await fs.readFile(piFile, "utf8")).toContain("Updated shared Pi guidance.");
  expect(await fs.readFile(codexFile, "utf8")).toBe(originalCodex);
  await fs.unlink(sharedPi);
  expect(
    (
      await synchronize(
        f.config,
        await loadState(statePath),
        statePath,
        await loadCanonicalSources(f.root),
      )
    ).changed,
  ).toEqual(["pi-agent-reviewer"]);
  expect(await fs.readFile(piFile, "utf8")).not.toContain("shared Pi guidance.");
  expect(await fs.readFile(codexFile, "utf8")).toBe(originalCodex);
  expect(Object.keys((await loadState(statePath)).targets)).toHaveLength(3);
});

test("removes only unchanged managed agents when their source disappears", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  const sources = await loadCanonicalSources(f.root);
  await synchronize(f.config, emptyState(), statePath, sources);
  const managed = path.join(f.root, "codex", "agents", "reviewer.toml");
  const before = await fs.readFile(managed, "utf8");
  const unmanaged = path.join(f.root, "codex", "agents", "other.toml");
  await fs.writeFile(unmanaged, "unmanaged\n");
  await fs.rm(f.directory, { recursive: true });
  const removed = await loadCanonicalSources(f.root);
  expect(
    (await assessTargets(f.config, await loadState(statePath), removed)).map(
      ({ status }) => status,
    ),
  ).toEqual(["obsolete", "obsolete", "obsolete"]);
  const result = await synchronize(f.config, await loadState(statePath), statePath, removed);
  expect(await fs.exists(managed)).toBe(false);
  expect(await fs.readFile(unmanaged, "utf8")).toBe("unmanaged\n");
  expect(
    await fs.readFile(
      result.backups.find((file) => file.endsWith("codex-agent-reviewer.bak"))!,
      "utf8",
    ),
  ).toBe(before);
  expect((await loadState(statePath)).targets).toEqual({});
});

test.skipIf(!(await fs.exists(piParser)))(
  "Pi's installed parser preserves scalar quotes, extension values and native tool lists",
  async () => {
    const f = await fixture();
    f.definition.description = '"';
    await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
    const target = renderTargets(f.config, await loadCanonicalSources(f.root))[0];
    const { parseFrontmatter, parseFrontmatterList } = await import(pathToFileURL(piParser).href);
    const parsed = parseFrontmatter(target.desired);
    expect(parsed.frontmatter.description).toBe('"');
    expect(parseFrontmatterList(parsed.frontmatter.tools)).toEqual(["@review", "mcp:context7"]);
    expect(parsed.frontmatter.turnBudget).toBe('{ "maxTurns": 20, "graceTurns": 8 }');
    expect(parsed.frontmatter.inheritSkills).toBe("false");
    expect(parsed.frontmatter.defaultReads).toBe("");
    expect(parsed.body).toBe(
      "Inspect the requested change.\n\nUse the configured Pi inspection tools.",
    );
  },
);

test("Codex TOML preserves escaped control characters and multiline prompt delimiters", async () => {
  const f = await fixture();
  f.config.harnesses.pi.enabled = false;
  f.definition.description = "Control \x7f and emoji 😀";
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
  await fs.writeFile(path.join(f.directory, "role.md"), 'Inspect """ and C:\\new\\file.\n');
  const target = renderTargets(f.config, await loadCanonicalSources(f.root))
    .find(({ id }) => id === "codex-agent-reviewer")!;
  const native = JSON.parse(
    execFileSync(
      "python3",
      ["-c", "import tomllib,json,sys;print(json.dumps(tomllib.loads(sys.stdin.read())))"],
      { input: target.desired, encoding: "utf8" },
    ),
  );
  expect(native.description).toBe(f.definition.description);
  expect(native.developer_instructions).toBe(
    'Inspect """ and C:\\new\\file.\n\nRun permitted repository checks.\n',
  );
});

test("modified obsolete agents block all deletion and sibling writes", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  await synchronize(f.config, emptyState(), statePath, await loadCanonicalSources(f.root));
  const file = path.join(f.root, "codex", "agents", "reviewer.toml");
  const independent = "independent edit\n";
  await fs.writeFile(file, independent);
  await fs.rm(f.directory, { recursive: true });
  const state = await fs.readFile(statePath, "utf8");
  await expect(
    synchronize(
      f.config,
      await loadState(statePath),
      statePath,
      await loadCanonicalSources(f.root),
    ),
  ).rejects.toThrow("preflight failed");
  expect(await fs.readFile(file, "utf8")).toBe(independent);
  expect(await fs.exists(path.join(f.root, "pi", "agents", "pi-reviewer.md"))).toBe(true);
  expect(await fs.readFile(statePath, "utf8")).toBe(state);
});

test("agent removal dry-run performs zero mutations and applying it consumes the same actions", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  const source = await loadCanonicalSources(f.root);
  await synchronize(f.config, emptyState(), statePath, source);
  const before = await fs.readFile(statePath, "utf8");
  const withoutAgents = { ...source, agents: [] };
  const mutations: string[] = [];
  const io = { ...nodeFileOps };
  for (const operation of ["writeFile", "mkdir", "rename", "unlink"] as const)
    io[operation] = async () => {
      mutations.push(operation);
      throw new Error("unexpected mutation");
    };
  const preview = await synchronize(
    f.config,
    await loadState(statePath),
    statePath,
    withoutAgents,
    { dryRun: true },
    io,
  );
  expect(mutations).toEqual([]);
  expect(preview.actions.map((item) => item.action)).toEqual(["remove", "remove", "remove"]);
  expect(await fs.readFile(statePath, "utf8")).toBe(before);
  const applied = await synchronize(f.config, await loadState(statePath), statePath, withoutAgents);
  expect(applied.actions).toEqual(preview.actions);
  expect(applied.changed).toHaveLength(3);
  expect((await loadState(statePath)).targets).toEqual({});
});

test("state-write failure restores deleted agents and retains byte-exact backups", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  await synchronize(f.config, emptyState(), statePath, await loadCanonicalSources(f.root));
  const file = path.join(f.root, "codex", "agents", "reviewer.toml");
  const bytes = "\uFEFF" + (await fs.readFile(file, "utf8")).replace(/\n/g, "\r\n");
  await fs.writeFile(file, bytes);
  const priorState = await fs.readFile(statePath, "utf8");
  await fs.rm(f.directory, { recursive: true });
  const io = {
    ...nodeFileOps,
    async rename(from: string, to: string) {
      if (to === statePath) throw new Error("injected state failure");
      await nodeFileOps.rename(from, to);
    },
  };
  await expect(
    synchronize(
      f.config,
      await loadState(statePath),
      statePath,
      await loadCanonicalSources(f.root),
      {},
      io,
    ),
  ).rejects.toThrow("rolled back");
  expect(await fs.readFile(file, "utf8")).toBe(bytes);
  expect(await fs.exists(path.join(f.root, "pi", "agents", "pi-reviewer.md"))).toBe(true);
  expect(await fs.readFile(statePath, "utf8")).toBe(priorState);
  const backups = path.join(f.root, "backups");
  const [run] = await fs.readdir(backups);
  expect(await fs.readFile(path.join(backups, run, "codex-agent-reviewer.bak"), "utf8")).toBe(
    bytes,
  );
  expect((await fs.readdir(f.root)).some((file) => file.endsWith(".tmp"))).toBe(false);
});

test("unmanaged aliases require explicit adoption before backed-up retirement", async () => {
  const f = await fixture();
  f.config.harnesses.codex.additionalHomes![0].retiredAgents = ["explore.toml"];
  const file = path.join(f.root, "windows", "agents", "explore.toml");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, "legacy alias\n");
  const statePath = path.join(f.root, "state.json");
  const source = await loadCanonicalSources(f.root);
  await expect(synchronize(f.config, emptyState(), statePath, source)).rejects.toThrow(
    "preflight failed",
  );
  const id = "codex-windows-agent-retired-explore";
  await synchronize(f.config, emptyState(), statePath, source, {
    adopt: true,
    adoptTargets: new Set([id]),
  });
  expect(await fs.readFile(file, "utf8")).toBe("legacy alias\n");
  expect((await loadState(statePath)).targets[id].ownedHash).toMatch(/^[a-f0-9]{64}$/);
  const result = await synchronize(f.config, await loadState(statePath), statePath, source);
  expect(await fs.exists(file)).toBe(false);
  expect(await fs.readFile(result.backups[0], "utf8")).toBe("legacy alias\n");
  expect((await loadState(statePath)).targets[id]).toBeUndefined();
  expect(
    (await assessTargets(f.config, await loadState(statePath), source)).every(
      ({ status }) => status === "current",
    ),
  ).toBe(true);
});

test("adoption keeps recovery backups and replacement files private", async () => {
  const f = await fixture();
  const file = path.join(f.root, "codex", "agents", "reviewer.toml");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, "legacy settings\n");
  const result = await synchronize(
    f.config,
    emptyState(),
    path.join(f.root, "state.json"),
    await loadCanonicalSources(f.root),
    { adopt: true, adoptTargets: new Set(["codex-agent-reviewer"]) },
  );
  expect((await fs.stat(result.backups[0])).mode & 0o777).toBe(0o600);
  expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
});

test("disabling or moving a harness preserves its formerly managed agents", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  await synchronize(f.config, emptyState(), statePath, await loadCanonicalSources(f.root));
  f.config.harnesses.pi.enabled = false;
  f.config.harnesses.codex.home = path.join(f.root, "new-home");
  f.config.harnesses.codex.additionalHomes = [];
  const result = await synchronize(f.config, await loadState(statePath), statePath, {
    ...(await loadCanonicalSources(f.root)),
    agents: [],
  });
  expect(result.changed).toEqual([]);
  expect(Object.keys((await loadState(statePath)).targets)).toHaveLength(3);
  expect(await fs.exists(path.join(f.root, "codex", "agents", "reviewer.toml"))).toBe(true);
});

test("a source rename cannot schedule deletion of an agent path still being generated", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  await synchronize(f.config, emptyState(), statePath, await loadCanonicalSources(f.root));
  const before = await fs.readFile(statePath, "utf8");
  await fs.rename(f.directory, path.join(f.root, "agents", "renamed"));
  await expect(
    synchronize(
      f.config,
      await loadState(statePath),
      statePath,
      await loadCanonicalSources(f.root),
    ),
  ).rejects.toThrow("duplicate target path");
  expect(await fs.exists(path.join(f.root, "pi", "agents", "pi-reviewer.md"))).toBe(true);
  expect(await fs.readFile(statePath, "utf8")).toBe(before);
});

test("a target changed during backup creation is preserved instead of being deleted", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  await synchronize(f.config, emptyState(), statePath, await loadCanonicalSources(f.root));
  const file = path.join(f.root, "pi", "agents", "pi-reviewer.md");
  await fs.rm(f.directory, { recursive: true });
  const priorState = await fs.readFile(statePath, "utf8");
  let changed = false;
  const io = {
    ...nodeFileOps,
    async mkdir(directory: string, options: { recursive: boolean }) {
      await nodeFileOps.mkdir(directory, options);
      if (!changed && directory.includes("backups")) {
        changed = true;
        await fs.writeFile(file, "concurrent edit\n");
      }
    },
  };
  await expect(
    synchronize(
      f.config,
      await loadState(statePath),
      statePath,
      await loadCanonicalSources(f.root),
      {},
      io,
    ),
  ).rejects.toThrow("changed after preflight");
  expect(await fs.readFile(file, "utf8")).toBe("concurrent edit\n");
  expect(await fs.readFile(statePath, "utf8")).toBe(priorState);
});

test.each([
  ["tools", ["read"]],
  ["tools", { read: true }],
  ["mcp_servers", { docs: { enabled_tools: "search" } }],
  ["mcp_servers", { docs: { tools: { search: { output_token_limit: 0 } } } }],
  ["model_reasoning_effort", "unlimited"],
  ["developer_instructions", "duplicated prompt"],
  ["sandbox_mode", "workspace"],
])(
  "rejects invalid native Codex %s settings instead of silently dropping them",
  async (key, value) => {
    const f = await fixture();
    await fs.writeFile(
      path.join(f.directory, "agent.json"),
      JSON.stringify({ ...f.definition, codex: { ...f.definition.codex, [key as string]: value } }),
    );
    await expect(loadCanonicalSources(f.root)).rejects.toThrow();
  },
);

test("absent profiles omit agents, while duplicate native names fail generation", async () => {
  const f = await fixture();
  const { pi, ...definition } = f.definition;
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(definition));
  expect(renderTargets(f.config, await loadCanonicalSources(f.root))).toHaveLength(2);
  await fs.cp(f.directory, path.join(f.root, "agents", "another"), { recursive: true });
  await expect(loadCanonicalSources(f.root)).rejects.toThrow("duplicate codex agent name");
});

test("unrepresentable Pi indentation and invalid Unicode fail before generation", async () => {
  const f = await fixture();
  f.definition.description = "  indented\nplain";
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
  await expect(loadCanonicalSources(f.root)).rejects.toThrow("unrepresentable");
  f.definition.description = "\ud800";
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
  await expect(loadCanonicalSources(f.root)).rejects.toThrow("Unicode");
});

test("malformed agent JSON reports its filename without exposing source contents", async () => {
  const f = await fixture();
  await fs.writeFile(path.join(f.directory, "agent.json"), "private-placeholder is malformed JSON");
  try {
    await loadCanonicalSources(f.root);
    throw new Error("expected malformed JSON to fail");
  } catch (error: any) {
    expect(error.message).toContain("agent.json is not valid JSON");
    expect(error.message).not.toContain("private-placeholder");
  }
});

test("customizing agent metadata and prompts preserves independent harness profiles", async () => {
  const f = await fixture();
  f.definition.description = 'New role: "custom" instructions';
  f.definition.pi.name = "custom-planner";
  f.definition.pi.tools = ["@inspect"];
  f.definition.codex.name = "custom_planner";
  await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(f.definition));
  await fs.writeFile(path.join(f.directory, "role.md"), "Entirely revised personal instructions.\n");
  const targets = renderTargets(f.config, await loadCanonicalSources(f.root));
  expect(targets.map(({ id }) => id)).toEqual([
    "pi-agent-reviewer", "codex-agent-reviewer", "codex-windows-agent-reviewer",
  ]);
  expect(targets[0].path).toBe(path.join(f.root, "pi", "agents", "custom-planner.md"));
  expect(targets[0].desired).toEndWith(
    "Entirely revised personal instructions.\n\nUse the configured Pi inspection tools.\n",
  );
  const native = JSON.parse(execFileSync("python3", [
    "-c", "import tomllib,json,sys;print(json.dumps(tomllib.loads(sys.stdin.read())))",
  ], { input: targets[1].desired, encoding: "utf8" }));
  expect(native).toEqual({
    ...f.definition.codex,
    description: f.definition.description,
    developer_instructions: "Entirely revised personal instructions.\n\nRun permitted repository checks.\n",
  });
  expect(targets[2].desired).toBe(targets[1].desired);
});

test.skipIf(!(await fs.exists(piParser)))(
  "Pi profile metadata overrides inherited description without constraining prompt text",
  async () => {
    const f = await fixture();
    const definition = { ...f.definition, pi: { ...f.definition.pi, description: "Pi-specific purpose" } };
    await fs.writeFile(path.join(f.directory, "agent.json"), JSON.stringify(definition));
    const target = renderTargets(f.config, await loadCanonicalSources(f.root))[0];
    const { parseFrontmatter, parseFrontmatterList } = await import(pathToFileURL(piParser).href);
    const parsed = parseFrontmatter(target.desired);
    expect(parsed.frontmatter.description).toBe("Pi-specific purpose");
    expect(parseFrontmatterList(parsed.frontmatter.tools)).toEqual(f.definition.pi.tools);
    expect(parsed.body).toBe("Inspect the requested change.\n\nUse the configured Pi inspection tools.");
  },
);
