import * as p from "@clack/prompts";
import chalk from "chalk";
import type { UpdateOptions } from "../types.js";
import {
  addRepository,
  getAllRepositories,
  getRepository,
} from "../utils/config.js";
import { getBranches, updateSubtree } from "../utils/git.js";

export async function updateCommand(
  name?: string,
  options: UpdateOptions = {},
) {
  p.intro(chalk.cyan("🔄 TurboSync Update"));

  const repositories = await getAllRepositories();

  if (repositories.length === 0) {
    p.log.warn("No repositories to update");
    p.outro('Use "turbosync add" to integrate repositories first');
    return;
  }

  let targetRepos = repositories;

  if (name && !options.all) {
    const repo = await getRepository(name);
    if (!repo) {
      p.cancel(chalk.red(`Repository '${name}' not found`));
      process.exit(1);
    }
    targetRepos = [repo];
  } else if (!options.all && !name) {
    const repoChoices = await p.multiselect({
      message: "Select repositories to update:",
      options: repositories.map((repo) => ({
        value: repo.name,
        label: `${repo.name} (${repo.branch})`,
      })),
      required: true,
    });

    if (p.isCancel(repoChoices)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    targetRepos = repositories.filter((repo) =>
      repoChoices.includes(repo.name),
    );
  }

  if (options.dryRun) {
    p.log.info("🔍 Dry run mode - no changes will be made");
    p.log.info("📋 Would update the following repositories:");
    for (const repo of targetRepos) {
      p.log.step(`${repo.name} (${repo.branch})`);
    }
    p.outro(chalk.yellow("✓ Dry run completed - no changes made"));
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const repo of targetRepos) {
    try {
      const s = p.spinner();
      s.start(`Updating ${repo.name}...`);

      await updateSubtree(repo.url, repo.subtreePrefix, repo.branch);

      repo.lastUpdated = new Date().toISOString();
      await addRepository(repo);

      s.stop(`✓ Updated ${repo.name}`);
      successCount++;
    } catch (error) {
      p.log.error(`✗ Failed to update ${repo.name}: ${error}`);
      failureCount++;
    }
  }

  if (failureCount === 0) {
    p.outro(chalk.green(`✓ Successfully updated ${successCount} repositories`));
  } else {
    p.outro(
      chalk.yellow(
        `⚠️ Updated ${successCount} repositories, ${failureCount} failed`,
      ),
    );
  }
}
