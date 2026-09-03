declare module "node:crypto" {
  const crypto: { createHash(algorithm: string): { update(value: string): { digest(encoding: string): string } } };
  export default crypto;
}

declare module "node:fs/promises" {
  const fs: any;
  export default fs;
}

declare module "node:os" {
  const os: { homedir(): string };
  export default os;
}

declare module "node:path" {
  const path: any;
  export default path;
}

declare module "node:process" {
  const process: { env: Record<string, string | undefined>; platform: string; argv: string[]; pid: number; exitCode?: number; cwd(): string };
  export default process;
}

declare module "node:url" {
  export function fileURLToPath(url: string): string;
}
