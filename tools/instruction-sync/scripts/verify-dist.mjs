import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const temporary = await mkdtemp(path.join(os.tmpdir(), "agent-policy-build-"));
const output = path.join(temporary, "agent-policy.mjs");

try {
  execFileSync("bun", ["build", "./src/cli.ts", "--target=node", "--format=esm", `--outfile=${output}`, "--banner=#!/usr/bin/env node"], {
    cwd: root,
    stdio: "inherit",
  });
  const [expected, actual] = await Promise.all([
    readFile(path.join(root, "dist", "agent-policy.mjs")),
    readFile(output),
  ]);
  if (!expected.equals(actual)) {
    throw new Error("dist/agent-policy.mjs is stale; run bun run build and commit the result");
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
