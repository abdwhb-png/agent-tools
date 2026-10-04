import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderPiAgent } from "../src/agents.js";

const agentDirectory = path.join(os.homedir(), ".pi", "agent");
const coreParser = path.join(
  process.env.PI_CORE_PACKAGE_DIR ?? path.join(agentDirectory, "node_modules", "@earendil-works", "pi-coding-agent"),
  "dist", "utils", "frontmatter.js",
);
const subagentsParser = path.join(
  process.env.PI_SUBAGENTS_DIR ?? path.join(agentDirectory, "npm", "node_modules", "pi-subagents"),
  "src", "agents", "frontmatter.js",
);

describe.skipIf(!existsSync(coreParser) || !existsSync(subagentsParser))("Pi frontmatter consumers", () => {
  test.each([
    "@review",
    "Review: inspect the change",
    "Preserve # literal text",
    'Reviews "quoted" paths and C:\\source',
    'Preserve both \'single\' and "double" quotes',
    "it's C:\\source",
    '"',
    "'",
    "true",
    "42",
    "null",
    "[read, write]",
    "{ field: value }",
    "",
    " leading and trailing ",
    "first\nsecond",
    "first\n  indented\n\nlast\n",
  ])("preserve metadata %j through both real parsers", async (description) => {
    const [core, subagents] = await Promise.all([
      import(pathToFileURL(coreParser).href),
      import(pathToFileURL(subagentsParser).href),
    ]);
    const body = 'User-controlled prompt with "quotes", @aliases and C:\\paths.';
    const rendered = renderPiAgent({
      id: "fixture",
      description,
      role: body,
      pi: {
        name: "fixture",
        tools: ["@review", "mcp:context7"],
        turnBudget: '{ "maxTurns": 20, "graceTurns": 8 }',
        inheritSkills: false,
        defaultReads: "",
        zFixture: description,
      },
      piInstructions: body,
      codexInstructions: "",
    });
    for (const parser of [core, subagents]) {
      const parsed = parser.parseFrontmatter(rendered);
      expect(parsed.frontmatter.description).toBe(description);
      expect(parsed.frontmatter.zFixture).toBe(description);
      expect(parsed.frontmatter.tools).toBe("@review, mcp:context7");
      expect(parsed.frontmatter.turnBudget).toBe('{ "maxTurns": 20, "graceTurns": 8 }');
      expect(String(parsed.frontmatter.inheritSkills)).toBe("false");
      expect(parsed.frontmatter.defaultReads).toBe("");
      expect(parsed.body).toBe(body);
    }
  });
});

test.each([
  "first\nsecond\n\n",
  ' leading \'single\' and "double" quotes',
  "invalid\u0000control",
])("rejects metadata that cannot round-trip through both parsers: %j", (description) => {
  expect(() => renderPiAgent({
    id: "fixture", description, role: "Body", pi: { name: "fixture" },
    piInstructions: "Body", codexInstructions: "",
  })).toThrow("cannot preserve");
});
