import * as p from '@clack/prompts';
import chalk from 'chalk';
import type { ListOptions } from '../types.js';
import { getAllRepositories } from '../utils/config.js';

export async function listCommand(options: ListOptions = {}) {
  p.intro(chalk.cyan('📋 TurboSync List'));

  const repositories = getAllRepositories();

  if (repositories.length === 0) {
    p.log.warn('No repositories integrated');
    p.outro('Use "turbosync add" to integrate your first repository');
    return;
  }

  p.log.info(`Found ${repositories.length} integrated repositories:`);

  for (const repo of repositories) {
    const lastUpdated = new Date(repo.lastUpdated).toLocaleDateString();
    
    if (options.verbose) {
      p.log.step(chalk.bold(repo.name));
      p.log.message(`  URL: ${repo.url}`);
      p.log.message(`  Branch: ${repo.branch}`);
      p.log.message(`  Directory: ${repo.directory}`);
      p.log.message(`  Package: ${repo.packageName || 'N/A'}`);
      p.log.message(`  Last Updated: ${lastUpdated}`);
      console.log();
    } else {
      p.log.step(`${chalk.bold(repo.name)} (${repo.branch}) - ${lastUpdated}`);
    }
  }

  p.outro(
    `Total: ${repositories.length} repositories. Use --verbose for detailed information.`
  );
}