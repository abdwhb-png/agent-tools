import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildDistribution, entrypoints, toolDirectory } from "./build.mjs";

const temporary = await mkdtemp(path.join(os.tmpdir(), "harness-sync-build-"));
try {
  buildDistribution(temporary);
  for (const { artifact } of entrypoints) {
    const [expected, actual] = await Promise.all([
      readFile(path.join(toolDirectory, "dist", artifact)),
      readFile(path.join(temporary, artifact)),
    ]);
    if (!expected.equals(actual))
      throw new Error(`dist/${artifact} is stale; run bun run build and commit the result`);
    execFileSync(process.execPath, [path.join(toolDirectory, "dist", artifact), "--help"], {
      stdio: "pipe",
    });
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
