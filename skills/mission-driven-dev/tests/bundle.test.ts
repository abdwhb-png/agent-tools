import { expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateArtifact } from "../src/validate.js";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

test("every example artifact is coherent and validation leaves the entire graph unchanged", async () => {
  const paths = files(join(skill, "assets/example"));
  const before = paths.map((path) => [path, readFileSync(path, "utf8"), statSync(path).mtimeMs]);
  for (const path of paths)
    expect(await validateArtifact(path)).toEqual({ valid: true, issues: [], exitCode: 0 });
  expect(paths.map((path) => [path, readFileSync(path, "utf8"), statSync(path).mtimeMs])).toEqual(
    before,
  );
  expect(files(join(skill, "assets/example"))).toEqual(paths);
});

test("all local instruction and template links resolve inside the portable bundle", () => {
  const paths = [
    join(skill, "SKILL.md"),
    join(skill, "MAINTENANCE.md"),
    ...files(join(skill, "references")),
    ...files(join(skill, "assets")),
  ].filter((path) => path.endsWith(".md"));
  for (const path of paths) {
    for (const match of readFileSync(path, "utf8").matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^https?:/.test(target)) continue;
      const resolved = resolve(dirname(path), target);
      expect(resolved.startsWith(`${skill}/`)).toBe(true);
      // Directory links (the editable example set) are valid local resources too.
      const targetStat = statSync(resolved);
      expect(targetStat.isFile() || targetStat.isDirectory()).toBe(true);
    }
  }
});
