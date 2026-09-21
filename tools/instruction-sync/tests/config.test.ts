import { expect, test } from "bun:test";
import { defaultConfigPath, defaultPolicyConfig, defaultStatePath, parsePolicyConfig } from "../src/config.js";

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
  expect(defaultConfigPath(environment)).toBe("C:\\Users\\agent\\AppData\\Roaming\\agent-policy\\config.json");
  expect(defaultStatePath(environment)).toBe("C:\\Users\\agent\\AppData\\Local\\agent-policy\\state.json");
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

test("prefers an explicit instruction-sync directory for the default configuration", () => {
  const environment = { home: "/home/agent", platform: "linux", env: { XDG_CONFIG_HOME: "/config" } };
  expect(defaultConfigPath(environment, "/repo/tools/instruction-sync")).toBe("/repo/tools/instruction-sync/config.json");
});

test("rejects unsupported configuration keys and relative target paths", () => {
  expect(() => parsePolicyConfig(JSON.stringify({ schemaVersion: 1, harnesses: {}, extra: true }))).toThrow("unsupported key");
  expect(() => parsePolicyConfig(JSON.stringify({
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: false },
      codex: { enabled: false },
      vscode: { enabled: true, targets: ["relative.instructions.md"] },
    },
  }))).toThrow("absolute path");
});

test("accepts named additional Codex homes and rejects duplicate identities", () => {
  const config = defaultPolicyConfig({ home: "/home/agent", platform: "linux", env: {} });
  config.harnesses.codex.additionalHomes = [{ id: "windows", home: "/mnt/c/Users/agent/.codex" }];
  expect(parsePolicyConfig(JSON.stringify(config)).harnesses.codex.additionalHomes).toEqual(config.harnesses.codex.additionalHomes);
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
