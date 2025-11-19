import * as fs from "fs-extra";
import * as p from "@clack/prompts";
import { join, relative } from "path";
import { validateSafePath } from "./validation";

export async function createSymbolicLink(
  source: string,
  target: string,
  cwd = process.cwd(),
): Promise<void> {
  const sourcePath = join(cwd, source);
  const targetPath = join(cwd, target);

  // Validate paths before operation
  const sourceValidation = validateSafePath(source, cwd);
  if (!sourceValidation.isValid) {
    throw new Error(`Invalid source path: ${sourceValidation.error}`);
  }

  const targetValidation = validateSafePath(target, cwd);
  if (!targetValidation.isValid) {
    throw new Error(`Invalid target path: ${targetValidation.error}`);
  }

  try {
    // Check if target exists using async method
    const targetExists = await fs.pathExists(targetPath);
    if (targetExists) {
      p.log.warn(`Symbolic link target already exists: ${target}`);
      return;
    }

    // Create symlink atomically
    const relativePath = relative(join(targetPath, ".."), sourcePath);
    await fs.symlink(relativePath, targetPath, "dir");
    p.log.success(`Created symbolic link: ${target} -> ${source}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create symbolic link: ${message}`);
  }
}

export async function updateWorkspaceConfig(
  packageName: string,
  directory: string,
  cwd = process.cwd(),
): Promise<void> {
  const packageJsonPath = join(cwd, "package.json");

  try {
    // Use async pathExists instead of sync existsSync
    const exists = await fs.pathExists(packageJsonPath);
    if (!exists) {
      p.log.warn("No package.json found, skipping workspace configuration");
      return;
    }

    const pkgContent = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgContent);

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

    await fs.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2), "utf-8");
    p.log.success(`Updated workspace configuration for ${packageName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to update workspace configuration: ${message}`);
  }
}

export async function removeFromWorkspaceConfig(
  directory: string,
  cwd = process.cwd(),
): Promise<void> {
  const packageJsonPath = join(cwd, "package.json");

  try {
    const exists = await fs.pathExists(packageJsonPath);
    if (!exists) {
      return;
    }

    const pkgContent = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgContent);

    if (Array.isArray(pkg.workspaces)) {
      pkg.workspaces = pkg.workspaces.filter((ws: string) => ws !== directory);
    } else if (pkg.workspaces?.packages) {
      pkg.workspaces.packages = pkg.workspaces.packages.filter(
        (ws: string) => ws !== directory,
      );
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2), "utf-8");
    p.log.success(`Removed ${directory} from workspace configuration`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to remove from workspace configuration: ${message}`,
    );
  }
}

export function generatePackageName(
  repoName: string,
  directory: string,
): string {
  const baseName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `@external/${baseName}`;
}

export async function createPackageJson(
  directory: string,
  packageName: string,
  repoUrl: string,
  cwd = process.cwd(),
): Promise<void> {
  const packagePath = join(cwd, directory, "package.json");

  try {
    const exists = await fs.pathExists(packagePath);
    if (exists) {
      p.log.info(`Package.json already exists in ${directory}`);
      return;
    }

    const packageJson = {
      name: packageName,
      version: "1.0.0",
      description: `External dependency from ${repoUrl}`,
      main: "index.js",
      private: true,
      repository: {
        type: "git",
        url: repoUrl,
      },
    };

    // Ensure directory exists before writing
    await fs.ensureDir(join(cwd, directory));
    await fs.writeFile(
      packagePath,
      JSON.stringify(packageJson, null, 2),
      "utf-8",
    );
    p.log.success(`Created package.json for ${packageName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create package.json: ${message}`);
  }
}
