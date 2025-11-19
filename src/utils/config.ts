import * as fs from "fs-extra";
import { join, dirname } from "path";
import { tmpName } from "tmp-promise";
import type { Repository, TurboSyncConfig } from "../types.js";
import { TurboSyncConfigSchema } from "../schemas.js";

const CONFIG_FILE = ".turbosync.json";

function getConfigPath(cwd = process.cwd()): string {
  return join(cwd, CONFIG_FILE);
}

export async function loadConfig(
  cwd = process.cwd(),
): Promise<TurboSyncConfig> {
  const configPath = getConfigPath(cwd);

  try {
    // Use async pathExists instead of sync existsSync
    const exists = await fs.pathExists(configPath);
    if (!exists) {
      return await createDefaultConfig(cwd);
    }

    const configContent = await fs.readFile(configPath, "utf-8");
    const rawConfig = JSON.parse(configContent);

    // Validate with Zod schema to prevent prototype pollution and ensure data integrity
    const validatedConfig = TurboSyncConfigSchema.parse({
      repositories: [],
      defaultBranch: "main",
      defaultDirectory: "external",
      packageManager: "bun",
      workspaceType: "turborepo",
      ...rawConfig,
    });

    return validatedConfig as TurboSyncConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to load config file at ${configPath}: ${message}`);
  }
}

export async function saveConfig(
  config: TurboSyncConfig,
  cwd = process.cwd(),
): Promise<void> {
  const configPath = getConfigPath(cwd);
  const tempPath = await tmpName({ dir: dirname(configPath) });

  try {
    // Ensure directory exists
    await fs.ensureDir(dirname(configPath));

    // Write to temp file first (atomic write pattern)
    await fs.writeFile(tempPath, JSON.stringify(config, null, 2), "utf-8");

    // Atomic rename
    await fs.rename(tempPath, configPath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.remove(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save config file: ${message}`);
  }
}

async function createDefaultConfig(cwd: string): Promise<TurboSyncConfig> {
  const config: TurboSyncConfig = {
    repositories: [],
    defaultBranch: "main",
    defaultDirectory: "external",
    packageManager: "bun",
    workspaceType: "turborepo",
  };

  await saveConfig(config, cwd);
  return config;
}

export async function addRepository(
  repo: Repository,
  cwd = process.cwd(),
): Promise<void> {
  const config = await loadConfig(cwd);

  const existingIndex = config.repositories.findIndex(
    (r) => r.name === repo.name,
  );
  if (existingIndex >= 0) {
    config.repositories[existingIndex] = repo;
  } else {
    config.repositories.push(repo);
  }

  await saveConfig(config, cwd);
}

export async function removeRepository(
  name: string,
  cwd = process.cwd(),
): Promise<boolean> {
  const config = await loadConfig(cwd);
  const initialLength = config.repositories.length;

  config.repositories = config.repositories.filter((r) => r.name !== name);

  if (config.repositories.length < initialLength) {
    await saveConfig(config, cwd);
    return true;
  }

  return false;
}

export async function getRepository(
  name: string,
  cwd = process.cwd(),
): Promise<Repository | undefined> {
  const config = await loadConfig(cwd);
  return config.repositories.find((r) => r.name === name);
}

export async function getAllRepositories(
  cwd = process.cwd(),
): Promise<Repository[]> {
  const config = await loadConfig(cwd);
  return config.repositories;
}
