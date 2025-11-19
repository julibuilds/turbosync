import * as p from "@clack/prompts";
import chalk from "chalk";
import * as fs from "fs-extra";

const { unlinkSync } = fs;

import { join } from "path";
import type { RemoveOptions } from "../types.js";
import {
  getAllRepositories,
  getRepository,
  removeRepository as removeRepoFromConfig,
} from "../utils/config.js";
import { removeSubtree } from "../utils/git.js";
import { removeFromWorkspaceConfig } from "../utils/workspace.js";

export async function removeCommand(
  name?: string,
  options: RemoveOptions = {},
) {
  p.intro(chalk.cyan("🗑️ TurboSync Remove"));

  const repositories = await getAllRepositories();

  if (repositories.length === 0) {
    p.log.warn("No repositories to remove");
    p.outro('Use "turbosync add" to integrate repositories first');
    return;
  }

  let targetName = name;

  if (!targetName) {
    const repoChoice = await p.select({
      message: "Select repository to remove:",
      options: repositories.map((repo) => ({
        value: repo.name,
        label: `${repo.name} (${repo.branch})`,
      })),
    });

    if (p.isCancel(repoChoice)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    targetName = repoChoice;
  }

  const repo = await getRepository(targetName);
  if (!repo) {
    p.cancel(chalk.red(`Repository '${targetName}' not found`));
    process.exit(1);
  }

  if (!options.force) {
    const shouldRemove = await p.confirm({
      message: `Remove ${repo.name}? This will delete the subtree and all local changes.`,
    });

    if (p.isCancel(shouldRemove) || !shouldRemove) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
  }

  try {
    const tasks = p.tasks([
      {
        title: "Removing git subtree",
        task: async () => {
          await removeSubtree(repo.directory);
          return "Git subtree removed";
        },
      },
      {
        title: "Removing symbolic link",
        task: async () => {
          const linkPath = join("packages", repo.name);
          try {
            unlinkSync(linkPath);
          } catch (error) {
            // Link might not exist, continue
          }
          return "Symbolic link removed";
        },
      },
      {
        title: "Updating workspace configuration",
        task: async () => {
          const linkPath = join("packages", repo.name);
          await removeFromWorkspaceConfig(linkPath);
          return "Workspace updated";
        },
      },
      {
        title: "Removing from configuration",
        task: async () => {
          await removeRepoFromConfig(repo.name);
          return "Configuration updated";
        },
      },
    ]);

    await tasks;

    p.outro(chalk.green(`✓ Successfully removed ${repo.name} from workspace`));
  } catch (error) {
    p.cancel(chalk.red(`Failed to remove repository: ${error}`));
    process.exit(1);
  }
}
