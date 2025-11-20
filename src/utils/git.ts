import { isAbsolute, relative, resolve } from "node:path";
import * as p from "@clack/prompts";
import { execa } from "execa";
import {
  sanitizeCommitMessage,
  validateBranchName,
  validateSafePath,
} from "./validation";

export async function parseRepositoryUrl(input: string): Promise<{
  url: string;
  name: string;
  subdirectory?: string;
  branch?: string;
}> {
  // Check for GitHub URL with tree/ pattern (e.g., https://github.com/owner/repo/tree/branch or .../tree/branch/path)
  const githubTreeRegex =
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/(.+)$/;
  const treeMatch = input.match(githubTreeRegex);

  if (treeMatch) {
    const [, owner, repo, afterTree] = treeMatch;
    if (owner && repo && afterTree) {
      const url = `https://github.com/${owner}/${repo}.git`;

      // Fetch available branches to properly parse branch vs subdirectory
      const branches = await getBranches(url);

      // Try to match the longest possible branch name
      const parts = afterTree.split("/");
      let matchedBranch: string | undefined;
      let subdirectory: string | undefined;

      // Try from longest to shortest combination
      for (let i = parts.length; i > 0; i--) {
        const potentialBranch = parts.slice(0, i).join("/");
        if (branches.includes(potentialBranch)) {
          matchedBranch = potentialBranch;
          if (i < parts.length) {
            subdirectory = parts.slice(i).join("/");
          }
          break;
        }
      }

      if (matchedBranch) {
        const name = subdirectory
          ? subdirectory.split("/").pop() || repo
          : repo;
        return { url, name, subdirectory, branch: matchedBranch };
      }

      // If no branch matched, treat entire afterTree as branch name
      // (it might be a valid branch we just can't access yet)
      return { url, name: repo, branch: afterTree };
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
  _subdirectory?: string,
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

  try {
    if (subdirectory) {
      // For subdirectories, we need to use a different approach:
      // 1. Clone the repo to a temp location
      // 2. Copy only the subdirectory
      // 3. Add it as a subtree
      const { mkdtemp, rm } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");

      const tempDir = await mkdtemp(join(tmpdir(), "turbosync-"));

      try {
        // Clone with depth 1 for efficiency (suppress progress output)
        await execa(
          "git",
          [
            "clone",
            "--depth",
            "1",
            "--branch",
            branch,
            "--quiet",
            url,
            tempDir,
          ],
          {
            timeout: 120000,
            stderr: "pipe",
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

        // Check if there are any changes staged for this prefix
        try {
          const { stdout: diffOutput } = await execa(
            "git",
            ["diff", "--cached", "--name-only"],
            { cwd, timeout: 5000 },
          );

          if (diffOutput.trim().length > 0) {
            // There are staged changes, commit them
            await execa(
              "git",
              ["commit", "-m", `Add ${sanitizedSubdir} from ${url}`],
              {
                cwd,
                timeout: 30000,
              },
            );
          }
          // If no staged changes, that's fine - nothing new to add
        } catch (commitError) {
          // If commit fails for reasons other than "nothing to commit", throw
          const errorMsg =
            commitError instanceof Error
              ? commitError.message
              : String(commitError);
          if (
            !errorMsg.includes("nothing to commit") &&
            !errorMsg.includes("working tree clean") &&
            !errorMsg.includes("no changes added to commit")
          ) {
            throw commitError;
          }
          // Otherwise, silently succeed - no changes is not an error
        }
      } finally {
        // Clean up temp directory
        await rm(tempDir, { recursive: true, force: true });
      }
    } else {
      await execa(
        "git",
        ["subtree", "add", "--prefix", prefix, "--squash", url, branch],
        { cwd, timeout: 60000 }, // 60 second timeout
      );
    }
  } catch (error) {
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

  try {
    if (subdirectory) {
      const { mkdtemp, rm, cp } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");

      const tempDir = await mkdtemp(join(tmpdir(), "turbosync-"));

      try {
        // Clone with depth 1 for efficiency (suppress progress output)
        await execa(
          "git",
          [
            "clone",
            "--depth",
            "1",
            "--branch",
            branch,
            "--quiet",
            url,
            tempDir,
          ],
          {
            timeout: 120000,
            stderr: "pipe",
          },
        );

        const subdirPath = join(tempDir, subdirectory);

        // Remove old contents and copy new ones
        await rm(prefix, { recursive: true, force: true });
        await cp(subdirPath, prefix, { recursive: true });

        // Add and commit the updates
        await execa("git", ["add", prefix], { cwd, timeout: 30000 });
        const sanitizedSubdir = sanitizeCommitMessage(subdirectory);

        // Check if there are any changes staged for this prefix
        try {
          const { stdout: diffOutput } = await execa(
            "git",
            ["diff", "--cached", "--name-only"],
            { cwd, timeout: 5000 },
          );

          if (diffOutput.trim().length > 0) {
            // There are staged changes, commit them
            await execa(
              "git",
              ["commit", "-m", `Update ${sanitizedSubdir} from ${url}`],
              {
                cwd,
                timeout: 30000,
              },
            );
          }
          // If no staged changes, that's fine - the subtree is already up to date
        } catch (commitError) {
          // If commit fails for reasons other than "nothing to commit", throw
          const errorMsg =
            commitError instanceof Error
              ? commitError.message
              : String(commitError);
          if (
            !errorMsg.includes("nothing to commit") &&
            !errorMsg.includes("working tree clean") &&
            !errorMsg.includes("no changes added to commit")
          ) {
            throw commitError;
          }
          // Otherwise, silently succeed - no changes is not an error
        }
      } finally {
        // Clean up temp directory
        await rm(tempDir, { recursive: true, force: true });
      }
    } else {
      await execa(
        "git",
        ["subtree", "pull", "--prefix", prefix, "--squash", url, branch],
        { cwd, timeout: 60000 }, // 60 second timeout
      );
    }
  } catch (error) {
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
