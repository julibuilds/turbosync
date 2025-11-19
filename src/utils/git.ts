import { isAbsolute, relative, resolve } from "node:path";
import * as p from "@clack/prompts";
import { execa } from "execa";
import {
  sanitizeCommitMessage,
  validateBranchName,
  validateSafePath,
} from "./validation";

export function parseRepositoryUrl(input: string): {
  url: string;
  name: string;
  subdirectory?: string;
  branch?: string;
} {
  // Check for GitHub URL with subdirectory (e.g., https://github.com/owner/repo/tree/branch/path/to/dir)
  const githubSubdirRegex =
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/;
  const subdirMatch = input.match(githubSubdirRegex);

  if (subdirMatch) {
    const [, owner, repo, branch, subdirectory] = subdirMatch;
    if (owner && repo && branch && subdirectory) {
      const url = `https://github.com/${owner}/${repo}.git`;
      const name = subdirectory.split("/").pop() || repo;
      return { url, name, subdirectory, branch };
    }
  }

  // First check for GitHub shorthand (owner/repo)
  const githubShorthandRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
  if (githubShorthandRegex.test(input)) {
    const [owner, repo] = input.split("/");
    if (owner && repo && owner.length > 0 && repo.length > 0) {
      const url = `https://github.com/${owner}/${repo}.git`;
      return { url, name: repo };
    }
  }

  // Validate full URLs - only allow HTTPS for security
  try {
    const urlObj = new URL(input.replace(/\.git$/, ""));

    // Only allow HTTPS protocol (block git://, ext::, etc.)
    if (urlObj.protocol !== "https:") {
      throw new Error(
        "Only HTTPS URLs are allowed for security. Please use an HTTPS URL.",
      );
    }

    // Validate hostname exists
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      throw new Error("Invalid hostname in URL");
    }

    const url = input;
    const name = extractRepoName(url);
    return { url, name };
  } catch (error) {
    throw new Error(
      `Invalid repository format. Use HTTPS URL or GitHub shorthand (owner/repo). Error: ${error instanceof Error ? error.message : error}`,
    );
  }
}

function extractRepoName(url: string): string {
  const match = url.match(/\/([^/]+?)(?:\.git)?$/);
  return match?.[1] || "unknown";
}

export async function checkRemoteExists(
  url: string,
  subdirectory?: string,
): Promise<boolean> {
  try {
    await execa("git", ["ls-remote", "--heads", url], { timeout: 10000 });
    // Note: We can't verify subdirectory existence without cloning,
    // so we just check if the repo is accessible
    return true;
  } catch {
    return false;
  }
}

