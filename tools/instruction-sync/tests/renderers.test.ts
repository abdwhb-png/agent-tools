import { expect, test } from "bun:test";
import { renderCodexConfig, renderVsCode } from "../src/renderers.js";

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
