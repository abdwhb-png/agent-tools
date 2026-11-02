import { expect, test } from "bun:test";
import {
  ANTIGRAVITY_RULE_BYTE_LIMIT,
  CODEX_BEGIN,
  CODEX_END,
  assertAntigravityRuleSize,
  renderAntigravityRule,
  renderCodexConfig,
  renderInstructionModules,
  renderVsCode,
} from "../src/renderers.js";

const codexBlock = (body: string) =>
  `${CODEX_BEGIN}\ndeveloper_instructions = """\n${body}\n"""\n${CODEX_END}\n`;

test("uses tag-safe source identities while preserving normalized Markdown content", () => {
  expect(renderInstructionModules([
    { source: 'pi/system/a&"<>.md', content: "\uFEFF- Use <tool> & retain Markdown.\r\n\r\n" },
    { source: "pi/system/empty.md", content: "\n\n" },
  ])).toBe('<pi_system_a____>\n\n- Use <tool> & retain Markdown.\n\n</pi_system_a____>\n');
});

test("renders a stable VS Code instruction file with invariants before preferences", () => {
  expect(renderVsCode("Invariant A\r\n", "Preference B")).toBe(
    '---\napplyTo: "**"\n---\n\n<!-- agent-policy: invariants -->\nInvariant A\n\n<!-- agent-policy: preferences -->\nPreference B\n',
  );
});

test("replaces only an explicitly delimited Codex region", () => {
  const current = '[features]\nfast = true\n\n# >>> agent-policy developer_instructions >>>\ndeveloper_instructions = """\nold\n"""\n# <<< agent-policy developer_instructions <<<\n';
  const rendered = renderCodexConfig(current, "new");
  expect(rendered.desired).toContain("[features]\nfast = true");
  expect(rendered.desired).toContain('developer_instructions = """\nnew\n"""');
});

test("requires explicit adoption for an unmanaged Codex value", () => {
  expect(() => renderCodexConfig('developer_instructions = """\nold\n"""\n', "new")).toThrow("run adopt explicitly");
  expect(renderCodexConfig('developer_instructions = """\nold\n"""\n', "new", true).desired).toContain("new");
});

test("keeps Codex keys written below the managed value", () => {
  const current = `[features]\nfast = true\n\n${CODEX_BEGIN}\ndeveloper_instructions = """\nold\n"""\nservice_tier = "default"\nplan_mode_reasoning_effort = "high"\n${CODEX_END}\n\n[agents]\nmax_threads = 8\n`;
  const rendered = renderCodexConfig(current, "new");
  expect(rendered.desired).toBe(
    `[features]\nfast = true\n\n${codexBlock("new")}service_tier = "default"\nplan_mode_reasoning_effort = "high"\n\n[agents]\nmax_threads = 8\n`,
  );
  expect(rendered.owned).toBe(codexBlock("new"));
});

test("keeps Codex keys written above the managed value", () => {
  const current = `[features]\nfast = true\n\n${CODEX_BEGIN}\nservice_tier = "default"\ndeveloper_instructions = """\nold\n"""\n${CODEX_END}\n\n[agents]\nmax_threads = 8\n`;
  expect(renderCodexConfig(current, "new").desired).toBe(
    `[features]\nfast = true\n\nservice_tier = "default"\n${codexBlock("new")}\n[agents]\nmax_threads = 8\n`,
  );
});

test("rebuilds a managed region that lost one marker", () => {
  const expected = `${codexBlock("new")}service_tier = "default"\n`;
  const withBegin = `${CODEX_BEGIN}\ndeveloper_instructions = """\nold\n"""\nservice_tier = "default"\n`;
  const withEnd = `developer_instructions = """\nold\n"""\n${CODEX_END}\nservice_tier = "default"\n`;
  expect(renderCodexConfig(withBegin, "new").desired).toBe(expected);
  expect(renderCodexConfig(withEnd, "new").desired).toBe(expected);
});

