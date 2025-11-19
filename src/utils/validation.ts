import { isAbsolute, relative, resolve } from "node:path";

/**
 * Validates that a user-provided path is safe and doesn't attempt path traversal
 * @param userPath - The path provided by the user
 * @param basePath - The base directory to validate against (defaults to cwd)
 * @returns Validation result with normalized path if valid
 */
export function validateSafePath(
  userPath: string,
  basePath: string = process.cwd()
): { isValid: boolean; error?: string; normalizedPath?: string } {
  // Reject empty paths
  if (!userPath || userPath.trim().length === 0) {
    return { isValid: false, error: "Path cannot be empty" };
  }

  // Reject absolute paths
  if (isAbsolute(userPath)) {
    return { isValid: false, error: "Absolute paths are not allowed" };
  }

  // Reject paths with null bytes (common attack vector)
  if (userPath.includes("\0")) {
    return { isValid: false, error: "Invalid characters in path" };
  }

  // Reject paths that are too long
  if (userPath.length > 255) {
    return { isValid: false, error: "Path exceeds maximum length" };
  }

  // Resolve and normalize the path
  const absolutePath = resolve(basePath, userPath);
  const relativePath = relative(basePath, absolutePath);

  // Check for path traversal - the relative path should not start with .. or be absolute
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return { isValid: false, error: "Path traversal detected" };
  }

  // Reject hidden directories (starting with .)
  const parts = relativePath.split("/");
  if (parts.some((part) => part.startsWith("."))) {
    return {
      isValid: false,
      error: "Hidden directories are not allowed",
    };
  }

  // Reject dangerous directory names
  const dangerousNames = ["node_modules", ".git", ".env"];
  if (parts.some((part) => dangerousNames.includes(part.toLowerCase()))) {
    return {
      isValid: false,
      error: "Access to protected directories is not allowed",
    };
  }

  return { isValid: true, normalizedPath: relativePath };
}

/**
 * Validates a git branch name according to git naming rules
 * @param branch - The branch name to validate
 * @returns true if the branch name is valid
 */
export function validateBranchName(branch: string): boolean {
  // Empty or too long
  if (!branch || branch.length === 0 || branch.length > 255) {
    return false;
  }

  // Git branch naming rules - patterns that are NOT allowed
  const invalidPatterns = [
    /\.\./, // No consecutive dots
    /^\/|\/$/, // No leading/trailing slashes
    /\/\//, // No consecutive slashes
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally checking for control characters for security
    /[\x00-\x1f\x7f]/, // No control characters
    /[~^:?*[\\]/, // No special git characters
    /@\{/, // No @{
    /\.lock$/, // Cannot end with .lock
    /^\./, // Cannot start with dot
    /\.$/, // Cannot end with dot
  ];

  return !invalidPatterns.some((pattern) => pattern.test(branch));
}

/**
 * Sanitizes a string for safe use in git commit messages
 * Removes newlines and control characters that could be used for injection
 * @param message - The message to sanitize
 * @returns Sanitized message
 */
export function sanitizeCommitMessage(message: string): string {
  if (!message || message.length === 0) {
    throw new Error("Commit message cannot be empty");
  }

  // Remove control characters and newlines
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally checking for control characters for security
  let sanitized = message.replace(/[\x00-\x1f\x7f]/g, " ");

  // Remove consecutive spaces
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // Limit length
  if (sanitized.length > 500) {
    sanitized = `${sanitized.substring(0, 497)}...`;
  }

  return sanitized;
}

/**
 * Validates input length to prevent DoS via extremely long inputs
 * @param input - The input to validate
 * @param maxLength - Maximum allowed length (default 1000)
 * @returns true if valid
 */
export function validateInputLength(input: string, maxLength = 1000): boolean {
  return input.length > 0 && input.length <= maxLength;
}

/**
 * Validates directory name format
 * @param name - Directory name to validate
 * @returns true if valid
 */
export function isValidDirectoryName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 255) {
    return false;
  }

  // Check for invalid characters
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally checking for control characters for security
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return false;
  }

  // Check for reserved names on Windows
  const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
  if (reservedNames.test(name)) {
    return false;
  }

  return true;
}

/**
 * Validates package name format
 * @param name - Package name to validate
 * @returns true if valid
 */
export function isValidPackageName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 214) {
    return false;
  }

  // Must start with @scope/ for scoped packages or lowercase letter
  const validFormat = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  if (!validFormat.test(name)) {
    return false;
  }

  return true;
}

/**
 * Sanitizes a directory name to be safe for filesystem
 * @param name - Directory name to sanitize
 * @returns Sanitized directory name
 */
export function sanitizeDirectoryName(name: string): string {
  // Replace invalid characters with hyphens
  let sanitized = name.replace(/[^a-zA-Z0-9-_.]/g, "-");

  // Remove leading/trailing hyphens and dots
  sanitized = sanitized.replace(/^[-_.]+|[-_.]+$/g, "");

  // Collapse multiple hyphens
  sanitized = sanitized.replace(/-+/g, "-");

  // Ensure lowercase for consistency
  sanitized = sanitized.toLowerCase();

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized || "external";
}

/**
 * Handles errors consistently across the application
 * @param error - The error to handle
 * @param context - Context message for the error
 */
export function handleError(error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : "Unknown error";

  // Log detailed error in debug mode
  if (process.env.DEBUG) {
    console.error("Full error:", error);
  }

  // Display user-friendly message
  console.error(`${context}: ${message}`);
  process.exit(1);
}
