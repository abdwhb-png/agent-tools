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
  await fs.mkdir(path.join(instructions, "codex", "system"), { recursive: true });
  await fs.writeFile(path.join(instructions, "invariant.md"), "\uFEFFInvariant\r\n\r\n");
  await fs.writeFile(path.join(instructions, "preferences.md"), "Preference\n");
  await fs.writeFile(path.join(instructions, "technology-defaults.md"), "Technology\n");
  await fs.writeFile(path.join(instructions, "pi", "APPEND_SYSTEM.md"), "Pi only\n");
  const codexSource = path.join(instructions, "codex", "system", "async-question-wait.md");
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
    run(command: string, ...options: string[]) {
      const result = Bun.spawnSync([
        process.execPath, path.join(tool, "src", "cli.ts"), command,
        "--config", configPath, "--state", statePath, ...options,
      ], { cwd: root });
      return { code: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
    },
  };
}

test("CLI routes Pi modules into separate system and agents targets with isolated append content", async () => {
  const f = await fixture();
  await fs.mkdir(path.join(f.instructions, "pi", "system"));
  await fs.mkdir(path.join(f.instructions, "pi", "agents"));
  await fs.writeFile(path.join(f.instructions, "pi", "system", "tools.md"), "Pi tools\n");
  await fs.writeFile(path.join(f.instructions, "pi", "agents", "workflow.md"), "Pi workflow\n");

  expect(f.run("sync").code).toBe(0);
  expect(await fs.readFile(path.join(f.output, "pi", "SYSTEM.md"), "utf8"))
    .toBe("Invariant\n\nPi tools\n");
  expect(await fs.readFile(path.join(f.output, "pi", "AGENTS.md"), "utf8"))
    .toBe("Preference\n\nTechnology\n\nPi workflow\n");
  expect(await fs.readFile(path.join(f.output, "pi", "APPEND_SYSTEM.md"), "utf8"))
    .toBe("Pi only\n");
  expect(await fs.readFile(path.join(f.output, "codex", "AGENTS.md"), "utf8"))
    .toBe("Preference\n\nTechnology\n");
});

test.each(["pi/append-system.md", "pi/AGENTS.md", "codex/legacy.md", "zed/APPEND_SYSTEM.md", "vscode/legacy.md"])(
  "CLI rejects misplaced %s before changing targets or state",
  async (sourcePath) => {
    const f = await fixture();
    expect(f.run("sync").code).toBe(0);
    const priorConfig = await fs.readFile(f.codexConfig, "utf8");
    const priorState = await fs.readFile(f.statePath, "utf8");
    const misplaced = path.join(f.instructions, sourcePath);
    await fs.mkdir(path.dirname(misplaced), { recursive: true });
    await fs.writeFile(misplaced, "Misplaced rule\n");
    await fs.writeFile(path.join(f.instructions, "invariant.md"), "Updated invariant\n");
    const result = f.run("sync");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(`misplaced instruction source: ${misplaced}`);
    expect(result.stderr).toContain("system/ or agents/");
    expect(await fs.readFile(f.codexConfig, "utf8")).toBe(priorConfig);
    expect(await fs.readFile(f.statePath, "utf8")).toBe(priorState);
    expect(await fs.readFile(path.join(f.output, "pi", "SYSTEM.md"), "utf8"))
      .toBe("Invariant\n");
  },
);

