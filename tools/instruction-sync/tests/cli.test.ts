import { afterEach, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await fs.rm(root, { recursive: true, force: true });
  }
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-policy-cli-"));
  roots.push(root);
  const tool = path.join(root, "tools", "instruction-sync");
  await fs.cp(path.resolve(import.meta.dir, "../src"), path.join(tool, "src"), { recursive: true });
  const instructions = path.join(root, "instructions");
  await fs.mkdir(path.join(instructions, "pi"), { recursive: true });
  await fs.mkdir(path.join(instructions, "codex"));
  await fs.writeFile(path.join(instructions, "invariant.md"), "\uFEFFInvariant\r\n\r\n");
  await fs.writeFile(path.join(instructions, "preferences.md"), "Preference\n");
  await fs.writeFile(path.join(instructions, "technology-defaults.md"), "Technology\n");
  await fs.writeFile(path.join(instructions, "pi", "append-system.md"), "Pi only\n");
  const codexSource = path.join(instructions, "codex", "async-question-wait.md");
  await fs.writeFile(codexSource, "\uFEFFWait for an answer.\r\n\r\n");
  const output = path.join(root, "output");
  await fs.mkdir(path.join(output, "codex"), { recursive: true });
  const codexConfig = path.join(output, "codex", "config.toml");
  const configPath = path.join(tool, "config.json");
  await fs.writeFile(configPath, JSON.stringify({
    schemaVersion: 1,
    harnesses: {
      pi: { enabled: true, agentDir: path.join(output, "pi") },
      codex: { enabled: true, home: path.join(output, "codex") },
      vscode: { enabled: true, targets: [path.join(output, "vscode.instructions.md")] },
    },
  }));
  const statePath = path.join(root, "state.json");
  return {
    root, instructions, codexSource, codexConfig, output, statePath,
    run(command: string) {
      const result = Bun.spawnSync([
        process.execPath, path.join(tool, "src", "cli.ts"), command,
        "--config", configPath, "--state", statePath,
      ], { cwd: root });
      return { code: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
    },
  };
}

test("CLI sync discovers ordered Codex instructions without changing other harnesses", async () => {
  const f = await fixture();
  await fs.writeFile(
    path.join(f.instructions, "codex", "later-policy.md"),
    "Later policy.\n",
  );
  expect(f.run("sync").code).toBe(0);
  const first = await fs.readFile(f.codexConfig, "utf8");
  expect(first).toBe('# >>> agent-policy developer_instructions >>>\ndeveloper_instructions = """\nInvariant\n\nWait for an answer.\n\nLater policy.\n"""\n# <<< agent-policy developer_instructions <<<\n');
  expect(first).not.toContain("\r");
  expect(first).not.toContain("\uFEFF");
  const otherPaths = [
    path.join(f.output, "pi", "SYSTEM.md"),
    path.join(f.output, "pi", "AGENTS.md"),
    path.join(f.output, "pi", "APPEND_SYSTEM.md"),
    path.join(f.output, "codex", "AGENTS.md"),
    path.join(f.output, "vscode.instructions.md"),
  ];
  const before = await Promise.all(otherPaths.map((file) => fs.readFile(file, "utf8")));
  expect(before).toEqual([
    "Invariant\n", "Preference\n\nTechnology\n", "Pi only\n",
    "Preference\n\nTechnology\n",
    '---\napplyTo: "**"\n---\n\n<!-- agent-policy: invariants -->\nInvariant\n\n<!-- agent-policy: preferences -->\nPreference\n\nTechnology\n',
  ]);
  await fs.writeFile(f.codexConfig, 'model = "test-model"\n' + first);
  await fs.writeFile(f.codexSource, "Updated wait policy.\n");
  const updated = f.run("sync");
  expect(updated.code).toBe(0);
  expect(updated.stdout).toContain("Updated: codex-config\n");
  expect(await fs.readFile(f.codexConfig, "utf8")).toBe(
    'model = "test-model"\n# >>> agent-policy developer_instructions >>>\ndeveloper_instructions = """\nInvariant\n\nUpdated wait policy.\n\nLater policy.\n"""\n# <<< agent-policy developer_instructions <<<\n',
  );
  expect(await Promise.all(otherPaths.map((file) => fs.readFile(file, "utf8")))).toEqual(before);
  const repeated = f.run("sync");
  expect(repeated.code).toBe(0);
  expect(repeated.stdout).toContain("No target files changed.");
  expect(f.run("check")).toMatchObject({ code: 0 });
});

