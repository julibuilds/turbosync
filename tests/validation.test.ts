import { describe, test, expect } from "bun:test";
import {
	validateSafePath,
	validateBranchName,
	sanitizeCommitMessage,
	validateInputLength,
} from "../src/utils/validation";

describe("validateSafePath", () => {
	test("should accept safe relative paths", () => {
		const result = validateSafePath("external/react", "/test/workspace");
		expect(result.isValid).toBe(true);
		expect(result.normalizedPath).toBe("external/react");
	});

	test("should reject path traversal attempts", () => {
		const result = validateSafePath("../../etc/passwd", "/test/workspace");
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("traversal");
	});

	test("should reject absolute paths", () => {
		const result = validateSafePath("/etc/passwd", "/test/workspace");
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("Absolute paths");
	});

	test("should reject hidden directories", () => {
		const result = validateSafePath(".hidden/dir", "/test/workspace");
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("Hidden directories");
	});

	test("should reject null bytes", () => {
		const result = validateSafePath("test\0/path", "/test/workspace");
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("Invalid characters");
	});

	test("should reject paths that are too long", () => {
		const longPath = "a".repeat(300);
		const result = validateSafePath(longPath, "/test/workspace");
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("maximum length");
	});

	test("should reject protected directories", () => {
		const result = validateSafePath("node_modules/test", "/test/workspace");
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("protected directories");
	});
});

describe("validateBranchName", () => {
	test("should accept valid branch names", () => {
		expect(validateBranchName("main")).toBe(true);
		expect(validateBranchName("feature/new-feature")).toBe(true);
		expect(validateBranchName("hotfix-123")).toBe(true);
	});

	test("should reject empty branch names", () => {
		expect(validateBranchName("")).toBe(false);
	});

	test("should reject branch names that are too long", () => {
		const longName = "a".repeat(300);
		expect(validateBranchName(longName)).toBe(false);
	});

	test("should reject branch names with consecutive dots", () => {
		expect(validateBranchName("feature..bug")).toBe(false);
	});

	test("should reject branch names with leading/trailing slashes", () => {
		expect(validateBranchName("/feature")).toBe(false);
		expect(validateBranchName("feature/")).toBe(false);
	});

	test("should reject branch names with special characters", () => {
		expect(validateBranchName("feature~1")).toBe(false);
		expect(validateBranchName("feature^")).toBe(false);
		expect(validateBranchName("feature:test")).toBe(false);
		expect(validateBranchName("feature?")).toBe(false);
		expect(validateBranchName("feature*")).toBe(false);
	});

	test("should reject branch names ending with .lock", () => {
		expect(validateBranchName("feature.lock")).toBe(false);
	});

	test("should reject branch names starting with dot", () => {
		expect(validateBranchName(".feature")).toBe(false);
	});
});

describe("sanitizeCommitMessage", () => {
	test("should sanitize valid commit messages", () => {
		const message = "Add new feature";
		const result = sanitizeCommitMessage(message);
		expect(result).toBe("Add new feature");
	});

	test("should remove control characters", () => {
		const message = "Add\x00new\x1ffeature";
		const result = sanitizeCommitMessage(message);
		expect(result).toBe("Add new feature");
	});

	test("should remove newlines", () => {
		const message = "Add new\nfeature\r\ntest";
		const result = sanitizeCommitMessage(message);
		expect(result).toBe("Add new feature test");
	});

	test("should collapse consecutive spaces", () => {
		const message = "Add    new     feature";
		const result = sanitizeCommitMessage(message);
		expect(result).toBe("Add new feature");
	});

	test("should truncate long messages", () => {
		const message = "a".repeat(600);
		const result = sanitizeCommitMessage(message);
		expect(result.length).toBe(500);
		expect(result.endsWith("...")).toBe(true);
	});

	test("should throw on empty messages", () => {
		expect(() => sanitizeCommitMessage("")).toThrow("cannot be empty");
	});
});

describe("validateInputLength", () => {
	test("should accept valid length inputs", () => {
		expect(validateInputLength("test", 100)).toBe(true);
		expect(validateInputLength("a".repeat(50), 100)).toBe(true);
	});

	test("should reject empty inputs", () => {
		expect(validateInputLength("", 100)).toBe(false);
	});

	test("should reject inputs exceeding max length", () => {
		expect(validateInputLength("a".repeat(101), 100)).toBe(false);
	});

	test("should use default max length of 1000", () => {
		expect(validateInputLength("a".repeat(999))).toBe(true);
		expect(validateInputLength("a".repeat(1001))).toBe(false);
	});
});
