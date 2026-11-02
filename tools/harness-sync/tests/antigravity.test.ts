import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  emptyState,
  parsePolicyConfig,
  profileConfig,
  stateForDomain,
} from "../src/config.js";
import { loadCanonicalSources } from "../src/sources.js";
import { agentDirectories, renderTargets } from "../src/targets.js";
import { assessTargets, loadState, synchronize } from "../src/sync.js";
import {
  ANTIGRAVITY_BUILTIN_TOOLS,
  renderAntigravityAgent,
  renderCodexAgent,
} from "../src/agents.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

test("every catalog role renders a valid Antigravity profile through the real sources", async () => {
  const repositoryRoot = path.resolve(import.meta.dir, "..", "..", "..");
  const agents = await loadCanonicalSources(repositoryRoot, { instructions: false, agents: true });
  expect(agents.agents?.length).toBe(17);
  expect(agents.agents!.map(({ id }) => id)).not.toContain("videographer");

  const inheritors = new Set([
    "api-reviewer",
    "architect",
    "code-reviewer",
    "factual-researcher",
    "librarian",
    "oracle",
    "performance-reviewer",
    "pi-expert",
    "quick-reviewer",
    "scout",
    "security-reviewer",
    "style-reviewer",
  ]);

  for (const agent of agents.agents!) {
    expect(agent.antigravity).toBeDefined();
    const rendered = renderAntigravityAgent(agent, {
      piSessionRecallScript: "/opt/pi-session-recall/dist/mcp-bin.js",
      piProjectDir: "/opt/.pi",
    });
    const frontmatter = Bun.YAML.parse(rendered.split("---\n")[1]);
    expect(frontmatter.name).toBe(agent.id);
    expect(frontmatter.mainAgent).toBe(true);
    expect(frontmatter.subagent).toBe(true);
    expect(frontmatter.inheritMcp).toBe(inheritors.has(agent.id));
    expect(["inherit", "flash_lite", "flash", "pro"]).toContain(frontmatter.model);
    expect(["off", "auto", "eager", "sandbox"]).toContain(frontmatter.commandExecutionPolicy);
    expect(frontmatter.tools.length).toBeGreaterThan(0);
    for (const tool of frontmatter.tools)
      expect(ANTIGRAVITY_BUILTIN_TOOLS).toContain(tool);
    expect(rendered.split("---\n")[2]).toContain(agent.role.trim());
    if (agent.id === "pi-expert") {
      expect(frontmatter.mcpServers).toEqual([
        {
          name: "pi-session-recall",
          command: "node",
          args: [
            "/opt/pi-session-recall/dist/mcp-bin.js",
            "--project-dir",
            "/opt/.pi",
          ],
        },
      ]);
    } else {
      expect(frontmatter.mcpServers).toBeUndefined();
    }
  }
});

test("renders the repository MCP registry through the instruction targets", async () => {
  const repositoryRoot = path.resolve(import.meta.dir, "..", "..", "..");
  const sources = await loadCanonicalSources(repositoryRoot, {
    instructions: true,
    agents: false,
  });
  expect(sources.antigravityMcp).toBeDefined();
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-antigravity-"));
  roots.push(root);
  const directory = path.join(root, "agents", "security-reviewer");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "role.md"), "Audit code for security flaws.\n");
  await fs.writeFile(
    path.join(directory, "agent.json"),
    JSON.stringify({
      description: "Read-only security reviewer.",
      antigravity: {
        model: "pro",
        commandExecutionPolicy: "off",
        inheritMcp: true,
        tools: ["view_file", "grep_search", "find_by_name", "code_search"],
      },
    }),
  );
  const profile = {
    schemaVersion: 2 as const,
    kind: "agents" as const,
    enabled: true,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: false },
      antigravity: {
        enabled: true,
        home: path.join(root, "gemini-linux"),
        additionalHomes: [{ id: "windows", home: path.join(root, "gemini-windows") }],
      },
    },
  };
  return { root, directory, profile };
}

