import fs from 'fs-extra';
const { existsSync, readFileSync } = fs;
import { join } from 'path';
import { execa } from 'execa';
import type { EnvironmentInfo } from '../types.js';

export async function detectEnvironment(cwd = process.cwd()): Promise<EnvironmentInfo> {
  const isGitRepo = await checkGitRepository(cwd);
  const isClean = isGitRepo ? await checkGitStatus(cwd) : true;
  const workspaceType = detectWorkspaceType(cwd);
  const packageManager = detectPackageManager(cwd);
  const workspaces = getWorkspaces(cwd);

  return {
    isGitRepo,
    isClean,
    workspaceType,
    packageManager,
    rootDir: cwd,
    workspaces
  };
}

async function checkGitRepository(cwd: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--git-dir'], { cwd });
    return true;
  } catch {
    return false;
  }
}

async function checkGitStatus(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain'], { cwd });
    return stdout.trim() === '';
  } catch {
    return false;
  }
}

function detectWorkspaceType(cwd: string): 'turborepo' | 'nx' | 'generic' | null {
  if (existsSync(join(cwd, 'turbo.json'))) {
    return 'turborepo';
  }
  if (existsSync(join(cwd, 'nx.json'))) {
    return 'nx';
  }
  if (existsSync(join(cwd, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'));
      if (pkg.workspaces) {
        return 'generic';
      }
    } catch {
      // Ignore parsing errors
    }
  }
  return null;
}

function detectPackageManager(cwd: string): 'npm' | 'yarn' | 'pnpm' {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  return 'npm';
}

function getWorkspaces(cwd: string): string[] {
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'));
    if (Array.isArray(pkg.workspaces)) {
      return pkg.workspaces;
    }
    if (pkg.workspaces?.packages) {
      return pkg.workspaces.packages;
    }
  } catch {
    // Ignore parsing errors
  }
  return [];
}

export async function validateEnvironment(skipCleanCheck = false): Promise<string[]> {
  const errors: string[] = [];
  const env = await detectEnvironment();

  if (!env.isGitRepo) {
    errors.push('Current directory is not a git repository');
  }

  if (!skipCleanCheck && !env.isClean) {
    errors.push('Git repository has uncommitted changes');
  }

  if (!env.workspaceType) {
    errors.push('No supported workspace configuration found (TurboRepo, Nx, or package.json workspaces)');
  }

  try {
    await execa('git', ['--version']);
  } catch {
    errors.push('Git is not installed or not accessible');
  }

  return errors;
}

export async function validateEnvironmentForInit(): Promise<string[]> {
  const errors: string[] = [];
  const env = await detectEnvironment();

  if (!env.isGitRepo) {
    errors.push('Current directory is not a git repository');
  }

  try {
    await execa('git', ['--version']);
  } catch {
    errors.push('Git is not installed or not accessible');
  }

  return errors;
}