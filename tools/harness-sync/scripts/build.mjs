import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const toolDirectory = path.resolve(import.meta.dirname, "..");
export const entrypoints = [
  { source: "instruction-sync", artifact: "instruction-sync.mjs" },
  { source: "agent-sync", artifact: "agent-sync.mjs" },
  { source: "cli", artifact: "harness-sync.mjs" },
];

export function buildDistribution(outputDirectory) {
  for (const { source, artifact } of entrypoints) {
    execFileSync(
      "bun",
      [
        "build",
        `./src/${source}.ts`,
        "--target=node",
        "--format=esm",
        `--outfile=${path.join(outputDirectory, artifact)}`,
        "--banner=#!/usr/bin/env node",
      ],
      { cwd: toolDirectory, stdio: "inherit" },
    );
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  buildDistribution(path.join(toolDirectory, "dist"));
