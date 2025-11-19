import * as p from "@clack/prompts";
import chalk from "chalk";
import type { TurboSyncConfig } from "../types.js";
import { loadConfig, saveConfig } from "../utils/config.js";
import {
  detectEnvironment,
  validateEnvironmentForInit,
} from "../utils/environment.js";

export async function initCommand() {
  p.intro(chalk.cyan("🚀 TurboSync Initialization"));

  const errors = await validateEnvironmentForInit();
  if (errors.length > 0) {
    p.log.warn("Environment issues detected:");
    for (const error of errors) {
      p.log.error(`  • ${error}`);
    }

    if (errors.some((e) => e.includes("git repository"))) {
      const shouldInit = await p.confirm({
        message: "Initialize git repository in current directory?",
      });

      if (p.isCancel(shouldInit)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      if (shouldInit) {
        const { execa } = await import("execa");
        try {
          await execa("git", ["init"]);
          p.log.success("Git repository initialized");
        } catch (error) {
          p.cancel(chalk.red(`Failed to initialize git: ${error}`));
          process.exit(1);
        }
      }
    }
  }

  const env = await detectEnvironment();

  p.log.info("Environment detected:");
  p.log.step(
    `Workspace type: ${env.workspaceType || "none (will use generic)"}`,
  );
  p.log.step(`Package manager: ${env.packageManager}`);
  p.log.step(`Git repository: ${env.isGitRepo ? "yes" : "no"}`);
  p.log.step(`Working tree clean: ${env.isClean ? "yes" : "no"}`);

  const existingConfig = await loadConfig();
  if (existingConfig.repositories.length > 0) {
    p.log.info(
      `Found existing configuration with ${existingConfig.repositories.length} repositories`,
    );
  }

  const group = await p.group(
    {
      defaultDirectory: () =>
        p.text({
          message: "Default directory for external repositories:",
          initialValue: existingConfig.defaultDirectory,
          validate: (value) => {
            if (!value) return "Directory is required";
            if (value.startsWith("/")) return "Use relative paths only";
          },
        }),
      defaultBranch: () =>
        p.text({
          message: "Default branch to integrate:",
          initialValue: existingConfig.defaultBranch,
          validate: (value) => {
            if (!value) return "Branch is required";
          },
        }),
      linkToPackages: () =>
        p.confirm({
          message: "Link repositories to packages directory by default?",
          initialValue: existingConfig.linkToPackages ?? true,
        }),
      packagesDirectory: ({ results }) =>
        results.linkToPackages
          ? p.text({
              message: "Packages directory name:",
              initialValue: existingConfig.packagesDirectory || "packages",
              validate: (value) => {
                if (!value) return "Directory is required";
                if (value.startsWith("/")) return "Use relative paths only";
              },
            })
          : Promise.resolve(existingConfig.packagesDirectory || "packages"),
      manageDirectories: () =>
        p.confirm({
          message: "Configure additional target directories?",
          initialValue: false,
        }),
      confirm: () =>
        p.confirm({
          message: "Save configuration?",
        }),
    },
    {
      onCancel: () => {
        p.cancel("Operation cancelled");
        process.exit(0);
      },
    },
  );

  // Handle multiple directories configuration
  let directories = existingConfig.directories || [group.defaultDirectory];
  if (!directories.includes(group.defaultDirectory)) {
    directories = [group.defaultDirectory, ...directories];
  }

  if (group.manageDirectories) {
    let managing = true;
    while (managing) {
      p.log.info(`\nCurrent directories: ${directories.join(", ")}`);

      const action = await p.select({
        message: "Manage directories:",
        options: [
          { value: "add", label: "Add directory" },
          { value: "remove", label: "Remove directory" },
          { value: "done", label: "Done" },
        ],
      });

      if (p.isCancel(action)) {
        break;
      }

      if (action === "done") {
        managing = false;
      } else if (action === "add") {
        const newDir = await p.text({
          message: "Directory name:",
          validate: (value) => {
            if (!value) return "Directory is required";
            if (value.startsWith("/")) return "Use relative paths only";
            if (directories.includes(value)) return "Directory already exists";
          },
        });

        if (!p.isCancel(newDir)) {
          directories.push(newDir);
          p.log.success(`Added directory: ${newDir}`);
        }
      } else if (action === "remove") {
        if (directories.length <= 1) {
          p.log.warn("Cannot remove the last directory");
          continue;
        }

        const toRemove = await p.select({
          message: "Select directory to remove:",
          options: directories
            .filter((d) => d !== group.defaultDirectory)
            .map((d) => ({ value: d, label: d })),
        });

        if (!p.isCancel(toRemove)) {
          directories = directories.filter((d) => d !== toRemove);
          p.log.success(`Removed directory: ${toRemove}`);
        }
      }
    }
  }

  if (!group.confirm) {
    p.cancel("Configuration not saved");
    process.exit(0);
  }

  const config: TurboSyncConfig = {
    ...existingConfig,
    defaultDirectory: group.defaultDirectory,
    defaultBranch: group.defaultBranch,
    directories,
    linkToPackages: group.linkToPackages,
    packagesDirectory: group.packagesDirectory as string,
    packageManager: env.packageManager,
    workspaceType: env.workspaceType || "generic",
  };

  await saveConfig(config);

  p.outro(chalk.green("✓ TurboSync initialized successfully!"));
  p.log.info("\nNext steps:");
  p.log.step("turbosync add <repository> - Add a repository to your workspace");
  p.log.step("turbosync list - View integrated repositories");
  p.log.step("turbosync --help - View all available commands");
}