test("renders Antigravity custom agents across homes with defaults, path bindings, and YAML frontmatter", async () => {
  const f = await fixture();
  await fs.writeFile(path.join(f.root, "agents", "antigravity.md"), "Shared Antigravity rules.\r\n");
  await fs.writeFile(path.join(f.directory, "antigravity.md"), "Role-specific Antigravity note.\n");
  await fs.writeFile(
    path.join(f.directory, "agent.json"),
    JSON.stringify({
      description: 'Reviews "quoted" paths C:\\source',
      antigravity: {
        model: "pro",
        commandExecutionPolicy: "sandbox",
        inheritMcp: true,
        inheritCustomizations: false,
        skills: ["${paths.securitySkill}"],
        plugins: ["firebase"],
        mcpServers: [
          {
            name: "recall",
            command: "node",
            args: ["${paths.recallScript}"],
          },
        ],
        tools: ["view_file", "grep_search", "run_command"],
      },
    }),
  );
  const withPaths = {
    ...f.profile,
    paths: {
      securitySkill: "/opt/skills/security",
      recallScript: "/opt/recall/index.js",
    },
  };
  const config = parsePolicyConfig(JSON.stringify(withPaths), "linux", "agents");
  expect(profileConfig(config, "agents").harnesses.antigravity).toEqual(f.profile.harnesses.antigravity);
  expect(agentDirectories(config)).toEqual([
    {
      id: "antigravity",
      directory: path.join(f.root, "gemini-linux", "config", "agents"),
      extension: ".md",
    },
    {
      id: "antigravity-windows",
      directory: path.join(f.root, "gemini-windows", "config", "agents"),
      extension: ".md",
    },
  ]);

  const sources = await loadCanonicalSources(f.root, config.resources);
  const targets = renderTargets(config, sources);
  expect(targets.map(({ id, path }) => ({ id, path }))).toEqual([
    {
      id: "antigravity-agent-security-reviewer",
      path: path.join(f.root, "gemini-linux", "config", "agents", "security-reviewer.md"),
    },
    {
      id: "antigravity-windows-agent-security-reviewer",
      path: path.join(f.root, "gemini-windows", "config", "agents", "security-reviewer.md"),
    },
  ]);
  expect(targets[0].desired).toBe(targets[1].desired);
  expect(Bun.YAML.parse(targets[0].desired.split("---\n")[1])).toEqual({
    name: "security-reviewer",
    description: 'Reviews "quoted" paths C:\\source',
    mainAgent: true,
    subagent: true,
    model: "pro",
    commandExecutionPolicy: "sandbox",
    inheritMcp: true,
    inheritCustomizations: false,
    skills: ["/opt/skills/security"],
    plugins: ["firebase"],
    mcpServers: [{ name: "recall", command: "node", args: ["/opt/recall/index.js"] }],
    tools: ["view_file", "grep_search", "run_command"],
  });
  expect(targets[0].desired.split("---\n")[2]).toBe(
    "\nShared Antigravity rules.\n\nAudit code for security flaws.\n\nRole-specific Antigravity note.\n",
  );
  expect(ANTIGRAVITY_BUILTIN_TOOLS).toContain("invoke_subagent");
});

test("browser-tester renders without a chrome-devtools server", async () => {
  const repositoryRoot = path.resolve(import.meta.dir, "..", "..", "..");
  const sources = await loadCanonicalSources(repositoryRoot, { instructions: false, agents: true });
  const browser = sources.agents!.find(({ id }) => id === "browser-tester")!;
  const codex = renderCodexAgent(browser);
  expect(codex).not.toContain("chrome_devtools");
  expect(codex).not.toContain("chrome-devtools");
});

test("retiring a role that carries MCP settings removes its files with backups", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-agy-retire-"));
  roots.push(root);
  const directory = path.join(root, "agents", "recall-reviewer");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "role.md"), "Inspect history.\n");
  await fs.writeFile(
    path.join(directory, "agent.json"),
    JSON.stringify({
      description: "Recalls prior sessions.",
      antigravity: {
        inheritMcp: false,
        mcpServers: [{ name: "recall", command: "node", args: ["${paths.recallScript}"] }],
      },
    }),
  );
  const config = parsePolicyConfig(
    JSON.stringify({
      schemaVersion: 2,
      kind: "agents",
      enabled: true,
      paths: { recallScript: "/opt/recall/index.js" },
      harnesses: {
        pi: { enabled: false },
        codex: { enabled: false },
        antigravity: { enabled: true, home: path.join(root, "gemini") },
      },
    }),
    "linux",
    "agents",
  );
  const statePath = path.join(root, "state.json");
  const sources = await loadCanonicalSources(root, config.resources);
  await synchronize(config, emptyState(), statePath, sources);
  const file = path.join(root, "gemini", "config", "agents", "recall-reviewer.md");
  expect(await fs.readFile(file, "utf8")).toContain("/opt/recall/index.js");

  await fs.rm(directory, { recursive: true, force: true });
  const emptied = await loadCanonicalSources(root, config.resources);
  const removed = await synchronize(
    config,
    await loadState(statePath, undefined, "agents"),
    statePath,
    emptied,
  );
  expect(removed.changed).toEqual(["antigravity-agent-recall-reviewer"]);
  expect(
    removed.backups.some((file) => file.endsWith("antigravity-agent-recall-reviewer.bak")),
  ).toBe(true);
  expect(await fs.exists(file)).toBe(false);
});

