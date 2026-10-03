import { expect, test } from "bun:test";
import { renderCodexConfig, renderInstructionModules, renderVsCode } from "../src/renderers.js";

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
