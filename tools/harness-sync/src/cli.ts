import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
console.log(
  `harness-sync was replaced by two independent commands:\n  node ${path.join(directory, "instruction-sync.mjs")} <configure|doctor|check|sync|adopt>\n  node ${path.join(directory, "agent-sync.mjs")} <configure|doctor|check|sync|adopt>\nUse configure --import-legacy to migrate existing settings and ownership. No files changed.`,
);
if (process.argv.slice(2).some((argument) => argument !== "--help" && argument !== "help"))
  process.exitCode = 2;
