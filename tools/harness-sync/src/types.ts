export type HarnessName = "pi" | "codex" | "vscode" | "zed";
export type SyncDomain = "instructions" | "agents";

export interface HarnessConfig {
  enabled: boolean;
}

export interface HomeHarnessConfig extends HarnessConfig {
  home?: string;
  retiredAgents?: string[];
  additionalHomes?: { id: string; home: string; retiredAgents?: string[] }[];
}

export interface PolicyConfig {
  schemaVersion: 1;
  resources?: { instructions?: boolean; agents?: boolean };
  paths?: Record<string, string>;
  harnesses: {
    pi: HarnessConfig & { agentDir?: string };
    codex: HomeHarnessConfig;
    vscode: HarnessConfig & { targets?: string[]; directories?: { id: string; path: string }[] };
    zed?: HomeHarnessConfig;
  };
}

export interface SyncProfile {
  schemaVersion: 2;
  kind: SyncDomain;
  enabled: boolean;
  paths?: Record<string, string>;
  harnesses: {
    pi: PolicyConfig["harnesses"]["pi"];
    codex: HomeHarnessConfig;
    vscode?: PolicyConfig["harnesses"]["vscode"];
    zed?: HomeHarnessConfig;
  };
}

export interface TargetState {
  path: string;
  ownedHash: string;
  agentDirectory?: string;
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
  agentDirectory?: string;
  operation?: "delete";
}