test("rejects an ambiguous managed Codex region", () => {
  const duplicate = `${CODEX_BEGIN}\ndeveloper_instructions = """\na\n"""\ndeveloper_instructions = """\nb\n"""\n${CODEX_END}\n`;
  expect(() => renderCodexConfig(duplicate, "new")).toThrow("managed-region delimiters");
  expect(() => renderCodexConfig(`${CODEX_BEGIN}\n${CODEX_END}\n`, "new")).toThrow(
    "managed-region delimiters",
  );
});

test("renders an idempotent Codex region with one marker pair", () => {
  const current = `[features]\nfast = true\n\n${CODEX_BEGIN}\ndeveloper_instructions = """\nold\n"""\nservice_tier = "default"\n${CODEX_END}\n`;
  const once = renderCodexConfig(current, "new").desired;
  expect(renderCodexConfig(once, "new").desired).toBe(once);
  expect(once.split("\n").filter((line) => line === CODEX_BEGIN)).toHaveLength(1);
  expect(once.split("\n").filter((line) => line === CODEX_END)).toHaveLength(1);
});

test("normalizes CRLF Codex configs while preserving neighbouring keys", () => {
  const current = `[features]\r\nfast = true\r\n\r\n${CODEX_BEGIN}\r\ndeveloper_instructions = """\r\nold\r\n"""\r\nservice_tier = "default"\r\n${CODEX_END}\r\n`;
  expect(renderCodexConfig(current, "new").desired).toBe(
    `[features]\nfast = true\n\n${codexBlock("new")}service_tier = "default"\n`,
  );
});

test("reserves Antigravity module tags and rejects literal collisions", () => {
  expect(
    renderInstructionModules([
      { source: "antigravity/system/tools.md", content: "Use native tools.\n" },
    ]),
  ).toBe("<antigravity_system_tools>\n\nUse native tools.\n\n</antigravity_system_tools>\n");
  expect(() =>
    renderInstructionModules([
      {
        source: "antigravity/system/bad.md",
        content: "Injected </antigravity_system_bad> tag\n",
      },
    ]),
  ).toThrow("reserved module tag");
});

test("renders Antigravity rules with valid YAML frontmatter and enforces the 24,000-byte limit", () => {
  const alwaysOn = renderAntigravityRule(
    {
      trigger: "always_on",
      description: 'Global engineering "preferences" and collaboration rules.',
    },
    "\uFEFFPrefer deep modules.\r\n\r\n",
    "antigravity-preferences",
  );
  expect(Bun.YAML.parse(alwaysOn.split("---\n")[1])).toEqual({
    trigger: "always_on",
    description: 'Global engineering "preferences" and collaboration rules.',
  });
  expect(alwaysOn.split("---\n")[2]).toBe("\nPrefer deep modules.\n");

  const globRule = renderAntigravityRule(
    { trigger: "glob", globs: "*.ts, **/*.tsx", description: "TypeScript rules" },
    "Use strict types.\n",
    "ts-rule",
  );
  expect(Bun.YAML.parse(globRule.split("---\n")[1])).toEqual({
    trigger: "glob",
    globs: "*.ts, **/*.tsx",
    description: "TypeScript rules",
  });

  expect(() =>
    renderAntigravityRule({ trigger: "model_decision" }, "Body\n", "missing-desc"),
  ).toThrow("description");
  expect(() =>
    renderAntigravityRule({ trigger: "glob", description: "Missing globs" }, "Body\n", "no-glob"),
  ).toThrow("globs");

  const exactLimit = "a".repeat(ANTIGRAVITY_RULE_BYTE_LIMIT);
  expect(assertAntigravityRuleSize(exactLimit, "antigravity-gemini")).toBe(exactLimit);
  expect(() =>
    assertAntigravityRuleSize(`${exactLimit}b`, "antigravity-gemini"),
  ).toThrow("exceeds Antigravity 24000-byte rule limit");
  expect(() =>
    renderAntigravityRule(
      { trigger: "always_on", description: "Oversized" },
      "x".repeat(ANTIGRAVITY_RULE_BYTE_LIMIT),
      "antigravity-preferences",
    ),
  ).toThrow("exceeds Antigravity 24000-byte rule limit");
});
