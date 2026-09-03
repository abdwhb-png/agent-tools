export function normalizeInstruction(source: string): string {
  return source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\n*$/, "\n");
}

export function renderVsCode(invariants: string, preferences: string): string {
  return [
    "---",
    'applyTo: "**"',
    "---",
    "",
    "<!-- agent-policy: invariants -->",
    normalizeInstruction(invariants).trimEnd(),
    "",
    "<!-- agent-policy: preferences -->",
    normalizeInstruction(preferences).trimEnd(),
    "",
  ].join("\n");
}

export const CODEX_BEGIN = "# >>> agent-policy developer_instructions >>>";
export const CODEX_END = "# <<< agent-policy developer_instructions <<<";

export function renderCodexBlock(invariants: string): string {
  const normalized = normalizeInstruction(invariants).trimEnd();
  if (normalized.includes('"""')) throw new Error("canonical invariants cannot contain a TOML multiline-string delimiter");
  return `${CODEX_BEGIN}\ndeveloper_instructions = \"\"\"\n${normalized}\n\"\"\"\n${CODEX_END}\n`;
}

export function managedCodexBlock(config: string): string | undefined {
  const normalized = normalizeInstruction(config);
  const start = normalized.indexOf(CODEX_BEGIN);
  const end = normalized.indexOf(CODEX_END);
  if (start < 0 && end < 0) return undefined;
  if (start < 0 || end < 0 || end < start) throw new Error("Codex managed-region delimiters are malformed");
  const trailing = end + CODEX_END.length;
  if (normalized.slice(trailing).startsWith("\n")) return normalized.slice(start, trailing + 1);
  return normalized.slice(start, trailing);
}

export function renderCodexConfig(existing: string | undefined, invariants: string, adoptUnmanaged = false): { desired: string; owned: string } {
  const block = renderCodexBlock(invariants);
  if (existing === undefined) return { desired: block, owned: block };
  const normalized = normalizeInstruction(existing);
  const managed = managedCodexBlock(normalized);
  if (managed !== undefined) {
    return { desired: normalized.replace(managed, block), owned: block };
  }
  if (/^developer_instructions\s*=/m.test(normalized)) {
    if (adoptUnmanaged) {
      const assignment = /^developer_instructions\s*=\s*"""\n[\s\S]*?^"""\n?/m.exec(normalized);
      if (!assignment) throw new Error("unmanaged Codex developer_instructions is not a supported multiline TOML string");
      return { desired: normalized.replace(assignment[0], block), owned: block };
    }
    throw new Error("Codex developer_instructions is unmanaged; run adopt explicitly before sync");
  }
  return { desired: `${normalized.trimEnd()}\n\n${block}`, owned: block };
}
