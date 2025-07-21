import fs from 'fs-extra';
const { existsSync, readFileSync, writeFileSync, symlinkSync } = fs;
import { join, relative } from 'path';
import * as p from '@clack/prompts';

export async function createSymbolicLink(
  source: string,
  target: string,
  cwd = process.cwd()
): Promise<void> {
  const sourcePath = join(cwd, source);
  const targetPath = join(cwd, target);
  
  if (existsSync(targetPath)) {
    p.log.warn(`Symbolic link target already exists: ${target}`);
    return;
  }
  
  try {
    const relativePath = relative(join(targetPath, '..'), sourcePath);
    symlinkSync(relativePath, targetPath, 'dir');
    p.log.success(`Created symbolic link: ${target} -> ${source}`);
  } catch (error) {
    throw new Error(`Failed to create symbolic link: ${error}`);
  }
}

export async function updateWorkspaceConfig(
  packageName: string,
  directory: string,
  cwd = process.cwd()
): Promise<void> {
  const packageJsonPath = join(cwd, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    p.log.warn('No package.json found, skipping workspace configuration');
    return;
  }
  
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    if (!pkg.workspaces) {
      pkg.workspaces = [];
    }
    
    if (Array.isArray(pkg.workspaces)) {
      if (!pkg.workspaces.includes(directory)) {
        pkg.workspaces.push(directory);
      }
    } else if (pkg.workspaces.packages) {
      if (!pkg.workspaces.packages.includes(directory)) {
        pkg.workspaces.packages.push(directory);
      }
    }
    
    writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    p.log.success(`Updated workspace configuration for ${packageName}`);
  } catch (error) {
    throw new Error(`Failed to update workspace configuration: ${error}`);
  }
}

export async function removeFromWorkspaceConfig(
  directory: string,
  cwd = process.cwd()
): Promise<void> {
  const packageJsonPath = join(cwd, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    return;
  }
  
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    if (Array.isArray(pkg.workspaces)) {
      pkg.workspaces = pkg.workspaces.filter((ws: string) => ws !== directory);
    } else if (pkg.workspaces?.packages) {
      pkg.workspaces.packages = pkg.workspaces.packages.filter((ws: string) => ws !== directory);
    }
    
    writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    p.log.success(`Removed ${directory} from workspace configuration`);
  } catch (error) {
    throw new Error(`Failed to remove from workspace configuration: ${error}`);
  }
}

export function generatePackageName(repoName: string, directory: string): string {
  const baseName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `@external/${baseName}`;
}

export async function createPackageJson(
  directory: string,
  packageName: string,
  repoUrl: string,
  cwd = process.cwd()
): Promise<void> {
  const packagePath = join(cwd, directory, 'package.json');
  const sourcePath = join(cwd, directory);
  
  if (existsSync(packagePath)) {
    p.log.info(`Package.json already exists in ${directory}`);
    return;
  }
  
  const packageJson = {
    name: packageName,
    version: '1.0.0',
    description: `External dependency from ${repoUrl}`,
    main: 'index.js',
    private: true,
    repository: {
      type: 'git',
      url: repoUrl
    }
  };
  
  try {
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    p.log.success(`Created package.json for ${packageName}`);
  } catch (error) {
    throw new Error(`Failed to create package.json: ${error}`);
  }
}