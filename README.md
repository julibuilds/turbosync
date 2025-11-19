# TurboSync

A secure CLI tool for integrating external repositories into Turborepo workspaces using git subtrees.

## Features

- 🔒 **Security-First Design**: Built with comprehensive security measures including path validation, input sanitization, and protection against common vulnerabilities
- 🚀 **Easy Integration**: Simple commands to add, update, and manage external repositories
- 🌳 **Git Subtree**: Uses git subtree for clean integration without submodule complexity
- 🔄 **Workspace Management**: Automatically updates workspace configurations
- 📦 **Package Support**: Generates package.json for external dependencies
- ⚡ **Async Operations**: Non-blocking operations with proper timeout handling

## Security Features

This tool has been designed with security as a top priority:

- **Path Traversal Protection**: Validates all paths to prevent directory traversal attacks
- **Command Injection Prevention**: Sanitizes all inputs passed to shell commands
- **Input Validation**: Uses Zod schemas to validate all configuration data
- **HTTPS Only**: Only allows HTTPS URLs for repository cloning
- **Branch Name Validation**: Validates branch names against git naming rules
- **Atomic Operations**: Uses atomic file writes to prevent data corruption
- **Timeout Protection**: All git operations have timeouts to prevent hangs
- **Error Sanitization**: Prevents information disclosure in error messages

## Installation

```bash
bun install
bun run build
bun link
```

## Usage

### Initialize TurboSync in your workspace

```bash
turbosync init
```

### Add an external repository

```bash
# Using GitHub shorthand
turbosync add facebook/react

# Using full HTTPS URL
turbosync add https://github.com/vercel/next.js.git

# With options
turbosync add vercel/next.js -b canary -d packages/nextjs -n @external/nextjs
```

### List integrated repositories

```bash
# Simple list
turbosync list

# Detailed information
turbosync list --verbose
```

### Update repositories

```bash
# Update a specific repository
turbosync update react

# Update all repositories
turbosync update --all
```

### Remove a repository

```bash
turbosync remove react

# Force removal without confirmation
turbosync remove react --force
```

### Check repository health

```bash
turbosync status
```

## Command Reference

### `turbosync init`

Initializes TurboSync in the current workspace. Creates the configuration file.

### `turbosync add [repository] [options]`

Adds an external repository to your workspace.

**Arguments:**
- `repository`: Repository URL or GitHub shorthand (owner/repo)

**Options:**
- `-b, --branch <branch>`: Specify branch to integrate (default: main)
- `-d, --directory <dir>`: Target directory name (default: auto-generated)
- `-n, --name <name>`: Package name (default: auto-generated)
- `--dry-run`: Preview changes without executing

**Examples:**
```bash
turbosync add facebook/react
turbosync add https://github.com/facebook/react.git -b main
turbosync add react/react -d packages/react -n @external/react
```

### `turbosync list [options]`

Lists all integrated repositories.

**Options:**
- `-v, --verbose`: Show detailed information

### `turbosync update [name] [options]`

Updates integrated repositories to the latest version.

**Arguments:**
- `name`: Specific repository to update (optional)

**Options:**
- `--all`: Update all repositories
- `--dry-run`: Preview changes without executing

### `turbosync remove [name] [options]`

Removes an integrated repository.

**Arguments:**
- `name`: Repository name to remove (optional, prompts if not provided)

**Options:**
- `--force`: Force removal without confirmation

### `turbosync status`

Checks the health status of integrated repositories.

## Configuration

TurboSync stores its configuration in `.turbosync.json` at the root of your workspace.

**Example configuration:**
```json
{
  "repositories": [
    {
      "name": "react",
      "url": "https://github.com/facebook/react.git",
      "branch": "main",
      "directory": "external/react",
      "subtreePrefix": "external/react",
      "lastUpdated": "2025-01-15T10:30:00.000Z",
      "packageName": "@external/react"
    }
  ],
  "defaultBranch": "main",
  "defaultDirectory": "external",
  "packageManager": "bun",
  "workspaceType": "turborepo"
}
```

## Security Considerations

### Safe Repository URLs

Only HTTPS URLs are allowed for security reasons. SSH and git:// protocols are blocked.

✅ **Allowed:**
- `https://github.com/facebook/react.git`
- `facebook/react` (converted to HTTPS)

❌ **Blocked:**
- `git://github.com/facebook/react.git`
- `git@github.com:facebook/react.git`
- `ext::ssh example.com %S foo/repo` (malicious git URL)

### Path Safety

All directory paths are validated to prevent path traversal attacks:

✅ **Safe:**
- `external/react`
- `packages/my-lib`

❌ **Unsafe:**
- `../../etc/passwd`
- `/absolute/path`
- `.hidden/directory`

### Input Validation

All user inputs are validated and sanitized:
- Branch names must follow git naming rules
- Paths cannot escape the workspace directory
- Configuration data is validated with Zod schemas
- Commit messages are sanitized to prevent injection

## Development

### Build

```bash
bun run build
```

### Type Check

```bash
bun run check-types
```

### Lint

```bash
bun run lint
```

## Architecture

TurboSync uses:
- **Git Subtrees**: For clean repository integration
- **Zod**: For runtime schema validation
- **Async Operations**: All I/O operations are asynchronous
- **Atomic Writes**: Configuration changes use atomic file operations
- **Path Validation**: All paths validated before filesystem operations

## Troubleshooting

### "Invalid repository format" error

Make sure you're using either:
- GitHub shorthand: `owner/repo`
- Full HTTPS URL: `https://github.com/owner/repo.git`

### "Path traversal detected" error

Ensure your directory paths don't try to escape the workspace:
- ✅ Use relative paths: `external/mylib`
- ❌ Don't use `..` or absolute paths

### "Invalid branch name" error

Branch names must follow git naming conventions:
- No spaces or special characters like `~`, `^`, `:`, `?`, `*`
- Cannot start or end with `/`
- Cannot end with `.lock`

## Contributing

Please read [SECURITY.md](SECURITY.md) for information on reporting security vulnerabilities.

## License

Private - All rights reserved