test.each([
  [{ name: "UpperCase" }, "kebab-case"],
  [{ name: "snake_case" }, "kebab-case"],
  [{ name: "../escape" }, "kebab-case"],
  [{ model: "gpt-6" }, "model"],
  [{ commandExecutionPolicy: "never" }, "commandExecutionPolicy"],
  [{ mainAgent: "true" }, "boolean"],
  [{ subagent: 1 }, "boolean"],
  [{ inheritMcp: "yes" }, "boolean"],
  [{ inheritCustomizations: null }, "must be an object"],
  [{ tools: "view_file" }, "array of strings"],
  [{ tools: ["read_file"] }, "unknown Antigravity tool"],
  [{ tools: ["view_file", "view_file"] }, "duplicate"],
  [{ skills: [""] }, "empty"],
  [{ plugins: [" "] }, "empty"],
  [{ mcpServers: {} }, "array"],
  [{ mcpServers: ["bad"] }, "object"],
  [{ mcpServers: [{ command: "node" }] }, "kebab-case"],
  [{ mcpServers: [{ name: "Ok_Name" }] }, "kebab-case"],
  [
    { mcpServers: [{ name: "dupe" }, { name: "dupe" }] },
    "duplicates server dupe",
  ],
  [{ mcpServers: [{ name: "both", command: "node", url: "https://x" }] }, "combine command and url"],
  [{ mcpServers: [{ name: "args", command: "node", args: [1] }] }, "array of strings"],
  [{ mcpServers: [{ name: "extra", nope: true }] }, "unsupported"],
  [{ mcpServers: [{ name: "env", command: "node", env: { A: 1 } }] }, "must be a string"],
  [{ unsupportedField: true }, "unsupported"],
])("rejects invalid Antigravity native agent fields %j", async (fields, message) => {
  const f = await fixture();
  await fs.writeFile(
    path.join(f.directory, "agent.json"),
    JSON.stringify({
      description: "Shared",
      antigravity: { ...fields },
    }),
  );
  await expect(loadCanonicalSources(f.root, { instructions: false, agents: true })).rejects.toThrow(
    message,
  );
});

test("rejects duplicate Antigravity agent names and missing composed prompts", async () => {
  const f = await fixture();
  const other = path.join(f.root, "agents", "other-reviewer");
  await fs.mkdir(other, { recursive: true });
  await fs.writeFile(path.join(other, "role.md"), "Other role.\n");
  await fs.writeFile(
    path.join(other, "agent.json"),
    JSON.stringify({
      description: "Other",
      antigravity: { name: "security-reviewer" },
    }),
  );
  await expect(loadCanonicalSources(f.root, { instructions: false, agents: true })).rejects.toThrow(
    "duplicate antigravity agent name: security-reviewer",
  );

  expect(() =>
    renderAntigravityAgent({
      id: "solo",
      description: "Solo",
      role: "Role\n",
      antigravity: {},
      piInstructions: "",
      codexInstructions: "",
    }),
  ).toThrow("antigravityInstructions");
});

test("synchronizes Antigravity agents, isolates domain state, retires removed unchanged roles, and preserves moved or edited files", async () => {
  const f = await fixture();
  const config = parsePolicyConfig(JSON.stringify(f.profile), "linux", "agents");
  const statePath = path.join(f.root, "agents-state.json");
  const sources = await loadCanonicalSources(f.root, config.resources);

  const preview = await synchronize(config, emptyState(), statePath, sources, { dryRun: true });
  expect(preview.actions.map(({ action }) => action)).toEqual(["create", "create"]);
  expect(await fs.exists(path.join(f.root, "gemini-linux"))).toBe(false);

  await synchronize(config, emptyState(), statePath, sources);
  const state = await loadState(statePath, undefined, "agents");
  expect(Object.keys(stateForDomain(state, "agents").targets)).toEqual([
    "antigravity-agent-security-reviewer",
    "antigravity-windows-agent-security-reviewer",
  ]);
  expect(stateForDomain(state, "instructions").targets).toEqual({});

  const linuxFile = path.join(f.root, "gemini-linux", "config", "agents", "security-reviewer.md");
  const windowsFile = path.join(
    f.root,
    "gemini-windows",
    "config",
    "agents",
    "security-reviewer.md",
  );
  const unmanagedFile = path.join(f.root, "gemini-linux", "config", "agents", "local-custom.md");
  await fs.writeFile(unmanagedFile, "Local unmanaged agent.\n");

  // Removing source retires unchanged managed files while leaving unmanaged files untouched.
  await fs.rm(f.directory, { recursive: true, force: true });
  const emptySources = await loadCanonicalSources(f.root, config.resources);

  // Independent edit blocks deletion.
  const originalContent = await fs.readFile(linuxFile, "utf8");
  await fs.writeFile(linuxFile, "Edited locally.\n");
  await expect(synchronize(config, state, statePath, emptySources)).rejects.toThrow(
    "sync preflight failed: antigravity-agent-security-reviewer",
  );
  expect(await fs.exists(windowsFile)).toBe(true);

  // Restore unchanged content, disable windows home -> windows file preserved, linux file retired.
  await fs.writeFile(linuxFile, originalContent);
  config.harnesses.antigravity!.additionalHomes = [];
  const retired = await synchronize(config, state, statePath, emptySources);
  expect(retired.changed).toEqual(["antigravity-agent-security-reviewer"]);
  expect(await fs.exists(linuxFile)).toBe(false);
  expect(await fs.exists(windowsFile)).toBe(true);
  expect(await fs.readFile(unmanagedFile, "utf8")).toBe("Local unmanaged agent.\n");
  expect(
    (await assessTargets(config, await loadState(statePath, undefined, "agents"), emptySources)).every(
      ({ status }) => status === "current",
    ),
  ).toBe(true);
});
