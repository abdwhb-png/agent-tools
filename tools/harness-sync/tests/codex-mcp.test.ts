import { afterEach, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emptyState, parsePolicyConfig } from "../src/config.js";
import { loadCanonicalSources } from "../src/sources.js";
import {
  CODEX_BEGIN,
  CODEX_MCP_BEGIN,
  CODEX_MCP_END,
  managedCodexContent,
  renderCodexBlock,
  renderCodexConfig,
  renderCodexMcpBlock,
} from "../src/renderers.js";
import { assessTargets, loadState, synchronize } from "../src/sync.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

const servers = {
  context7: { url: "https://mcp.context7.com/mcp" },
  "firecrawl-mcp": {
    command: "npx",
    args: ["-y", "firecrawl-mcp"],
    env_vars: ["FIRECRAWL_API_KEY"],
  },
};

function parseToml(content: string): any {
  return JSON.parse(
    execFileSync(
      "python3",
      ["-c", "import tomllib,json,sys;print(json.dumps(tomllib.loads(sys.stdin.read())))"],
      { input: content, encoding: "utf8" },
    ),
  );
}

test("renders deterministic Codex MCP tables sorted by server and field", () => {
  const block = renderCodexMcpBlock({
    b: { url: "https://b.example/mcp" },
    a: { command: "npx", args: ["-y", "server"], env_vars: ["TOKEN"] },
  });
  expect(block).toBe(
    `${CODEX_MCP_BEGIN}\n` +
      `[mcp_servers.a]\nargs = ["-y", "server"]\ncommand = "npx"\nenv_vars = ["TOKEN"]\n\n` +
      `[mcp_servers.b]\nurl = "https://b.example/mcp"\n` +
      `${CODEX_MCP_END}\n`,
  );
  expect(parseToml(block)).toEqual({
    mcp_servers: {
      a: { args: ["-y", "server"], command: "npx", env_vars: ["TOKEN"] },
      b: { url: "https://b.example/mcp" },
    },
  });
});

test("rejects malformed, incomplete, and secret-bearing Codex MCP entries", () => {
  expect(() => renderCodexMcpBlock({ bad: { args: ["x"] } })).toThrow(
    "requires command or url",
  );
  expect(() =>
    renderCodexMcpBlock({ bad: { command: "npx", url: "https://example.com/mcp" } }),
  ).toThrow("cannot combine");
  expect(() =>
    renderCodexMcpBlock({
      bad: {
        url: "https://example.com/mcp",
        env: { apiKey: "literal" },
      },
    }),
  ).toThrow("secret-like key");
  expect(() =>
    renderCodexMcpBlock({
      bad: { command: "npx", args: ["x"], startup_timeout_sec: -1 },
    }),
  ).toThrow("nonnegative");
});

test("creates both managed Codex regions and keeps a composite ownership value", () => {
  const rendered = renderCodexConfig(undefined, "Test instructions\n", false, servers);
  expect(rendered.desired).toContain(CODEX_BEGIN);
  expect(rendered.desired).toContain(CODEX_MCP_BEGIN);
  expect(rendered.owned).toBe(managedCodexContent(rendered.desired));
  const parsed = parseToml(rendered.desired);
  expect(parsed.developer_instructions).toContain("Test instructions");
  expect(parsed.mcp_servers).toEqual(servers);
});

test("appends the MCP region to a developer_instructions-only configuration", () => {
  const existing = renderCodexBlock("Old instructions\n");
  const rendered = renderCodexConfig(existing, "New instructions\n", false, servers);
  expect(rendered.unmanaged).toBeUndefined();
  expect(rendered.desired).toContain("New instructions");
  expect(rendered.desired).toContain(CODEX_MCP_BEGIN);
  expect(parseToml(rendered.desired).mcp_servers).toEqual(servers);
  expect(managedCodexContent(existing)).toBe(existing);
});

