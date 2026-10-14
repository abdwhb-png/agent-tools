import { expect, test } from "bun:test";
import {
  defaultConfigPath,
  defaultPolicyConfig,
  defaultStatePath,
  parsePolicyConfig,
  profileConfig,
} from "../src/config.js";

test("native agent profiles enforce their domain and exclude instruction destinations", () => {
  const profile = {
    schemaVersion: 2,
    kind: "agents",
    enabled: true,
    harnesses: {
      pi: { enabled: true, agentDir: "/pi/agent" },
      codex: { enabled: true, home: "/codex" },
    },
  };
  const parsed = parsePolicyConfig(JSON.stringify(profile), "linux", "agents");
  expect(parsed.resources).toEqual({ instructions: false, agents: true });
  expect(parsed.harnesses.vscode).toEqual({ enabled: false });
  expect(() => parsePolicyConfig(JSON.stringify(profile), "linux", "instructions")).toThrow(
    "belongs to agents",
  );
  expect(() =>
    parsePolicyConfig(
      JSON.stringify({
        ...profile,
        harnesses: { ...profile.harnesses, vscode: { enabled: false, targets: ["/instructions.md"] } },
      }),
      "linux",
      "agents",
    ),
  ).toThrow("unsupported key: targets");
});

test("agent path bindings round-trip without leaking into instruction settings", () => {
  const profile = {
    schemaVersion: 2,
    kind: "agents",
    enabled: true,
    paths: { serverScript: "/install/server.js" },
    harnesses: { pi: { enabled: false }, codex: { enabled: false } },
  };
  const parsed = parsePolicyConfig(JSON.stringify(profile), "linux", "agents");
  expect(profileConfig(parsed, "agents")).toEqual(profile);
  expect(profileConfig(parsed, "instructions").paths).toBeUndefined();
  expect(() =>
    parsePolicyConfig(
      JSON.stringify({ ...profile, kind: "instructions" }),
      "linux",
      "instructions",
    ),
  ).toThrow("unsupported key: paths");
  const windows = { ...profile, paths: { serverScript: "C:\\Program Files\\Docs\\server.js" } };
  expect(parsePolicyConfig(JSON.stringify(windows), "win32", "agents").paths).toEqual(
    windows.paths,
  );
});

test.each([
  [[], "object"],
  [{ serverScript: 1 }, "path string"],
  [{ "bad.name": "/install/server.js" }, "valid name"],
  [{ serverScript: "relative/server.js" }, "absolute path"],
  [{ serverScript: "/install/${paths.other}" }, "literal"],
  [{ serverScript: "/install/server\u0000.js" }, "literal"],
  [{ serverScript: "/install/server\ud800.js" }, "Unicode"],
])("rejects malformed agent path bindings %j", (paths, message) => {
  const profile = {
    schemaVersion: 2,
    kind: "agents",
    enabled: true,
    paths,
    harnesses: { pi: { enabled: false }, codex: { enabled: false } },
  };
  expect(() => parsePolicyConfig(JSON.stringify(profile), "linux", "agents")).toThrow(message);
});

test("accepts explicit agent synchronization without enabling it in legacy configurations", () => {
  const legacy = defaultPolicyConfig({ home: "/home/agent", platform: "linux", env: {} });
  expect(parsePolicyConfig(JSON.stringify(legacy)).resources?.agents).not.toBe(true);
  const enabled = { ...legacy, resources: { instructions: true, agents: true } };
  expect(parsePolicyConfig(JSON.stringify(enabled)).resources).toEqual(enabled.resources);
  expect(() =>
    parsePolicyConfig(JSON.stringify({ ...legacy, resources: { agents: "true" } })),
  ).toThrow("boolean");
});

test("accepts an explicit retirement list only for native Codex agent basenames", () => {
  const config = defaultPolicyConfig({ home: "/home/agent", platform: "linux", env: {} });
  config.harnesses.codex.additionalHomes = [
    { id: "windows", home: "/windows", retiredAgents: ["explore.toml"] },
  ];
  expect(
    parsePolicyConfig(JSON.stringify(config)).harnesses.codex.additionalHomes![0].retiredAgents,
  ).toEqual(["explore.toml"]);
  config.harnesses.codex.additionalHomes![0].retiredAgents = ["../config.toml"];
  expect(() => parsePolicyConfig(JSON.stringify(config))).toThrow("agent basename");
});

test("resolves Windows paths from injected environment values", () => {
  const environment = {
    home: "C:\\Users\\agent",
    platform: "win32",
    env: {
      APPDATA: "C:\\Users\\agent\\AppData\\Roaming",
      LOCALAPPDATA: "C:\\Users\\agent\\AppData\\Local",
      CODEX_HOME: "D:\\Codex",
    },
  };
  expect(defaultConfigPath(environment)).toBe(
    "C:\\Users\\agent\\AppData\\Roaming\\agent-policy\\config.json",
  );
  expect(defaultStatePath(environment)).toBe(
    "C:\\Users\\agent\\AppData\\Local\\agent-policy\\state.json",
  );
  expect(defaultPolicyConfig(environment).harnesses.codex.home).toBe("D:\\Codex");
});

