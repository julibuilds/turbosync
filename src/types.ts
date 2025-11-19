export interface TurboSyncConfig {
  repositories: Repository[];
  defaultBranch: string;
  defaultDirectory: string;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  workspaceType: "turborepo" | "nx" | "generic";
}

export interface Repository {
  name: string;
  url: string;
  branch: string;
  directory: string;
  subtreePrefix: string;
  lastUpdated: string;
  packageName?: string;
  subdirectory?: string;
}

export interface EnvironmentInfo {
  isGitRepo: boolean;
  isClean: boolean;
  workspaceType: "turborepo" | "nx" | "generic" | null;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  rootDir: string;
  workspaces: string[];
}

export interface AddOptions {
  branch?: string;
  directory?: string;
  name?: string;
  dryRun?: boolean;
}

export interface ListOptions {
  verbose?: boolean;
}

export interface RemoveOptions {
  force?: boolean;
}

export interface UpdateOptions {
  all?: boolean;
  dryRun?: boolean;
}
