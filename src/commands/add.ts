import { join } from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import type { AddOptions, Repository } from "../types.js";
import { addRepository, loadConfig } from "../utils/config.js";
import { validateEnvironment } from "../utils/environment.js";
import {
  addSubtree,
  checkRemoteExists,
  getBranches,
  parseRepositoryUrl,
} from "../utils/git.js";
import {
  createPackageJson,
  createSymbolicLink,
  generatePackageName,
  updateWorkspaceConfig,
} from "../utils/workspace.js";

export async function addCommand(
  repository?: string,
  options: AddOptions = {},
) {
  p.intro(chalk.cyan("🚀 TurboSync Add"));

  const errors = await validateEnvironment();
  if (errors.length > 0) {
    p.cancel(chalk.red("Environment validation failed:"));
    for (const error of errors) {
      p.log.error(error);
    }
    process.exit(1);
  }

  const config = await loadConfig();

  try {
    let repoUrl: string;
    let repoName: string;
    let subdirectory: string | undefined;
    let parsedBranch: string | undefined;

    if (!repository) {
      const repoInput = await p.text({
        message: "Repository URL or GitHub shorthand (owner/repo):",
        placeholder: "facebook/react",
        validate: (value) => {
          if (!value) return "Repository is required";
          try {
            parseRepositoryUrl(value);
            return;
          } catch {
            return "Invalid repository format";
          }
        },
      });

      if (p.isCancel(repoInput)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      const parsed = parseRepositoryUrl(repoInput);
      repoUrl = parsed.url;
      repoName = parsed.name;
      subdirectory = parsed.subdirectory;
      parsedBranch = parsed.branch;
    } else {
      const parsed = parseRepositoryUrl(repository);
      repoUrl = parsed.url;
      repoName = parsed.name;
      subdirectory = parsed.subdirectory;
      parsedBranch = parsed.branch;
    }

    if (options.dryRun) {
      p.log.info("🔍 Dry run mode - no changes will be made");
    }

    const s = p.spinner();
    s.start("Checking repository accessibility...");

    const isAccessible = await checkRemoteExists(repoUrl, subdirectory);
    if (!isAccessible) {
      s.stop("Repository check failed");
      p.cancel(chalk.red(`Repository not accessible: ${repoUrl}`));
      process.exit(1);
    }

    s.stop("Repository is accessible");

    let branch = options.branch || parsedBranch || config.defaultBranch;
    if (!options.branch) {
      s.start("Fetching available branches...");
      const branches = await getBranches(repoUrl);
      s.stop(`Found ${branches.length} branches`);

      if (branches.length > 1) {
        const branchChoice = await p.select({
          message: "Select branch to integrate:",
          options: branches.map((b) => ({ value: b, label: b })),
        });

        if (p.isCancel(branchChoice)) {
          p.cancel("Operation cancelled");
          process.exit(0);
        }

        branch = branchChoice;
      } else if (branches.length === 1) {
        const firstBranch = branches[0];
        if (firstBranch) {
          branch = firstBranch;
        }
      }
    }

    // Handle target directory selection
    let targetDirectory = options.target || config.defaultDirectory;
    const configuredDirectories = config.directories || [
      config.defaultDirectory,
    ];

    if (options.target) {
      // Validate that the specified target exists in configured directories
      if (!configuredDirectories.includes(options.target)) {
        p.cancel(
          chalk.red(
            `Target directory "${options.target}" is not configured. Available: ${configuredDirectories.join(", ")}`,
          ),
        );
        process.exit(1);
      }
    } else if (configuredDirectories.length > 1 && !options.directory) {
      // If multiple directories configured and no explicit directory override, prompt
      const dirChoice = await p.select({
        message: "Select target directory:",
        options: configuredDirectories.map((d) => ({ value: d, label: d })),
      });

      if (p.isCancel(dirChoice)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      targetDirectory = dirChoice;
    }

    const directory = options.directory || join(targetDirectory, repoName);
    const packageName =
      options.name || generatePackageName(repoName, directory);

    // Determine if we should link to packages directory
    const shouldLink =
      options.noLink !== true && (config.linkToPackages ?? true);

    const existingRepo = config.repositories.find((r) => r.name === repoName);
    if (existingRepo) {
      const shouldOverwrite = await p.confirm({
        message: `Repository ${repoName} already exists. Overwrite?`,
      });

      if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }
    }

    if (!options.dryRun) {
      const taskList: Array<{
        title: string;
        task: () => Promise<string>;
      }> = [
        {
          title: "Adding git subtree",
          task: async () => {
            await addSubtree(
              repoUrl,
              directory,
              branch,
              process.cwd(),
              subdirectory,
            );
            return "Git subtree added";
          },
        },
        {
          title: "Creating package.json",
          task: async () => {
            await createPackageJson(directory, packageName, repoUrl);
            return "Package.json created";
          },
        },
      ];

      if (shouldLink) {
        taskList.push(
          {
            title: "Creating symbolic link",
            task: async () => {
              const linkPath = join(
                config.packagesDirectory || "packages",
                repoName,
              );
              await createSymbolicLink(directory, linkPath);
              return "Symbolic link created";
            },
          },
          {
            title: "Updating workspace configuration",
            task: async () => {
              await updateWorkspaceConfig(
                packageName,
                join(config.packagesDirectory || "packages", repoName),
              );
              return "Workspace updated";
            },
          },
        );
      }

      taskList.push({
        title: "Saving configuration",
        task: async () => {
          const repo: Repository = {
            name: repoName,
            url: repoUrl,
            branch,
            directory,
            subtreePrefix: directory,
            lastUpdated: new Date().toISOString(),
            packageName,
            subdirectory,
            targetDirectory,
            linkToPackages: shouldLink,
          };
          await addRepository(repo);
          return "Configuration saved";
        },
      });

      const tasks = p.tasks(taskList);
      await tasks;
    } else {
      p.log.info("📋 Would perform the following actions:");
      p.log.step(`Add git subtree: ${repoUrl} (${branch}) -> ${directory}`);
      p.log.step(`Create package.json: ${packageName}`);
      if (shouldLink) {
        p.log.step(
          `Create symbolic link: ${directory} -> ${config.packagesDirectory || "packages"}/${repoName}`,
        );
        p.log.step("Update workspace configuration");
      } else {
        p.log.step("Skip symbolic link (--no-link)");
      }
      p.log.step("Save to .turbosync.json");
    }

    p.outro(
      options.dryRun
        ? chalk.yellow("✓ Dry run completed - no changes made")
        : chalk.green(`✓ Successfully added ${repoName} to workspace!`),
    );
  } catch (error) {
    p.cancel(chalk.red(`Failed to add repository: ${error}`));
    process.exit(1);
  }
}
