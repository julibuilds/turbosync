import * as p from "@clack/prompts";
import { execa } from "execa";

export function parseRepositoryUrl(input: string): {
	url: string;
	name: string;
} {
	if (
		input.startsWith("http://") ||
		input.startsWith("https://") ||
		input.startsWith("git@")
	) {
		const url = input;
		const name = extractRepoName(url);
		return { url, name };
	}

	if (input.includes("/") && !input.includes(" ")) {
		const url = `https://github.com/${input}.git`;
		const name = input.split("/")[1]!;
		return { url, name };
	}

	throw new Error(
		"Invalid repository format. Use URL or GitHub shorthand (owner/repo)",
	);
}

function extractRepoName(url: string): string {
	const match = url.match(/\/([^/]+?)(?:\.git)?$/);
	return match?.[1] || "unknown";
}

export async function checkRemoteExists(url: string): Promise<boolean> {
	try {
		await execa("git", ["ls-remote", "--heads", url], { timeout: 10000 });
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
			.map((line) => line.split("refs/heads/")[1]!)
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
): Promise<void> {
	const s = p.spinner();
	try {
		s.start(`Adding subtree from ${url}`);

		await execa(
			"git",
			["subtree", "add", "--prefix", prefix, "--squash", url, branch],
			{ cwd },
		);

		s.stop("Subtree added successfully");
	} catch (error) {
		s.stop("Failed to add subtree");
		throw new Error(`Git subtree add failed: ${error}`);
	}
}

export async function updateSubtree(
	url: string,
	prefix: string,
	branch = "main",
	cwd = process.cwd(),
): Promise<void> {
	const s = p.spinner();
	try {
		s.start(`Updating subtree ${prefix}`);

		await execa(
			"git",
			["subtree", "pull", "--prefix", prefix, "--squash", url, branch],
			{ cwd },
		);

		s.stop("Subtree updated successfully");
	} catch (error) {
		s.stop("Failed to update subtree");
		throw new Error(`Git subtree pull failed: ${error}`);
	}
}

export async function removeSubtree(
	prefix: string,
	cwd = process.cwd(),
): Promise<void> {
	const s = p.spinner();
	try {
		s.start(`Removing subtree ${prefix}`);

		await execa("rm", ["-rf", prefix], { cwd });
		await execa("git", ["add", "."], { cwd });
		await execa("git", ["commit", "-m", `Remove subtree ${prefix}`], { cwd });

		s.stop("Subtree removed successfully");
	} catch (error) {
		s.stop("Failed to remove subtree");
		throw new Error(`Subtree removal failed: ${error}`);
	}
}