test("CLI sync discovers ordered Codex instructions without changing other harnesses", async () => {
  const f = await fixture();
  await fs.writeFile(
    path.join(f.instructions, "codex", "system", "later-policy.md"),
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
  expect(updated.stdout).toContain("changed    codex-config");
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

test("CLI keeps Codex agents modules out of developer instructions in every home", async () => {
  const f = await fixture();
  const configPath = path.join(f.root, "tools", "instruction-sync", "config.json");
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const windows = path.join(f.output, "windows-codex");
  config.harnesses.codex.additionalHomes = [{ id: "windows", home: windows }];
  await fs.writeFile(configPath, JSON.stringify(config));
  const directory = path.join(f.instructions, "codex", "agents");
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, "20-second.md"), 'Personal """ example\n');
  await fs.writeFile(path.join(directory, "10-first.md"), "\uFEFFFirst Codex preference\r\n");

  expect(f.run("sync").code).toBe(0);
  for (const home of [path.join(f.output, "codex"), windows]) {
    expect(await fs.readFile(path.join(home, "AGENTS.md"), "utf8"))
      .toBe('Preference\n\nTechnology\n\nFirst Codex preference\n\nPersonal """ example\n');
    expect(await fs.readFile(path.join(home, "config.toml"), "utf8"))
      .toBe('# >>> agent-policy developer_instructions >>>\ndeveloper_instructions = """\nInvariant\n\nWait for an answer.\n"""\n# <<< agent-policy developer_instructions <<<\n');
  }
  expect(await fs.readFile(path.join(f.output, "pi", "AGENTS.md"), "utf8"))
    .toBe("Preference\n\nTechnology\n");
  const priorConfig = await fs.readFile(f.codexConfig, "utf8");
  await fs.rm(directory, { recursive: true });
  expect(f.run("sync").code).toBe(0);
  expect(await fs.readFile(f.codexConfig, "utf8")).toBe(priorConfig);
  expect(await fs.readFile(path.join(windows, "AGENTS.md"), "utf8"))
    .toBe("Preference\n\nTechnology\n");
  expect(f.run("check").code).toBe(0);
});

test.each([
  ["codex/agents", "file", "ENOTDIR"],
  ["pi/APPEND_SYSTEM.md", "directory", "EISDIR"],
])("CLI reports invalid %s sources before writing", async (sourcePath, kind, code) => {
  const f = await fixture();
  const invalid = path.join(f.instructions, sourcePath);
  if (kind === "directory") {
    await fs.rm(invalid);
    await fs.mkdir(invalid);
  } else {
    await fs.writeFile(invalid, "Not a directory\n");
  }
  const result = f.run("sync");
  expect(result.code).toBe(2);
  expect(result.stderr).toContain(code);
  expect(await fs.exists(f.statePath)).toBe(false);
  expect(await fs.readdir(f.output)).toEqual(["codex"]);
  expect(await fs.readdir(path.join(f.output, "codex"))).toEqual([]);
});

test("CLI orders Pi and VS Code modules within each layer and supports removing them", async () => {
  const f = await fixture();
  for (const harness of ["pi", "vscode"]) {
    for (const layer of ["system", "agents"]) {
      const directory = path.join(f.instructions, harness, layer);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, "20-second.md"), `${harness} ${layer} second\n`);
      await fs.writeFile(path.join(directory, "10-first.md"), `\uFEFF${harness} ${layer} first\r\n\r\n`);
      await fs.writeFile(path.join(directory, "ignored.txt"), "Not Markdown\n");
      await fs.mkdir(path.join(directory, "nested.md"));
      await fs.writeFile(path.join(directory, "nested.md", "ignored.md"), "Not a direct module\n");
    }
  }

  expect(f.run("sync").code).toBe(0);
  expect(await fs.readFile(path.join(f.output, "pi", "SYSTEM.md"), "utf8"))
    .toBe("Invariant\n\npi system first\n\npi system second\n");
  expect(await fs.readFile(path.join(f.output, "pi", "AGENTS.md"), "utf8"))
    .toBe("Preference\n\nTechnology\n\npi agents first\n\npi agents second\n");
  expect(await fs.readFile(path.join(f.output, "pi", "APPEND_SYSTEM.md"), "utf8"))
    .toBe("Pi only\n");
  expect(await fs.readFile(path.join(f.output, "vscode.instructions.md"), "utf8"))
    .toBe('---\napplyTo: "**"\n---\n\n<!-- agent-policy: invariants -->\nInvariant\n\nvscode system first\n\nvscode system second\n\n<!-- agent-policy: preferences -->\nPreference\n\nTechnology\n\nvscode agents first\n\nvscode agents second\n');
  const codexConfig = await fs.readFile(f.codexConfig, "utf8");
  expect(codexConfig).not.toContain("pi system");
  expect(codexConfig).not.toContain("vscode system");

  await fs.rm(path.join(f.instructions, "pi"), { recursive: true });
  await fs.rm(path.join(f.instructions, "vscode"), { recursive: true });
  expect(f.run("sync").code).toBe(0);
  expect(await fs.readFile(path.join(f.output, "pi", "APPEND_SYSTEM.md"), "utf8"))
    .toBe("");
  expect(await fs.readFile(path.join(f.output, "pi", "SYSTEM.md"), "utf8"))
    .toBe("Invariant\n");
  expect(await fs.readFile(path.join(f.output, "pi", "AGENTS.md"), "utf8"))
    .toBe("Preference\n\nTechnology\n");
  expect(await fs.readFile(path.join(f.output, "vscode.instructions.md"), "utf8"))
    .toBe('---\napplyTo: "**"\n---\n\n<!-- agent-policy: invariants -->\nInvariant\n\n<!-- agent-policy: preferences -->\nPreference\n\nTechnology\n');
  expect(f.run("check")).toMatchObject({ code: 0 });
});

