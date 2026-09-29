import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(skill, "scripts/validate.mjs");
const roots: string[] = [];
function setup() {
  const root = mkdtempSync(join(tmpdir(), "mission-cli-test-"));
  roots.push(root);
  return root;
}
function invoke(args: string[], cwd: string) {
  return spawnSync("node", [cli, ...args], { cwd, encoding: "utf8", timeout: 5000 });
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("delivered Node CLI validates from another cwd without modifying inputs or running embedded commands", () => {
  const root = setup();
  const artifact = join(root, "roadmap.md");
  const source = `---\n{"schemaVersion":1,"kind":"roadmap","id":"r","revision":1}\n---\n# Outcome\n\nRun \`touch '${join(root, "unexpected-file")}'\` later, not during validation.\n`;
  writeFileSync(artifact, source);
  const before = statSync(artifact).mtimeMs;
  const process = invoke([artifact, "--json"], tmpdir());
  expect(process.status).toBe(0);
  expect(JSON.parse(process.stdout)).toEqual({ valid: true, issues: [] });
  expect(process.stderr).toBe("");
  expect(readFileSync(artifact, "utf8")).toBe(source);
  expect(statSync(artifact).mtimeMs).toBe(before);
  expect(readdirSync(root)).toEqual(["roadmap.md"]);
});

test("CLI separates invalid artifacts, invocation errors, read failures and help", () => {
  const root = setup();
  const bad = join(root, "bad.json");
  writeFileSync(bad, "{invalid}");
  const invalid = invoke([bad, "--json"], root);
  expect(invalid.status).toBe(1);
  expect(JSON.parse(invalid.stdout).issues[0].rule).toBe("parse");
  for (const args of [["--json"], [bad, "--unknown", "--json"], [bad, bad, "--json"]]) {
    const usage = invoke(args, root);
    expect(usage.status).toBe(2);
    expect(JSON.parse(usage.stdout).issues[0].rule).toBe("usage");
  }
  expect(invoke([join(root, "absent.json"), "--json"], root).status).toBe(2);
  expect(invoke(["--help"], root).status).toBe(0);
  expect(invoke([bad], root).stdout).toContain("parse");
});