test("CLI sync supports removing every optional Codex instruction", async () => {
  const f = await fixture();
  await fs.rm(path.dirname(f.codexSource), { recursive: true });
  const result = f.run("sync");
  expect(result.code).toBe(0);
  expect(await fs.readFile(f.codexConfig, "utf8")).toBe(
    '# >>> agent-policy developer_instructions >>>\ndeveloper_instructions = """\nInvariant\n"""\n# <<< agent-policy developer_instructions <<<\n',
  );
  expect(f.run("check")).toMatchObject({ code: 0 });
});

test("CLI sync discovers ordered Pi and VS Code instruction modules", async () => {
  const f = await fixture();
  await fs.writeFile(
    path.join(f.instructions, "pi", "later-policy.md"),
    "Later Pi policy.\n",
  );
  await fs.mkdir(path.join(f.instructions, "vscode"));
  await fs.writeFile(
    path.join(f.instructions, "vscode", "10-first.md"),
    "First VS Code policy.\n",
  );
  await fs.writeFile(
    path.join(f.instructions, "vscode", "20-second.md"),
    "Second VS Code policy.\n",
  );

  expect(f.run("sync").code).toBe(0);
  expect(
    await fs.readFile(path.join(f.output, "pi", "APPEND_SYSTEM.md"), "utf8"),
  ).toBe("Pi only\n\nLater Pi policy.\n");
  expect(await fs.readFile(path.join(f.output, "vscode.instructions.md"), "utf8"))
    .toContain(
      "<!-- agent-policy: vscode -->\nFirst VS Code policy.\n\nSecond VS Code policy.\n",
    );
  const codexConfig = await fs.readFile(f.codexConfig, "utf8");
  expect(codexConfig).not.toContain("Later Pi policy.");
  expect(codexConfig).not.toContain("First VS Code policy.");

  await fs.rm(path.join(f.instructions, "pi"), { recursive: true });
  await fs.rm(path.join(f.instructions, "vscode"), { recursive: true });
  expect(f.run("sync").code).toBe(0);
  expect(
    await fs.readFile(path.join(f.output, "pi", "APPEND_SYSTEM.md"), "utf8"),
  ).toBe("");
  expect(await fs.readFile(path.join(f.output, "vscode.instructions.md"), "utf8"))
    .not.toContain("<!-- agent-policy: vscode -->");
  expect(f.run("check")).toMatchObject({ code: 0 });
});

test.each(["invariant.md", "codex/async-question-wait.md"])(
  "CLI sync rejects a TOML delimiter in %s before writing targets or state",
  async (sourcePath) => {
    const f = await fixture();
    await fs.writeFile(path.join(f.instructions, sourcePath), 'Invalid """ source\n');
    const result = f.run("sync");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("cannot contain a TOML multiline-string delimiter");
    expect(await fs.readdir(f.output)).toEqual(["codex"]);
    expect(await fs.readdir(path.join(f.output, "codex"))).toEqual([]);
    expect(await fs.exists(f.statePath)).toBe(false);
  },
);

test("CLI Codex conflict blocks all writes without implicit adoption", async () => {
  const f = await fixture();
  expect(f.run("sync").code).toBe(0);
  const manual = (await fs.readFile(f.codexConfig, "utf8"))
    .replace("Wait for an answer.", "Manual instruction.");
  await fs.writeFile(f.codexConfig, manual);
  await fs.writeFile(path.join(f.instructions, "invariant.md"), "New invariant\n");
  const priorState = await fs.readFile(f.statePath, "utf8");
  const check = f.run("check");
  expect(check.code).toBe(1);
  expect(check.stdout).toContain("target changed independently since the last successful sync");
  const sync = f.run("sync");
  expect(sync.code).toBe(2);
  expect(sync.stderr).toContain("sync preflight failed: codex-config");
  expect(await fs.readFile(f.codexConfig, "utf8")).toBe(manual);
  expect(await fs.readFile(path.join(f.output, "pi", "SYSTEM.md"), "utf8")).toBe("Invariant\n");
  expect(await fs.readFile(f.statePath, "utf8")).toBe(priorState);
  expect(await fs.exists(path.join(f.root, "backups"))).toBe(false);
});

test("configure accepts a named additional Codex home", async () => {
  const f = await fixture();
  const result = Bun.spawnSync([
    process.execPath,
    path.join(f.root, "tools", "instruction-sync", "src", "cli.ts"),
    "configure", "--config", path.join(f.root, "tools", "instruction-sync", "config.json"),
    "--codex-additional-home", `windows=${path.join(f.output, "windows")}`,
  ]);
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toContain('"id": "windows"');
  expect(result.stdout.toString()).toContain(path.join(f.output, "windows"));
});
