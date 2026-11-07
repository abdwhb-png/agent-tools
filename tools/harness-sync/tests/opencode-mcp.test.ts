import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emptyState, parsePolicyConfig } from "../src/config.js";
import { loadCanonicalSources } from "../src/sources.js";
import { renderTargets } from "../src/targets.js";
import { assessTargets, loadState, synchronize } from "../src/sync.js";
import {
  OPENCODE_MCP_BEGIN,
  OPENCODE_MCP_END,
  managedOpenCodeBlock,
  parseJsonc,
  parseOpenCodeMcp,
} from "../src/opencode.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

const servers = {
  context7: { type: "remote", url: "https://mcp.context7.com/mcp" },
  "firecrawl-mcp": {
    type: "local",
    command: ["npx", "-y", "firecrawl-mcp"],
    environment: { FIRECRAWL_API_KEY: "{env:FIRECRAWL_API_KEY}" },
  },
};

async function fixture(initialServers: Record<string, unknown> = servers) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-opencode-mcp-"));
  roots.push(root);
  const instructions = path.join(root, "instructions");
  await fs.mkdir(instructions);
  await fs.writeFile(path.join(instructions, "invariant.md"), "Invariant\n");
  await fs.writeFile(path.join(instructions, "preferences.md"), "Preference\n");
  await fs.writeFile(path.join(instructions, "technology-defaults.md"), "Technology\n");
  await fs.mkdir(path.join(root, "mcp"));
  await fs.writeFile(
    path.join(root, "mcp", "opencode.json"),
    JSON.stringify({ mcp: { servers: initialServers } }),
  );
  const home = path.join(root, "opencode");
  const config = parsePolicyConfig(
    JSON.stringify({
      schemaVersion: 2,
      kind: "instructions",
      enabled: true,
      harnesses: {
        pi: { enabled: false },
        codex: { enabled: false },
        vscode: { enabled: false },
        opencode: { enabled: true, home },
      },
    }),
    "linux",
    "instructions",
  );
  return { root, home, config };
}

test("creates global AGENTS.md and a marked OpenCode MCP configuration", async () => {
  const f = await fixture();
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const targets = renderTargets(f.config, sources);
  expect(targets.map(({ id, path }) => ({ id, path }))).toEqual([
    {
      id: "opencode-agents",
      path: path.join(f.home, "AGENTS.md"),
    },
    {
      id: "opencode-mcp-config",
      path: path.join(f.home, "opencode.jsonc"),
    },
  ]);
  expect(targets[0].desired).toBe("Invariant\n\nPreference\n\nTechnology\n");
  const mcp = targets[1];
  expect(mcp.desired).toContain(OPENCODE_MCP_BEGIN);
  expect(mcp.desired).toContain(OPENCODE_MCP_END);
  expect(Bun.JSONC.parse(mcp.desired)).toEqual({
    $schema: "https://opencode.ai/config.json",
    mcp: { servers },
  });
  expect(managedOpenCodeBlock(mcp.desired, true)).toBe(mcp.owned);
});

test("replaces only the marked region and preserves unrelated JSONC settings and comments", async () => {
  const f = await fixture();
  const existing = `{
  // keep this comment
  "model": "anthropic/claude-sonnet-5-5",
  "mcp": {
    ${OPENCODE_MCP_BEGIN}
    "servers": {
      "old": { "type": "remote", "url": "https://old.example/mcp" }
    }
    ${OPENCODE_MCP_END}
  }
}
`;
  const configPath = path.join(f.home, "opencode.jsonc");
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const targets = renderTargets(f.config, sources, {}, false, {
    opencode: { path: configPath, content: existing, jsonc: true },
  });
  const target = targets.find(({ id }) => id === "opencode-mcp-config")!;
  expect(target.path).toBe(configPath);
  expect(target.desired).toContain("// keep this comment");
  expect(target.desired).toContain('"model": "anthropic/claude-sonnet-5-5"');
  expect(target.desired).not.toContain("https://old.example/mcp");
  expect(Bun.JSONC.parse(target.desired)).toEqual({
    model: "anthropic/claude-sonnet-5-5",
    mcp: { servers },
  });
  expect(managedOpenCodeBlock(target.desired, true)).toBe(target.owned);
});

