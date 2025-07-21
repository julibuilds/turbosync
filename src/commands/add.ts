import * as p from '@clack/prompts';
import chalk from 'chalk';
import { join } from 'path';
import type { AddOptions, Repository } from '../types.js';
import { validateEnvironment } from '../utils/environment.js';
import { parseRepositoryUrl, checkRemoteExists, getBranches, addSubtree } from '../utils/git.js';
import { addRepository, loadConfig } from '../utils/config.js';
import { createSymbolicLink, updateWorkspaceConfig, generatePackageName, createPackageJson } from '../utils/workspace.js';
import { handleError, isValidDirectoryName, isValidPackageName, sanitizeDirectoryName } from '../utils/validation.js';

export async function addCommand(repository?: string, options: AddOptions = {}) {
  p.intro(chalk.cyan('🚀 TurboSync Add'));

  const errors = await validateEnvironment();
  if (errors.length > 0) {
    p.cancel(chalk.red('Environment validation failed:'));
    for (const error of errors) {
      p.log.error(error);
    }
    process.exit(1);
  }

  const config = loadConfig();

  try {
    let repoUrl: string;
    let repoName: string;

    if (!repository) {
      const repoInput = await p.text({
        message: 'Repository URL or GitHub shorthand (owner/repo):',
        placeholder: 'facebook/react',
        validate: (value) => {
          if (!value) return 'Repository is required';
          try {
            parseRepositoryUrl(value);
            return;
          } catch {
            return 'Invalid repository format';
          }
        }
      });

      if (p.isCancel(repoInput)) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }

      const parsed = parseRepositoryUrl(repoInput);
      repoUrl = parsed.url;
      repoName = parsed.name;
    } else {
      const parsed = parseRepositoryUrl(repository);
      repoUrl = parsed.url;
      repoName = parsed.name;
    }

    if (options.dryRun) {
      p.log.info('🔍 Dry run mode - no changes will be made');
    }

    const s = p.spinner();
    s.start('Checking repository accessibility...');

    const isAccessible = await checkRemoteExists(repoUrl);
    if (!isAccessible) {
      s.stop('Repository check failed');
      p.cancel(chalk.red(`Repository not accessible: ${repoUrl}`));
      process.exit(1);
    }

    s.stop('Repository is accessible');

    let branch = options.branch || config.defaultBranch;
    if (!options.branch) {
      s.start('Fetching available branches...');
      const branches = await getBranches(repoUrl);
      s.stop(`Found ${branches.length} branches`);

      if (branches.length > 1) {
        const branchChoice = await p.select({
          message: 'Select branch to integrate:',
          options: branches.map(b => ({ value: b, label: b }))
        });

        if (p.isCancel(branchChoice)) {
          p.cancel('Operation cancelled');
          process.exit(0);
        }

        branch = branchChoice;
      } else if (branches.length === 1) {
        branch = branches[0];
      }
    }

    const directory = options.directory || join(config.defaultDirectory, repoName);
    const packageName = options.name || generatePackageName(repoName, directory);

    const existingRepo = config.repositories.find(r => r.name === repoName);
    if (existingRepo) {
      const shouldOverwrite = await p.confirm({
        message: `Repository ${repoName} already exists. Overwrite?`
      });

      if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
        p.cancel('Operation cancelled');
        process.exit(0);
      }
    }

    if (!options.dryRun) {
      const tasks = p.tasks([
        {
          title: 'Adding git subtree',
          task: async () => {
            await addSubtree(repoUrl, directory, branch);
            return 'Git subtree added';
          }
        },
        {
          title: 'Creating package.json',
          task: async () => {
            await createPackageJson(directory, packageName, repoUrl);
            return 'Package.json created';
          }
        },
        {
          title: 'Creating symbolic link',
          task: async () => {
            const linkPath = join('packages', repoName);
            await createSymbolicLink(directory, linkPath);
            return 'Symbolic link created';
          }
        },
        {
          title: 'Updating workspace configuration',
          task: async () => {
            await updateWorkspaceConfig(packageName, join('packages', repoName));
            return 'Workspace updated';
          }
        },
        {
          title: 'Saving configuration',
          task: async () => {
            const repo: Repository = {
              name: repoName,
              url: repoUrl,
              branch,
              directory,
              subtreePrefix: directory,
              lastUpdated: new Date().toISOString(),
              packageName
            };
            addRepository(repo);
            return 'Configuration saved';
          }
        }
      ]);

      await tasks;
    } else {
      p.log.info('📋 Would perform the following actions:');
      p.log.step(`Add git subtree: ${repoUrl} (${branch}) -> ${directory}`);
      p.log.step(`Create package.json: ${packageName}`);
      p.log.step(`Create symbolic link: ${directory} -> packages/${repoName}`);
      p.log.step(`Update workspace configuration`);
      p.log.step(`Save to .turbosync.json`);
    }

    p.outro(
      options.dryRun
        ? chalk.yellow('✓ Dry run completed - no changes made')
        : chalk.green(`✓ Successfully added ${repoName} to workspace!`)
    );

  } catch (error) {
    p.cancel(chalk.red(`Failed to add repository: ${error}`));
    process.exit(1);
  }
}