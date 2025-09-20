#!/usr/bin/env node

import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { removeCommand } from "./commands/remove.js";
import { statusCommand } from "./commands/status.js";
import { updateCommand } from "./commands/update.js";
import { handleError } from "./utils/validation.js";

const program = new Command();

program
	.name("turbosync")
	.description(
		"CLI tool for integrating external repositories into TurboRepo workspaces",
	)
	.version("1.0.0")
	.addHelpText(
		"after",
		`
Examples:
  $ turbosync init                    # Initialize in workspace
  $ turbosync add facebook/react      # Add React repository  
  $ turbosync add vercel/next.js -b canary
  $ turbosync list --verbose         # Show detailed info
  $ turbosync update --all           # Update all repositories
  $ turbosync status                 # Check repository health
`,
	);

program
	.command("add")
	.description("Add an external repository to your workspace")
	.argument("[repository]", "Repository URL or GitHub shorthand (owner/repo)")
	.option("-b, --branch <branch>", "Specify branch to integrate")
	.option("-d, --directory <dir>", "Target directory name")
	.option("-n, --name <name>", "Package name")
	.option("--dry-run", "Preview changes without executing")
	.action(async (...args) => {
		try {
			await addCommand(...args);
		} catch (error) {
			handleError(error, "Add command failed");
		}
	});

program
	.command("list")
	.description("List all integrated repositories")
	.option("-v, --verbose", "Show detailed information")
	.action(async (...args) => {
		try {
			await listCommand(...args);
		} catch (error) {
			handleError(error, "List command failed");
		}
	});

program
	.command("remove")
	.description("Remove an integrated repository")
	.argument("[name]", "Repository name to remove")
	.option("--force", "Force removal without confirmation")
	.action(async (...args) => {
		try {
			await removeCommand(...args);
		} catch (error) {
			handleError(error, "Remove command failed");
		}
	});

program
	.command("update")
	.description("Update integrated repositories")
	.argument("[name]", "Specific repository to update (optional)")
	.option("--all", "Update all repositories")
	.option("--dry-run", "Preview changes without executing")
	.action(async (...args) => {
		try {
			await updateCommand(...args);
		} catch (error) {
			handleError(error, "Update command failed");
		}
	});

program
	.command("init")
	.description("Initialize TurboSync in current workspace")
	.action(async () => {
		try {
			await initCommand();
		} catch (error) {
			handleError(error, "Init command failed");
		}
	});

program
	.command("status")
	.description("Check health status of integrated repositories")
	.action(async () => {
		try {
			await statusCommand();
		} catch (error) {
			handleError(error, "Status command failed");
		}
	});

program.parse();
