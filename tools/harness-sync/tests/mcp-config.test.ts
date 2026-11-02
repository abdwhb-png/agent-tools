import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emptyState, parsePolicyConfig } from "../src/config.js";
import { loadCanonicalSources } from "../src/sources.js";
import { renderMcpConfig } from "../src/renderers.js";
import { renderTargets } from "../src/targets.js";
import { assessTargets, loadState, synchronize } from "../src/sync.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

const repositoryRoot = path.resolve(import.meta.dir, "..", "..", "..");

test("renders the canonical Antigravity MCP registry deterministically with sorted keys", async () => {
  const rendered = renderMcpConfig(
    {
      mcpServers: {
        exa: { url: "https://mcp.exa.ai/mcp" },
        context7: { url: "https://mcp.context7.com/mcp" },
        firecrawl: { args: ["-y", "firecrawl-mcp"], command: "npx" },
      },
    },
    "antigravity-mcp-config",
  );
  expect(JSON.parse(rendered)).toEqual({
    mcpServers: {
      context7: { url: "https://mcp.context7.com/mcp" },
      exa: { url: "https://mcp.exa.ai/mcp" },
      firecrawl: { args: ["-y", "firecrawl-mcp"], command: "npx" },
    },
  });
  expect(rendered.indexOf('"context7"')).toBeLessThan(rendered.indexOf('"exa"'));
  expect(rendered.endsWith("\n")).toBe(true);
  expect(rendered).toBe(
    renderMcpConfig(
      {
        mcpServers: {
          exa: { url: "https://mcp.exa.ai/mcp" },
          context7: { url: "https://mcp.context7.com/mcp" },
          firecrawl: { args: ["-y", "firecrawl-mcp"], command: "npx" },
        },
      },
      "antigravity-mcp-config",
    ),
  );
});

test.each([
  [{ mcpServers: [] }, "object"],
  [{ mcpServers: { bad: "npx" } }, "server object"],
  [{ mcpServers: { bad: { command: "npx", apiKey: "sk-live" } } }, "secret-like key"],
  [{ mcpServers: { bad: { command: "npx", token: "x" } } }, "secret-like key"],
  [{ mcpServers: { bad: { command: "npx", secret: "x" } } }, "secret-like key"],
  [{ mcpServers: { bad: { command: "npx", password: "x" } } }, "secret-like key"],
])("rejects malformed or secret-bearing MCP registry %j", (value, message) => {
  expect(() => renderMcpConfig(value, "antigravity-mcp-config")).toThrow(message);
});

test("loads the repository MCP registry and rejects malformed JSON in a project", async () => {
  const sources = await loadCanonicalSources(repositoryRoot, {
    instructions: true,
    agents: false,
  });
  const servers = Object.keys(
    (sources.antigravityMcp as { mcpServers: Record<string, unknown> }).mcpServers,
  );
  expect(servers).toEqual(["context7", "deepwiki", "exa", "firecrawl-mcp"]);

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-mcp-"));
  roots.push(root);
  await fs.mkdir(path.join(root, "instructions"));
  for (const name of ["invariant", "preferences", "technology-defaults"]) {
    await fs.writeFile(path.join(root, "instructions", `${name}.md`), `${name}\n`);
  }
  await fs.mkdir(path.join(root, "mcp"));
  await fs.writeFile(path.join(root, "mcp", "antigravity.json"), "{ not json");
  await expect(
    loadCanonicalSources(root, { instructions: true, agents: false }),
  ).rejects.toThrow("mcp/antigravity.json");
});

test("emits one MCP registry target per Antigravity home and round-trips through sync", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-mcp-target-"));
  roots.push(root);
  const linux = path.join(root, "linux");
  const windows = path.join(root, "windows");
  const config = parsePolicyConfig(
    JSON.stringify({
      schemaVersion: 2,
      kind: "instructions",
      enabled: true,
      harnesses: {
        pi: { enabled: false },
        codex: { enabled: false },
        vscode: { enabled: false },
        antigravity: {
          enabled: true,
          home: linux,
          additionalHomes: [{ id: "windows", home: windows }],
        },
      },
    }),
    "linux",
    "instructions",
  );
  const sources = await loadCanonicalSources(repositoryRoot, {
    instructions: true,
    agents: false,
  });
  const targets = renderTargets(config, sources);
  expect(
    targets
      .filter(({ id }) => id.endsWith("-mcp-config"))
      .map(({ id, path: target }) => ({ id, path: target })),
  ).toEqual([
    { id: "antigravity-mcp-config", path: path.join(linux, "config", "mcp_config.json") },
    {
      id: "antigravity-windows-mcp-config",
      path: path.join(windows, "config", "mcp_config.json"),
    },
  ]);

  // An empty unmanaged file conflicts, explicit adoption replaces it with a backup.
  await fs.mkdir(path.join(linux, "config"), { recursive: true });
  await fs.writeFile(path.join(linux, "config", "mcp_config.json"), "");
  const statePath = path.join(root, "state.json");
  await expect(synchronize(config, emptyState(), statePath, sources)).rejects.toThrow(
    "sync preflight failed: antigravity-mcp-config",
  );
  const adopted = await synchronize(config, emptyState(), statePath, sources, {
    adopt: true,
    adoptTargets: new Set(["antigravity-mcp-config"]),
  });
  expect(adopted.changed).toEqual(["antigravity-mcp-config"]);
  expect(adopted.backups).toHaveLength(1);
  expect(
    Object.keys(
      JSON.parse(await fs.readFile(path.join(linux, "config", "mcp_config.json"), "utf8"))
        .mcpServers,
    ),
  ).toEqual(["context7", "deepwiki", "exa", "firecrawl-mcp"]);

  await synchronize(config, await loadState(statePath), statePath, sources);
  const repeated = await synchronize(config, await loadState(statePath), statePath, sources);
  expect(repeated.changed).toEqual([]);
  expect(
    (await assessTargets(config, await loadState(statePath), sources)).every(
      ({ status }) => status === "current",
    ),
  ).toBe(true);
});