test("preserves unrelated global MCP tables outside the managed region", () => {
  const existing = `${renderCodexBlock("Instructions\n")}\n[mcp_servers.local]\nurl = "https://local.example/mcp"\n`;
  const rendered = renderCodexConfig(existing, "Instructions\n", false, servers);
  expect(rendered.unmanaged).toBeUndefined();
  const parsed = parseToml(rendered.desired);
  expect(parsed.mcp_servers.local).toEqual({ url: "https://local.example/mcp" });
  expect(parsed.mcp_servers.context7).toEqual(servers.context7);
  expect(rendered.desired.indexOf("[mcp_servers.local]")).toBeLessThan(
    rendered.desired.indexOf(CODEX_MCP_BEGIN),
  );
});

test("requires adoption before replacing a canonical-name table outside the managed region", () => {
  const existing = `${renderCodexBlock("Instructions\n")}\n[mcp_servers.context7]\nurl = "https://old.example/mcp"\n\n[mcp_servers.local]\nurl = "https://local.example/mcp"\n`;
  expect(() =>
    renderCodexConfig(existing, "Instructions\n", false, servers),
  ).toThrow("unmanaged canonical-name");
  const adopted = renderCodexConfig(existing, "Instructions\n", true, servers);
  expect(adopted.unmanaged).toBe(true);
  expect(adopted.desired).not.toContain("https://old.example/mcp");
  const parsed = parseToml(adopted.desired);
  expect(parsed.mcp_servers.context7).toEqual(servers.context7);
  expect(parsed.mcp_servers.local).toEqual({ url: "https://local.example/mcp" });
});

test("replaces only the managed MCP region", () => {
  const initial = renderCodexConfig(undefined, "Instructions\n", false, servers).desired;
  const changed = initial.replace("https://mcp.context7.com/mcp", "https://old.example/mcp");
  const rendered = renderCodexConfig(changed, "Instructions\n", false, {
    ...servers,
    context7: { url: "https://new.example/mcp" },
  });
  expect(rendered.unmanaged).toBeUndefined();
  expect(rendered.desired).toContain("https://new.example/mcp");
  expect(rendered.desired).not.toContain("https://old.example/mcp");
  expect(parseToml(rendered.desired).mcp_servers.context7).toEqual({
    url: "https://new.example/mcp",
  });
});

test("preserves an existing managed MCP region when the canonical source disappears", () => {
  const withMcp = renderCodexConfig(undefined, "Instructions\n", false, servers).desired;
  const preserved = renderCodexConfig(withMcp, "Instructions\n", false);
  expect(preserved.desired).toBe(withMcp);
  expect(preserved.owned).toBe(managedCodexContent(withMcp));
});

test("rejects malformed managed MCP markers", () => {
  const existing = `${renderCodexBlock("Instructions\n")}\n${CODEX_MCP_BEGIN}\n[mcp_servers.context7]\nurl = "https://mcp.context7.com/mcp"\n`;
  expect(() => renderCodexConfig(existing, "Instructions\n", false, servers)).toThrow(
    "malformed",
  );
});

test("keeps an unmanaged table before the managed MCP region out of the managed span", () => {
  const initial = renderCodexConfig(undefined, "Instructions\n", false, servers).desired;
  const existing = initial.replace(
    CODEX_MCP_BEGIN,
    `[mcp_servers.local]\nurl = "https://local.example/mcp"\n\n${CODEX_MCP_BEGIN}`,
  );
  const rendered = renderCodexConfig(existing, "Instructions\n", false, servers);
  expect(rendered.unmanaged).toBeUndefined();
  const parsed = parseToml(rendered.desired);
  expect(parsed.mcp_servers.local).toEqual({ url: "https://local.example/mcp" });
  expect(parsed.mcp_servers.context7).toEqual(servers.context7);
});

test("places developer_instructions before the first table when the file has none", () => {
  const existing = 'model = "x"\n\n[profiles.fast]\nmodel = "y"\n';
  const rendered = renderCodexConfig(existing, "Instructions\n", false, servers);
  const parsed = parseToml(rendered.desired);
  expect(parsed.developer_instructions).toContain("Instructions");
  expect(parsed.profiles.fast).toEqual({ model: "y" });
  expect(rendered.desired.indexOf(CODEX_BEGIN)).toBeLessThan(
    rendered.desired.indexOf("[profiles.fast]"),
  );
});

