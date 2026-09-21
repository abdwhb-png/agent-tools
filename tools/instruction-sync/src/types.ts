export type HarnessName = "pi" | "codex" | "vscode" | "zed";

export interface HarnessConfig {
  enabled: boolean;
}

export interface HomeHarnessConfig extends HarnessConfig {
  home?: string;
  additionalHomes?: { id: string; home: string }[];
}

export interface PolicyConfig {
  schemaVersion: 1;
  harnesses: {
    pi: HarnessConfig & { agentDir?: string };
    codex: HomeHarnessConfig;
    vscode: HarnessConfig & { targets?: string[] };
    zed?: HomeHarnessConfig;
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