test("requires explicit adoption for an unmanaged JSONC mcp.servers object", async () => {
  const f = await fixture();
  const existing = `{
  "model": "anthropic/claude-sonnet-5-5",
  "mcp": { "servers": { "old": { "type": "remote", "url": "https://old.example/mcp" } } }
}
`;
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const configPath = path.join(f.home, "opencode.jsonc");
  expect(() =>
    renderTargets(f.config, sources, {}, false, {
      opencode: { path: configPath, content: existing, jsonc: true },
    }),
  ).toThrow("unmanaged");

  const admitted = renderTargets(f.config, sources, {}, true, {
    opencode: { path: configPath, content: existing, jsonc: true },
  });
  const target = admitted.find(({ id }) => id === "opencode-mcp-config")!;
  expect(Bun.JSONC.parse(target.desired)).toEqual({
    model: "anthropic/claude-sonnet-5-5",
    mcp: { servers },
  });
  expect(target.desired).toContain(OPENCODE_MCP_BEGIN);
});

test("adopting mcp.servers preserves sibling mcp settings and JSONC commas", async () => {
  const f = await fixture();
  const existing = `{
  "mcp": {
    "servers": { "old": { "type": "remote", "url": "https://old.example/mcp" } },
    "timeout": { "catalog": 1000 }
  }
}
`;
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const configPath = path.join(f.home, "opencode.jsonc");
  const targets = renderTargets(f.config, sources, {}, true, {
    opencode: { path: configPath, content: existing, jsonc: true },
  });
  const target = targets.find(({ id }) => id === "opencode-mcp-config")!;
  expect(Bun.JSONC.parse(target.desired)).toEqual({
    mcp: { servers, timeout: { catalog: 1000 } },
  });
  expect(target.desired).toContain('"servers": {');
  expect(target.desired).toContain('"timeout": {');
  expect(target.desired).toContain('"catalog": 1000');
});

test("manages mcp.servers in a plain opencode.json without comment markers", async () => {
  const f = await fixture();
  const existing = JSON.stringify(
    {
      model: "anthropic/claude-sonnet-5-5",
      mcp: { servers: { old: { type: "remote", url: "https://old.example/mcp" } } },
    },
    null,
    2,
  );
  const configPath = path.join(f.home, "opencode.json");
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const targets = renderTargets(f.config, sources, {}, true, {
    opencode: { path: configPath, content: existing, jsonc: false },
  });
  const target = targets.find(({ id }) => id === "opencode-mcp-config")!;
  expect(JSON.parse(target.desired)).toEqual({
    model: "anthropic/claude-sonnet-5-5",
    mcp: { servers },
  });
  expect(target.owned).toBe(`${JSON.stringify(servers, null, 2)}\n`);
  expect(target.desired).not.toContain(OPENCODE_MCP_BEGIN);
});

test("fails when both opencode.json and opencode.jsonc exist", async () => {
  const f = await fixture();
  await fs.mkdir(f.home, { recursive: true });
  await fs.writeFile(path.join(f.home, "opencode.json"), "{}\n");
  await fs.writeFile(path.join(f.home, "opencode.jsonc"), "{}\n");
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  await expect(assessTargets(f.config, emptyState(), sources)).rejects.toThrow(
    "both opencode.json and opencode.jsonc",
  );
});

