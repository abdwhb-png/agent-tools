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