test("resolves Linux XDG paths without reading the test host", () => {
  const environment = {
    home: "/home/agent",
    platform: "linux",
    env: { XDG_CONFIG_HOME: "/config", XDG_STATE_HOME: "/state" },
  };
  expect(defaultConfigPath(environment)).toBe("/config/agent-policy/config.json");
  expect(defaultStatePath(environment)).toBe("/state/agent-policy/state.json");
  expect(defaultPolicyConfig(environment).harnesses.vscode.targets).toEqual([
    "/config/Code/User/instructions/agent-policy.instructions.md",
  ]);
});

test("prefers an explicit harness-sync directory for the default configuration", () => {
  const environment = {
    home: "/home/agent",
    platform: "linux",
    env: { XDG_CONFIG_HOME: "/config" },
  };
  expect(defaultConfigPath(environment, "/repo/tools/harness-sync")).toBe(
    "/repo/tools/harness-sync/config.json",
  );
});

test("domain defaults keep configurations adjacent and separate Linux and Windows ownership paths", () => {
  const linux = { home: "/home/agent", platform: "linux", env: { XDG_STATE_HOME: "/state" } };
  const windows = {
    home: "C:\\Users\\agent",
    platform: "win32",
    env: { LOCALAPPDATA: "D:\\Local" },
  };
  expect(defaultConfigPath(linux, "/repo/tools/harness-sync", "instructions")).toBe(
    "/repo/tools/harness-sync/instructions.config.json",
  );
  expect(defaultConfigPath(linux, "/repo/tools/harness-sync", "agents")).toBe(
    "/repo/tools/harness-sync/agents.config.json",
  );
  expect(defaultStatePath(linux, "instructions")).toBe(
    "/state/agent-policy/instructions/state.json",
  );
  expect(defaultStatePath(linux, "agents")).toBe("/state/agent-policy/agents/state.json");
  expect(defaultStatePath(windows, "agents")).toBe("D:\\Local\\agent-policy\\agents\\state.json");
});

test("rejects unsupported configuration keys and relative target paths", () => {
  expect(() =>
    parsePolicyConfig(JSON.stringify({ schemaVersion: 1, harnesses: {}, extra: true })),
  ).toThrow("unsupported key");
  expect(() =>
    parsePolicyConfig(
      JSON.stringify({
        schemaVersion: 1,
        harnesses: {
          pi: { enabled: false },
          codex: { enabled: false },
          vscode: { enabled: true, targets: ["relative.instructions.md"] },
        },
      }),
    ),
  ).toThrow("absolute path");
});

test("accepts named additional Codex homes and rejects duplicate identities", () => {
  const config = defaultPolicyConfig({ home: "/home/agent", platform: "linux", env: {} });
  config.harnesses.codex.additionalHomes = [{ id: "windows", home: "/mnt/c/Users/agent/.codex" }];
  expect(parsePolicyConfig(JSON.stringify(config)).harnesses.codex.additionalHomes).toEqual(
    config.harnesses.codex.additionalHomes,
  );
  config.harnesses.codex.additionalHomes.push({ id: "windows", home: "/other" });
  expect(() => parsePolicyConfig(JSON.stringify(config))).toThrow("duplicate additional Codex id");
});

test("legacy configuration remains valid while Zed validates named homes", () => {
  const config = defaultPolicyConfig({ home: "/home/agent", platform: "linux", env: {} });
  delete config.harnesses.zed;
  expect(parsePolicyConfig(JSON.stringify(config)).harnesses.zed).toBeUndefined();
  config.harnesses.zed = {
    enabled: true,
    home: "/mnt/c/Users/agent/AppData/Roaming/Zed",
    additionalHomes: [{ id: "linux", home: "/home/agent/.config/zed" }],
  };
  expect(parsePolicyConfig(JSON.stringify(config)).harnesses.zed).toEqual(config.harnesses.zed);
  config.harnesses.zed.additionalHomes?.push({ id: "linux", home: "/elsewhere" });
  expect(() => parsePolicyConfig(JSON.stringify(config))).toThrow("duplicate additional Zed id");
});

test("rejects Windows-style target paths when syncing from Linux", () => {
  const config = defaultPolicyConfig({ home: "/home/agent", platform: "linux", env: {} });
  config.harnesses.zed = { enabled: true, home: "C:\\Users\\winne\\AppData\\Roaming\\Zed" };
  expect(() => parsePolicyConfig(JSON.stringify(config), "linux")).toThrow(
    "harnesses.zed.home must be an absolute path for linux",
  );
  const windows = defaultPolicyConfig({ home: "C:\\Users\\winne", platform: "win32", env: {} });
  windows.harnesses.zed = { enabled: true, home: "C:\\Users\\winne\\AppData\\Roaming\\Zed" };
  expect(parsePolicyConfig(JSON.stringify(windows), "win32").harnesses.zed?.home).toBe(
    windows.harnesses.zed.home,
  );
});
