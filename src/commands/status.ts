import * as p from "@clack/prompts";
import chalk from "chalk";
import * as fs from "fs-extra";

const { existsSync } = fs;

import { join } from "node:path";
import { getAllRepositories } from "../utils/config.js";
import { checkRemoteExists } from "../utils/git.js";

export async function statusCommand() {
  p.intro(chalk.cyan("📊 TurboSync Status"));

  const repositories = await getAllRepositories();

  if (repositories.length === 0) {
    p.log.warn("No repositories integrated");
    p.outro('Use "turbosync add" to integrate repositories');
    return;
  }

  p.log.info(`Checking ${repositories.length} repositories...`);

  let healthyCount = 0;
  let issueCount = 0;

  for (const repo of repositories) {
    const issues: string[] = [];

    const directoryExists = existsSync(join(process.cwd(), repo.directory));
    if (!directoryExists) {
      issues.push("Directory missing");
    }

    const linkPath = join(process.cwd(), "packages", repo.name);
    const linkExists = existsSync(linkPath);
    if (!linkExists) {
      issues.push("Symbolic link missing");
    }

    let remoteAccessible = false;
    try {
      remoteAccessible = await checkRemoteExists(repo.url);
      if (!remoteAccessible) {
        issues.push("Remote not accessible");
      }
    } catch {
      issues.push("Failed to check remote");
    }

    const lastUpdated = new Date(repo.lastUpdated);
    const daysSinceUpdate = Math.floor(
      (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (issues.length === 0) {
      healthyCount++;
      p.log.success(
        `✓ ${repo.name} - healthy (updated ${daysSinceUpdate} days ago)`
      );
    } else {
      issueCount++;
      p.log.error(`✗ ${repo.name} - ${issues.join(", ")}`);
    }
  }

  p.log.info("\nSummary:");
  p.log.step(`Healthy: ${healthyCount}`);
  p.log.step(`Issues: ${issueCount}`);

  if (issueCount > 0) {
    p.log.warn("\nTo fix issues:");
    p.log.step("turbosync update - Update repositories");
    p.log.step(
      "turbosync remove <name> && turbosync add <repo> - Reinstall problematic repos"
    );
  }

  p.outro(
    issueCount === 0
      ? chalk.green("✓ All repositories are healthy")
      : chalk.yellow(`⚠️ ${issueCount} repositories have issues`)
  );
}