test.each(["invariant.md", "codex/system/async-question-wait.md"])(
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

test("CLI configures both Zed homes and syncs Zed-only modules", async () => {
  const f = await fixture();
  const tool = path.join(f.root, "tools", "instruction-sync");
  const windows = path.join(f.output, "windows-zed");
  const linux = path.join(f.output, "linux-zed");
  const configured = Bun.spawnSync([
    process.execPath, path.join(tool, "src", "cli.ts"), "configure",
    "--config", path.join(tool, "config.json"),
    "--zed-home", windows, "--zed-additional-home", `linux=${linux}`,
    "--enable-zed", "--apply",
  ]);
  expect(configured.exitCode).toBe(0);
  await fs.mkdir(path.join(f.instructions, "zed", "system"), { recursive: true });
  await fs.mkdir(path.join(f.instructions, "zed", "agents"));
  await fs.writeFile(path.join(f.instructions, "zed", "system", "zed-only.md"), "Zed only.\n");
  await fs.writeFile(path.join(f.instructions, "zed", "agents", "workflow.md"), "Zed workflow.\n");
  expect(f.run("sync").code).toBe(0);
  const expected = "Invariant\n\nZed only.\n\nPreference\n\nTechnology\n\nZed workflow.\n";
  expect(await fs.readFile(path.join(windows, "AGENTS.md"), "utf8")).toBe(expected);
  expect(await fs.readFile(path.join(linux, "AGENTS.md"), "utf8")).toBe(expected);
  expect(f.run("check").code).toBe(0);
});

test("adopt clearly distinguishes a target changed this run from an unchanged target", async () => {
  const f = await fixture();
  const existing = path.join(f.output, "pi", "AGENTS.md");
  await fs.mkdir(path.dirname(existing), { recursive: true });
  await fs.writeFile(existing, "old preference\n");
  const result = f.run("adopt", "--target", "pi-agents", "--apply");
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("Changed 1 target.");
  expect(result.stdout).toContain("changed    pi-agents");
  expect(result.stdout.match(/pi-agents/g)).toHaveLength(1);
  expect(result.stdout).not.toContain("Before adoption:");
  expect(result.stdout).not.toContain("After adoption:");
  expect(result.stdout).toContain("Backups:");
  expect(result.stdout).not.toContain("pi-agents.bak");
  expect(await fs.readFile(existing, "utf8")).toBe("Preference\n\nTechnology\n");
  const repeated = f.run("adopt", "--target", "pi-agents", "--apply");
  expect(repeated.stdout).toContain("No target files changed.");
  expect(repeated.stdout).toContain("current    pi-agents");
});

test("sync lists changed targets first and leaves unchanged targets current", async () => {
  const f = await fixture();
  expect(f.run("sync").code).toBe(0);
  await fs.writeFile(path.join(f.instructions, "preferences.md"), "Updated preference\n");
  const updated = f.run("sync");
  expect(updated.code).toBe(0);
  expect(updated.stdout).toContain("Changed 3 targets.");
  expect(updated.stdout).toContain("changed    pi-agents");
  expect(updated.stdout).toContain("changed    codex-agents");
  expect(updated.stdout).toContain("changed    vscode-0");
  expect(updated.stdout).toContain("current    pi-system");
  expect(updated.stdout.indexOf("changed    pi-agents")).toBeLessThan(updated.stdout.indexOf("current    pi-system"));
  expect(updated.stdout.match(/pi-agents/g)).toHaveLength(1);
  const repeated = f.run("sync");
  expect(repeated.stdout).toContain("No target files changed.");
  expect(repeated.stdout).not.toMatch(/^changed\s/m);
});

test("adopt all reports changed, unchanged, and missing targets once", async () => {
  const f = await fixture();
  const piHome = path.join(f.output, "pi");
  await fs.mkdir(piHome, { recursive: true });
  await fs.writeFile(path.join(piHome, "AGENTS.md"), "old preference\n");
  await fs.writeFile(path.join(piHome, "APPEND_SYSTEM.md"), "Pi only\n");
  const result = f.run("adopt", "--all", "--apply");
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("Changed 1 target.");
  expect(result.stdout).toContain("changed    pi-agents");
  expect(result.stdout).toContain("current    pi-append-system");
  expect(result.stdout).toContain("missing    pi-system");
  expect(result.stdout.match(/pi-agents/g)).toHaveLength(1);
  expect(await fs.exists(path.join(piHome, "SYSTEM.md"))).toBe(false);
});