test("ignores a multiline delimiter that only appears inside a comment", () => {
  const existing = `# note about """ quoting\n[mcp_servers.context7]\nurl = "https://old.example/mcp"\n`;
  expect(() => renderCodexConfig(existing, "Instructions\n", false, servers)).toThrow(
    "unmanaged canonical-name",
  );
  const adopted = renderCodexConfig(existing, "Instructions\n", true, servers);
  expect(parseToml(adopted.desired).mcp_servers.context7).toEqual(servers.context7);
});

test("reports no managed content without developer_instructions", () => {
  expect(managedCodexContent('model = "x"\n')).toBeUndefined();
});

test("rejects literal secrets under broader key names but allows env references", () => {
  for (const key of ["authorization", "X-Api-Key", "client_secret", "access_token"])
    expect(() =>
      renderCodexMcpBlock({
        bad: { url: "https://example.com/mcp", http_headers: { [key]: "literal" } },
      }),
    ).toThrow("secret-like key");
  expect(() =>
    renderCodexMcpBlock({
      ok: {
        url: "https://example.com/mcp",
        bearer_token_env_var: "EXAMPLE_TOKEN",
        http_headers: { Authorization: "${EXAMPLE_TOKEN}" },
      },
    }),
  ).not.toThrow();
});

test("rejects unsafe or empty Codex MCP server names", () => {
  for (const name of ["", "a b", "x]\n[evil", ".hidden"])
    expect(() => renderCodexMcpBlock({ [name]: { url: "https://example.com/mcp" } })).toThrow();
});

test("loads the repository Codex MCP registry", async () => {
  const repositoryRoot = path.resolve(import.meta.dir, "..", "..", "..");
  const sources = await loadCanonicalSources(repositoryRoot, {
    instructions: true,
    agents: false,
  });
  const registered = (sources.codexMcp as {
    mcp_servers: Record<string, unknown>;
  }).mcp_servers;
  expect(Object.keys(registered)).toEqual([
    "context7",
    "deepwiki",
    "exa",
    "firecrawl-mcp",
  ]);
  expect(registered["firecrawl-mcp"]).toEqual({
    url: "https://mcp.firecrawl.dev/v2/mcp-oauth",
    auth: "oauth",
  });
});

async function fixture(withMcp: boolean) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "harness-sync-codex-mcp-"));
  roots.push(root);
  const instructions = path.join(root, "instructions");
  await fs.mkdir(instructions);
  for (const name of ["invariant", "preferences", "technology-defaults"])
    await fs.writeFile(path.join(instructions, `${name}.md`), `${name}\n`);
  if (withMcp) {
    await fs.mkdir(path.join(root, "mcp"));
    await fs.writeFile(
      path.join(root, "mcp", "codex.json"),
      JSON.stringify({ mcp_servers: servers }),
    );
  }
  const home = path.join(root, "codex");
  const config = parsePolicyConfig(
    JSON.stringify({
      schemaVersion: 2,
      kind: "instructions",
      enabled: true,
      harnesses: {
        pi: { enabled: false },
        codex: { enabled: true, home },
        vscode: { enabled: false },
      },
    }),
    "linux",
    "instructions",
  );
  return { root, home, config, statePath: path.join(root, "state.json") };
}

test("upgrades developer_instructions-only ownership to the composite MCP region", async () => {
  const f = await fixture(false);
  const initialSources = await loadCanonicalSources(f.root, f.config.resources);
  await synchronize(f.config, emptyState(), f.statePath, initialSources);
  const state = await loadState(f.statePath, undefined, "instructions");
  const configPath = path.join(f.home, "config.toml");
  expect(await fs.readFile(configPath, "utf8")).not.toContain(CODEX_MCP_BEGIN);

  await fs.mkdir(path.join(f.root, "mcp"));
  await fs.writeFile(
    path.join(f.root, "mcp", "codex.json"),
    JSON.stringify({ mcp_servers: servers }),
  );
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const assessed = await assessTargets(f.config, state, sources);
  expect(assessed.find(({ target }) => target.id === "codex-config")?.status).toBe("stale");

  await synchronize(f.config, state, f.statePath, sources);
  const updated = parseToml(await fs.readFile(configPath, "utf8"));
  expect(updated.mcp_servers).toEqual(servers);
  expect(
    (await assessTargets(
      f.config,
      await loadState(f.statePath, undefined, "instructions"),
      sources,
    )).every(({ status }) => status === "current"),
  ).toBe(true);
});

