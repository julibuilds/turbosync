import * as p from "@clack/prompts";
import chalk from "chalk";

export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

export function isValidGitHubShorthand(input: string): boolean {
	return /^[\w.-]+\/[\w.-]+$/.test(input);
}

export function isValidDirectoryName(name: string): boolean {
	return /^[a-zA-Z0-9._-]+$/.test(name) && !name.startsWith(".");
}

export function isValidPackageName(name: string): boolean {
	return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

export function handleError(error: unknown, context: string): never {
	const message = error instanceof Error ? error.message : String(error);
	p.cancel(chalk.red(`${context}: ${message}`));
	process.exit(1);
}

export function validateRequired<T>(
	value: T | undefined | null,
	fieldName: string,
): T {
	if (value === undefined || value === null) {
		throw new Error(`${fieldName} is required`);
	}
	return value;
}

export function sanitizeDirectoryName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

export function sanitizePackageName(name: string): string {
	const sanitized = name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	return sanitized.startsWith("@") ? sanitized : `@external/${sanitized}`;
}
