import fs from 'fs-extra';
const { existsSync, readFileSync, writeFileSync, ensureFileSync } = fs;
import { join } from 'path';
import type { TurboSyncConfig, Repository } from '../types.js';

const CONFIG_FILE = '.turbosync.json';

function getConfigPath(cwd = process.cwd()): string {
  return join(cwd, CONFIG_FILE);
}

export function loadConfig(cwd = process.cwd()): TurboSyncConfig {
  const configPath = getConfigPath(cwd);
  
  if (!existsSync(configPath)) {
    return createDefaultConfig(cwd);
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return {
      repositories: [],
      defaultBranch: 'main',
      defaultDirectory: 'external',
      packageManager: 'pnpm',
      workspaceType: 'turborepo',
      ...config
    };
  } catch (error) {
    throw new Error(`Failed to parse config file: ${error}`);
  }
}

export function saveConfig(config: TurboSyncConfig, cwd = process.cwd()): void {
  const configPath = getConfigPath(cwd);
  ensureFileSync(configPath);
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function createDefaultConfig(cwd: string): TurboSyncConfig {
  const config: TurboSyncConfig = {
    repositories: [],
    defaultBranch: 'main',
    defaultDirectory: 'external',
    packageManager: 'pnpm',
    workspaceType: 'turborepo'
  };
  
  saveConfig(config, cwd);
  return config;
}

export function addRepository(repo: Repository, cwd = process.cwd()): void {
  const config = loadConfig(cwd);
  
  const existingIndex = config.repositories.findIndex(r => r.name === repo.name);
  if (existingIndex >= 0) {
    config.repositories[existingIndex] = repo;
  } else {
    config.repositories.push(repo);
  }
  
  saveConfig(config, cwd);
}

export function removeRepository(name: string, cwd = process.cwd()): boolean {
  const config = loadConfig(cwd);
  const initialLength = config.repositories.length;
  
  config.repositories = config.repositories.filter(r => r.name !== name);
  
  if (config.repositories.length < initialLength) {
    saveConfig(config, cwd);
    return true;
  }
  
  return false;
}

export function getRepository(name: string, cwd = process.cwd()): Repository | undefined {
  const config = loadConfig(cwd);
  return config.repositories.find(r => r.name === name);
}

export function getAllRepositories(cwd = process.cwd()): Repository[] {
  const config = loadConfig(cwd);
  return config.repositories;
}