# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TurboSync is a CLI tool for integrating external repositories into Turborepo/monorepo workspaces using git subtrees. It manages external dependencies as subdirectories while maintaining git history and enabling updates.

## Build & Development Commands

**Build the project:**
```bash
bun run build
```
Compiles TypeScript to executable binary at `dist/turbosync` for darwin-x64.

**Type checking:**
```bash
bun run check-types
```
Runs TypeScript compiler in no-emit mode.

**Linting:**
```bash
bun run lint
```
Uses Biome for linting with auto-fix.

**Testing:**
```bash
bun test
```
Runs Bun's test runner (note: no tests exist yet in src/).

**Local development:**
```bash
bun run setup
# Or manually:
bun run build && bun link
```
Creates global symlink so `turbosync` command is available.

## Architecture

### Core Workflow
1. **Add**: Uses git subtree to pull external repo into workspace → creates package.json → creates symlink to packages/ → updates workspace config
2. **Update**: Pulls latest changes from external repo using git subtree pull
3. **Remove**: Removes subtree, symlink, and workspace config entry
4. **Config**: All state stored in `.turbosync.json` at workspace root

### Key Files

**Commands** (`src/commands/`):
- `add.ts` - Add external repositories with prompts for repo URL, branch, target directory
- `update.ts` - Update one or all integrated repositories  
- `remove.ts` - Remove repositories with cleanup
- `list.ts` - Show all integrated repos
- `status.ts` - Check health of integrated repos
- `init.ts` - Initialize TurboSync config

**Utils** (`src/utils/`):
- `git.ts` - Git subtree operations, remote validation, branch fetching
  - Handles GitHub subdirectory URLs (e.g., `github.com/owner/repo/tree/branch/path`)
  - Security: validates branch names, paths, only allows HTTPS
- `config.ts` - Load/save `.turbosync.json`, atomic writes with temp files
- `workspace.ts` - Create symlinks, update package.json workspaces, generate package names
- `validation.ts` - Path traversal protection, input sanitization, security validations
- `environment.ts` - Detect workspace type (turborepo/nx/generic), package manager, git status

**Types & Schemas** (`src/`):
- `types.ts` - TypeScript interfaces for config, repositories, options
- `schemas.ts` - Zod schemas for runtime validation, prevents prototype pollution

### Configuration Structure

`.turbosync.json`:
```json
{
  "repositories": [
    {
      "name": "repo-name",
      "url": "https://github.com/owner/repo.git",
      "branch": "main",
      "directory": "external/repo-name",
      "subtreePrefix": "external/repo-name",
      "lastUpdated": "ISO-8601",
      "packageName": "@external/repo-name",
      "subdirectory": "optional/path",
      "targetDirectory": "external",
      "linkToPackages": true
    }
  ],
  "defaultBranch": "main",
  "defaultDirectory": "external",
  "directories": ["external"],
  "linkToPackages": true,
  "packagesDirectory": "packages",
  "packageManager": "bun",
  "workspaceType": "turborepo"
}
```

### Security Features

- **Path validation**: Rejects absolute paths, path traversal (..), null bytes, hidden dirs
- **Branch validation**: Follows git naming rules, blocks injection attempts
- **Commit sanitization**: Removes control chars and newlines from git commit messages
- **URL validation**: Only HTTPS allowed, no git:// or other protocols
- **Atomic writes**: Temp files with rename for config updates
- **Input limits**: Max lengths on all user inputs

### Multi-Directory Support

The tool supports multiple target directories (configured via `init`):
- Default directory specified in config
- `add --target <dir>` to override default
- Each directory must be pre-configured in `directories` array
- Repositories remember which directory they belong to

### Optional Package Linking

Repositories can be added without linking to the packages directory:
- `add --no-link` skips symlink and workspace config update
- Repository stored only in target directory (e.g., `external/`)
- Useful for dependencies that shouldn't be part of workspace builds
- Per-repo `linkToPackages` flag in config

## Important Patterns

1. **All file operations are async** - Uses `fs-extra` with promises
2. **Path safety first** - Always validate with `validateSafePath()` before filesystem ops
3. **User prompts** - Uses `@clack/prompts` for interactive CLI
4. **Error handling** - Centralized via `handleError()` in validation.ts
5. **Zod validation** - Runtime validation on all config reads to prevent bad data
6. **Spinner feedback** - Use `p.spinner()` for long-running git operations
