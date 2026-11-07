import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emptyState, parsePolicyConfig } from "../src/config.js";
import { loadCanonicalSources } from "../src/sources.js";
import { agentDirectories, renderTargets } from "../src/targets.js";
import { assessTargets, loadState, synchronize } from "../src/sync.js";
import { renderOpenCodeAgent } from "../src/agents.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

const readOnlyRoles = new Set([
  "api-reviewer",
  "architect",
  "browser-tester",
  "code-reviewer",
  "factual-researcher",
  "librarian",
  "oracle",
  "performance-reviewer",
  "pi-expert",
  "qa-tester",
  "quick-reviewer",
  "scout",
  "security-reviewer",
  "style-reviewer",
]);

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-opencode-"));
  roots.push(root);
  const directory = path.join(root, "agents", "reviewer");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "role.md"), "Review the requested change.\n");
  await fs.writeFile(
    path.join(directory, "agent.json"),
    JSON.stringify({
      description: 'Reviews "quoted" paths and C:\\source',
      opencode: {
        mode: "subagent",
        model: "anthropic/claude-sonnet-5-5#high",
        permissions: [{ action: "edit", resource: "*", effect: "deny" }],
        steps: 8,
        hidden: false,
        color: "#ff6b6b",
      },
    }),
  );
  const config = parsePolicyConfig(
    JSON.stringify({
      schemaVersion: 2,
      kind: "agents",
      enabled: true,
      harnesses: {
        pi: { enabled: false },
        codex: { enabled: false },
        opencode: {
          enabled: true,
          home: path.join(root, "opencode"),
          additionalHomes: [{ id: "windows", home: path.join(root, "opencode-windows") }],
        },
      },
    }),
    "linux",
    "agents",
  );
  return { root, directory, config };
}

test("renders OpenCode agents across homes with defaults, YAML frontmatter, and composed prompts", async () => {
  const f = await fixture();
  await fs.writeFile(path.join(f.root, "agents", "opencode.md"), "Shared OpenCode rules.\r\n");
  await fs.writeFile(path.join(f.directory, "opencode.md"), "Use native OpenCode tools.\n");

  expect(agentDirectories(f.config)).toEqual([
    {
      id: "opencode",
      directory: path.join(f.root, "opencode", "agents"),
      extension: ".md",
    },
    {
      id: "opencode-windows",
      directory: path.join(f.root, "opencode-windows", "agents"),
      extension: ".md",
    },
  ]);

  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const targets = renderTargets(f.config, sources);
  expect(targets.map(({ id, path }) => ({ id, path }))).toEqual([
    {
      id: "opencode-agent-reviewer",
      path: path.join(f.root, "opencode", "agents", "reviewer.md"),
    },
    {
      id: "opencode-windows-agent-reviewer",
      path: path.join(f.root, "opencode-windows", "agents", "reviewer.md"),
    },
  ]);
  expect(targets[0].desired).toBe(targets[1].desired);
  expect(Bun.YAML.parse(targets[0].desired.split("---\n")[1])).toEqual({
    color: "#ff6b6b",
    description: 'Reviews "quoted" paths and C:\\source',
    hidden: false,
    mode: "subagent",
    model: "anthropic/claude-sonnet-5-5#high",
    permissions: [{ action: "edit", resource: "*", effect: "deny" }],
    steps: 8,
  });
  expect(targets[0].desired.split("---\n")[2]).toBe(
    "\nShared OpenCode rules.\n\nReview the requested change.\n\nUse native OpenCode tools.\n",
  );
});

test("defaults an OpenCode profile to a subagent with the shared description", async () => {
  const f = await fixture();
  await fs.writeFile(
    path.join(f.directory, "agent.json"),
    JSON.stringify({
      description: "Read-only review.",
      opencode: {},
    }),
  );
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const rendered = renderOpenCodeAgent(sources.agents![0]);
  expect(Bun.YAML.parse(rendered.split("---\n")[1])).toEqual({
    description: "Read-only review.",
    mode: "subagent",
  });
});

test("rejects unsupported OpenCode native fields and unrepresentable values", async () => {
  const f = await fixture();
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ mode: "invalid" }, "mode"],
    [{ model: "missing-provider" }, "provider/model"],
    [{ permissions: [{ action: "edit", resource: "*", effect: "maybe" }] }, "effect"],
    [{ permissions: [{ action: "edit" }] }, "resource"],
    [{ steps: 0 }, "steps"],
    [{ hidden: "true" }, "hidden"],
    [{ color: "red" }, "color"],
    [{ prompt: "legacy" }, "unsupported"],
    [{ permission: {} }, "unsupported"],
    [{ tools: [] }, "unsupported"],
    [{ system: "legacy" }, "unsupported"],
    [{ disable: true }, "unsupported"],
    [{ maxSteps: 4 }, "unsupported"],
  ];
  for (const [opencode, message] of cases) {
    await fs.writeFile(
      path.join(f.directory, "agent.json"),
      JSON.stringify({ description: "Review.", opencode }),
    );
    await expect(loadCanonicalSources(f.root, f.config.resources)).rejects.toThrow(message);
  }
});

test("removes OpenCode agent files only after their source and ownership remain unchanged", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  await synchronize(f.config, emptyState(), statePath, sources);
  const primary = path.join(f.root, "opencode", "agents", "reviewer.md");
  const windows = path.join(f.root, "opencode-windows", "agents", "reviewer.md");
  expect(await fs.readFile(primary, "utf8")).toContain("Review the requested change.");

  await fs.rm(f.directory, { recursive: true, force: true });
  const emptied = await loadCanonicalSources(f.root, f.config.resources);
  const removed = await synchronize(
    f.config,
    await loadState(statePath, undefined, "agents"),
    statePath,
    emptied,
  );
  expect(removed.changed).toEqual([
    "opencode-agent-reviewer",
    "opencode-windows-agent-reviewer",
  ]);
  expect(removed.backups.length).toBeGreaterThan(0);
  expect(await fs.exists(primary)).toBe(false);
  expect(await fs.exists(windows)).toBe(false);
  expect((await assessTargets(f.config, await loadState(statePath, undefined, "agents"), emptied))
    .every(({ status }) => status === "current")).toBe(true);
});

test("every catalog role renders a valid OpenCode profile without V1 fields", async () => {
  const repositoryRoot = path.resolve(import.meta.dir, "..", "..", "..");
  const sources = await loadCanonicalSources(repositoryRoot, {
    instructions: false,
    agents: true,
  });
  expect(sources.agents?.length).toBeGreaterThan(0);
  expect(sources.agents!.map(({ id }) => id)).not.toContain("pi-expert");
  for (const agent of sources.agents!) {
    expect(agent.opencode).toBeDefined();
    const rendered = renderOpenCodeAgent(agent);
    const frontmatter = Bun.YAML.parse(rendered.split("---\n")[1]);
    expect(frontmatter.description).toBe(agent.description);
    expect(frontmatter.mode).toBe("subagent");
    expect(frontmatter.name).toBeUndefined();
    expect(frontmatter.prompt).toBeUndefined();
    expect(frontmatter.tools).toBeUndefined();
    expect(frontmatter.permission).toBeUndefined();
    if (readOnlyRoles.has(agent.id)) {
      expect(frontmatter.permissions).toContainEqual({
        action: "edit",
        resource: "*",
        effect: "deny",
      });
    } else {
      expect(frontmatter.permissions).toBeUndefined();
    }
    expect(rendered).toContain(agent.role.trim());
  }
});
