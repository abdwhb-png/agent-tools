#!/usr/bin/env node

// src/cli.ts
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
var directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
console.log(`harness-sync was replaced by two independent commands:
  node ${path.join(directory, "instruction-sync.mjs")} <configure|doctor|check|sync|adopt>
  node ${path.join(directory, "agent-sync.mjs")} <configure|doctor|check|sync|adopt>
Use configure --import-legacy to migrate existing settings and ownership. No files changed.`);
if (process.argv.slice(2).some((argument) => argument !== "--help" && argument !== "help"))
  process.exitCode = 2;