test("conflicts on independent MCP edits, adopts, and updates stale canonical content", async () => {
  const f = await fixture(true);
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  await synchronize(f.config, emptyState(), f.statePath, sources);
  const configPath = path.join(f.home, "config.toml");
  const initial = await fs.readFile(configPath, "utf8");
  await fs.writeFile(
    configPath,
    initial.replace("https://mcp.context7.com/mcp", "https://evil.example/mcp"),
  );

  const conflicted = await assessTargets(
    f.config,
    await loadState(f.statePath, undefined, "instructions"),
    sources,
  );
  expect(conflicted.find(({ target }) => target.id === "codex-config")?.status).toBe("conflict");
  await expect(
    synchronize(
      f.config,
      await loadState(f.statePath, undefined, "instructions"),
      f.statePath,
      sources,
    ),
  ).rejects.toThrow("sync preflight failed: codex-config");

  const adopted = await synchronize(
    f.config,
    await loadState(f.statePath, undefined, "instructions"),
    f.statePath,
    sources,
    { adopt: true, adoptTargets: new Set(["codex-config"]) },
  );
  expect(adopted.changed).toEqual(["codex-config"]);
  expect(adopted.backups.length).toBeGreaterThan(0);
  expect(await fs.readFile(configPath, "utf8")).toContain("https://mcp.context7.com/mcp");

  await fs.writeFile(
    path.join(f.root, "mcp", "codex.json"),
    JSON.stringify({
      mcp_servers: {
        ...servers,
        extra: { url: "https://extra.example/mcp" },
      },
    }),
  );
  const changedSources = await loadCanonicalSources(f.root, f.config.resources);
  const stale = await assessTargets(
    f.config,
    await loadState(f.statePath, undefined, "instructions"),
    changedSources,
  );
  expect(stale.find(({ target }) => target.id === "codex-config")?.status).toBe("stale");
  const updated = await synchronize(
    f.config,
    await loadState(f.statePath, undefined, "instructions"),
    f.statePath,
    changedSources,
  );
  expect(updated.changed).toEqual(["codex-config"]);
  expect(parseToml(await fs.readFile(configPath, "utf8")).mcp_servers.extra).toEqual({
    url: "https://extra.example/mcp",
  });
});

test("blocks an unmanaged canonical-name table until targeted adoption", async () => {
  const f = await fixture(true);
  await fs.mkdir(f.home, { recursive: true });
  const configPath = path.join(f.home, "config.toml");
  await fs.writeFile(
    configPath,
    `${renderCodexBlock("Instructions\n")}\n[mcp_servers.context7]\nurl = "https://old.example/mcp"\n\n[mcp_servers.local]\nurl = "https://local.example/mcp"\n`,
  );
  const sources = await loadCanonicalSources(f.root, f.config.resources);
  const assessed = await assessTargets(f.config, emptyState(), sources);
  expect(assessed.find(({ target }) => target.id === "codex-config")?.status).toBe("conflict");
  await expect(
    synchronize(f.config, emptyState(), f.statePath, sources),
  ).rejects.toThrow("sync preflight failed: codex-config");

  const adopted = await synchronize(
    f.config,
    emptyState(),
    f.statePath,
    sources,
    { adopt: true, adoptTargets: new Set(["codex-config"]) },
  );
  expect(adopted.backups.length).toBeGreaterThan(0);
  const parsed = parseToml(await fs.readFile(configPath, "utf8"));
  expect(parsed.mcp_servers.context7).toEqual(servers.context7);
  expect(parsed.mcp_servers.local).toEqual({ url: "https://local.example/mcp" });
  expect(await fs.readFile(configPath, "utf8")).not.toContain("https://old.example/mcp");
});