export async function getBranches(url: string): Promise<string[]> {
  try {
    const { stdout } = await execa("git", ["ls-remote", "--heads", url]);
    return stdout
      .split("\n")
      .filter((line) => line.includes("refs/heads/"))
      .map((line) => {
        const branchName = line.split("refs/heads/")[1];
        return branchName || "";
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function addSubtree(
  url: string,
  prefix: string,
  branch = "main",
  cwd = process.cwd(),
  subdirectory?: string,
): Promise<void> {
  // Validate branch name
  if (!validateBranchName(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }

  // Validate prefix path
  const pathValidation = validateSafePath(prefix, cwd);
  if (!pathValidation.isValid) {
    throw new Error(`Invalid prefix: ${pathValidation.error}`);
  }

  const s = p.spinner();
  try {
    if (subdirectory) {
      // For subdirectories, we need to use a different approach:
      // 1. Clone the repo to a temp location
      // 2. Copy only the subdirectory
      // 3. Add it as a subtree
      s.start(`Adding subtree from ${url} (subdirectory: ${subdirectory})`);

      const { mkdtemp, rm } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");

      const tempDir = await mkdtemp(join(tmpdir(), "turbosync-"));

      try {
        // Clone with depth 1 for efficiency
        await execa(
          "git",
          ["clone", "--depth", "1", "--branch", branch, url, tempDir],
          {
            timeout: 120000,
          },
        );

        const subdirPath = join(tempDir, subdirectory);

        // Copy subdirectory contents to the prefix location
        const { mkdir, cp } = await import("node:fs/promises");
        await mkdir(prefix, { recursive: true });
        await cp(subdirPath, prefix, { recursive: true });

        // Add and commit the files
        await execa("git", ["add", prefix], { cwd, timeout: 30000 });
        const sanitizedSubdir = sanitizeCommitMessage(subdirectory);
        await execa(
          "git",
          ["commit", "-m", `Add ${sanitizedSubdir} from ${url}`],
          {
            cwd,
            timeout: 30000,
          },
        );
      } finally {
        // Clean up temp directory
        await rm(tempDir, { recursive: true, force: true });
      }

      s.stop("Subtree added successfully");
    } else {
      s.start(`Adding subtree from ${url}`);

      await execa(
        "git",
        ["subtree", "add", "--prefix", prefix, "--squash", url, branch],
        { cwd, timeout: 60000 }, // 60 second timeout
      );

      s.stop("Subtree added successfully");
    }
  } catch (error) {
    s.stop("Failed to add subtree");
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Git subtree add failed: ${message}`);
  }
}

export async function updateSubtree(
  url: string,
  prefix: string,
  branch = "main",
  cwd = process.cwd(),
  subdirectory?: string,
): Promise<void> {
  // Validate branch name
  if (!validateBranchName(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }

  // Validate prefix path
  const pathValidation = validateSafePath(prefix, cwd);
  if (!pathValidation.isValid) {
    throw new Error(`Invalid prefix: ${pathValidation.error}`);
  }

  const s = p.spinner();
  try {
    if (subdirectory) {
      s.start(`Updating subtree ${prefix} (subdirectory: ${subdirectory})`);

      const { mkdtemp, rm, cp } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");

      const tempDir = await mkdtemp(join(tmpdir(), "turbosync-"));

      try {
        // Clone with depth 1 for efficiency
        await execa(
          "git",
          ["clone", "--depth", "1", "--branch", branch, url, tempDir],
          {
            timeout: 120000,
          },
        );

        const subdirPath = join(tempDir, subdirectory);

        // Remove old contents and copy new ones
        await rm(prefix, { recursive: true, force: true });
        await cp(subdirPath, prefix, { recursive: true });

        // Add and commit the updates
        await execa("git", ["add", prefix], { cwd, timeout: 30000 });
        const sanitizedSubdir = sanitizeCommitMessage(subdirectory);
        await execa(
          "git",
          ["commit", "-m", `Update ${sanitizedSubdir} from ${url}`],
          {
            cwd,
            timeout: 30000,
          },
        );
      } finally {
        // Clean up temp directory
        await rm(tempDir, { recursive: true, force: true });
      }

      s.stop("Subtree updated successfully");
    } else {
      s.start(`Updating subtree ${prefix}`);

      await execa(
        "git",
        ["subtree", "pull", "--prefix", prefix, "--squash", url, branch],
        { cwd, timeout: 60000 }, // 60 second timeout
      );

      s.stop("Subtree updated successfully");
    }
  } catch (error) {
    s.stop("Failed to update subtree");
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Git subtree pull failed: ${message}`);
  }
}

export async function removeSubtree(
  prefix: string,
  cwd = process.cwd(),
): Promise<void> {
  // Validate prefix path to prevent path traversal attacks
  const pathValidation = validateSafePath(prefix, cwd);
  if (!pathValidation.isValid) {
    throw new Error(`Invalid prefix: ${pathValidation.error}`);
  }

  // Use the normalized path
  if (!pathValidation.normalizedPath) {
    throw new Error("Path validation did not return a normalized path");
  }
  const safePath = resolve(cwd, pathValidation.normalizedPath);

  // Verify the path exists within cwd before deletion
  const relativePath = relative(cwd, safePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(
      "Invalid path: attempting to access outside working directory",
    );
  }

  const s = p.spinner();
  try {
    s.start(`Removing subtree ${prefix}`);

    // Use the absolute safe path for rm
    await execa("rm", ["-rf", safePath], { cwd, timeout: 30000 });
    await execa("git", ["add", "."], { cwd, timeout: 30000 });

    // Sanitize commit message to prevent injection
    const sanitizedPrefix = sanitizeCommitMessage(prefix);
    await execa("git", ["commit", "-m", `Remove subtree ${sanitizedPrefix}`], {
      cwd,
      timeout: 30000,
    });

    s.stop("Subtree removed successfully");
  } catch (error) {
    s.stop("Failed to remove subtree");
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Subtree removal failed: ${message}`);
  }
}
