import { validateArtifact, type ValidationReport } from "./validate.js";

const args = process.argv.slice(2);
const usage = "Usage: node scripts/validate.mjs <artifact-path> [--json]";
const json = args.includes("--json");
const paths = args.filter((arg) => !arg.startsWith("--"));

function print(report: ValidationReport): void {
  if (json)
    process.stdout.write(`${JSON.stringify({ valid: report.valid, issues: report.issues })}\n`);
  else if (report.valid)
    process.stdout.write(
      "Structurally valid; authorization and semantic acceptance are not verified.\n",
    );
  else
    process.stdout.write(
      `${report.issues.map((i) => `${i.path}: ${i.rule}: ${i.message}`).join("\n")}\n`,
    );
  process.exitCode = report.exitCode;
}

if (args.length === 1 && args[0] === "--help") {
  process.stdout.write(`${usage}\n`);
} else if (
  paths.length !== 1 ||
  args.some((arg) => arg.startsWith("--") && arg !== "--json") ||
  args.filter((arg) => arg === "--json").length > 1
) {
  print({
    valid: false,
    issues: [{ path: "<arguments>", rule: "usage", message: usage }],
    exitCode: 2,
  });
} else {
  print(await validateArtifact(paths[0]));
}
