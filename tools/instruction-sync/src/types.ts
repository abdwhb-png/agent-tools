export type HarnessName = "pi" | "codex" | "vscode";

export interface HarnessConfig {
  enabled: boolean;
}

export interface PolicyConfig {
  schemaVersion: 1;
  harnesses: {
    pi: HarnessConfig & { agentDir?: string };
    codex: HarnessConfig & { home?: string };
    vscode: HarnessConfig & { targets?: string[] };
  };
}

export interface TargetState {
  path: string;
  ownedHash: string;
}

export interface PolicyState {
  schemaVersion: 1;
  targets: Record<string, TargetState>;
}

export type TargetKind = "file" | "codex";

export interface RenderedTarget {
  id: string;
  kind: TargetKind;
  path: string;
  desired: string;
  owned: string;
}