test("syncs, conflicts on independent MCP edits, adopts, and updates stale canonical content", async () => {
  const f = await fixture();
  const statePath = path.join(f.root, "state.json");
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  await synchronize(f.config, emptyState(), statePath, sources);
  const configPath = path.join(f.home, "opencode.jsonc");
  const initial = await fs.readFile(configPath, "utf8");
  expect(
    (await assessTargets(f.config, await loadState(statePath, undefined, "instructions"), sources))
      .every(({ status }) => status === "current"),
  ).toBe(true);

  await fs.writeFile(
    configPath,
    initial.replace("https://mcp.context7.com/mcp", "https://evil.example/mcp"),
  );
  const conflict = await assessTargets(
    f.config,
    await loadState(statePath, undefined, "instructions"),
    sources,
  );
  expect(conflict.find(({ target }) => target.id === "opencode-mcp-config")?.status).toBe(
    "conflict",
  );
  await expect(
    synchronize(f.config, await loadState(statePath, undefined, "instructions"), statePath, sources),
  ).rejects.toThrow("sync preflight failed");

  const adopted = await synchronize(
    f.config,
    await loadState(statePath, undefined, "instructions"),
    statePath,
    sources,
    { adopt: true, adoptTargets: new Set(["opencode-mcp-config"]) },
  );
  expect(adopted.changed).toEqual(["opencode-mcp-config"]);
  expect(adopted.backups.length).toBeGreaterThan(0);
  expect(await fs.readFile(configPath, "utf8")).toContain("https://mcp.context7.com/mcp");

  await fs.writeFile(
    path.join(f.root, "mcp", "opencode.json"),
    JSON.stringify({
      mcp: {
        servers: {
          ...servers,
          extra: { type: "remote", url: "https://extra.example/mcp" },
        },
      },
    }),
  );
  const changedSources = await loadCanonicalSources(f.root, f.config.resources);
  const stale = await assessTargets(
    f.config,
    await loadState(statePath, undefined, "instructions"),
    changedSources,
  );
  expect(stale.find(({ target }) => target.id === "opencode-mcp-config")?.status).toBe("stale");
  const updated = await synchronize(
    f.config,
    await loadState(statePath, undefined, "instructions"),
    statePath,
    changedSources,
  );
  expect(updated.changed).toEqual(["opencode-mcp-config"]);
  expect(await fs.readFile(configPath, "utf8")).toContain("https://extra.example/mcp");
  expect(
    (await assessTargets(
      f.config,
      await loadState(statePath, undefined, "instructions"),
      changedSources,
    )).every(({ status }) => status === "current"),
  ).toBe(true);
});

test("rejects malformed and secret-bearing OpenCode MCP definitions", () => {
  const cases: Array<[unknown, string]> = [
    [{ mcp: { servers: [] } }, "must be an object"],
    [{ mcp: { servers: { bad: { url: "https://example.com/mcp" } } } }, "type is required"],
    [{ mcp: { servers: { bad: { type: "remote", url: "relative" } } } }, "absolute HTTP"],
    [{ mcp: { servers: { bad: { type: "local", command: [] } } } }, "command"],
    [
      {
        mcp: {
          servers: {
            bad: {
              type: "local",
              command: ["npx", "server"],
              environment: { API_KEY: "literal" },
            },
          },
        },
      },
      "{env:NAME}",
    ],
    [
      {
        mcp: {
          servers: {
            bad: {
              type: "remote",
              url: "https://example.com/mcp",
              headers: { Authorization: "Bearer literal" },
            },
          },
        },
      },
      "{env:NAME}",
    ],
    [
      {
        mcp: {
          servers: {
            bad: { type: "remote", url: "https://example.com/mcp", enabled: true },
          },
        },
      },
      "unsupported",
    ],
    [
      {
        mcp: {
          servers: {
            bad: { type: "remote", url: "https://example.com/mcp", timeout: { catalog: 0 } },
          },
        },
      },
      "positive integer",
    ],
  ];
  for (const [value, message] of cases)
    expect(() => parseOpenCodeMcp(value)).toThrow(message);
});

test("parses JSONC comments, strings, and trailing commas without corrupting values", () => {
  expect(
    parseJsonc(`{
      // comment
      "url": "https://example.com/a//b",
      /* block */
      "items": [1, 2,],
    }`),
  ).toEqual({ url: "https://example.com/a//b", items: [1, 2] });
});

test("agent-sync does not load or render OpenCode MCP configuration", async () => {
  const f = await fixture();
  const sources = await loadCanonicalSources(f.root, {
    instructions: false,
    agents: true,
  });
  expect(sources.opencodeMcp).toBeUndefined();
});
