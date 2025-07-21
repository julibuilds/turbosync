# TurboSync

🚀 A CLI tool for integrating external repositories into TurboRepo workspaces using git subtrees and symbolic links, making library source code visible to AI tools while maintaining clean separation and update capabilities.

## Features

- **AI Tool Optimization**: Makes library source code accessible to AI coding assistants
- **Zero Manual Setup**: Automates complex git subtree and workspace configuration  
- **Clean Integration**: Maintains separation between external code and project code
- **Easy Updates**: Streamlined process for pulling upstream changes
- **Environment Aware**: Intelligently adapts to different workspace configurations

## Installation

### For Development
```bash
# Clone and setup (includes global installation)
git clone <repository-url>
cd turbosync
npm install
npm run setup

# Or just install globally
npm run install-global
```

### For Production
```bash
# Global installation (when published)
npm install -g turbosync

# Or use with npx
npx turbosync --help
```

## Quick Start

1. **Initialize TurboSync in your workspace:**
   ```bash
   turbosync init
   ```

2. **Add an external repository:**
   ```bash
   # Using GitHub shorthand
   turbosync add facebook/react
   
   # Using full URL
   turbosync add https://github.com/vercel/next.js.git
   
   # With options
   turbosync add facebook/react --branch main --directory external/react
   ```

3. **List integrated repositories:**
   ```bash
   turbosync list --verbose
   ```

4. **Update repositories:**
   ```bash
   # Update all
   turbosync update --all
   
   # Update specific repository
   turbosync update react
   ```

## Commands

### `turbosync init`
Initialize TurboSync in your workspace. Detects environment and creates configuration.

### `turbosync add <repository> [options]`
Add an external repository to your workspace.

**Arguments:**
- `repository` - Repository URL or GitHub shorthand (owner/repo)

**Options:**
- `-b, --branch <branch>` - Specify branch to integrate
- `-d, --directory <dir>` - Target directory name  
- `-n, --name <name>` - Package name
- `--dry-run` - Preview changes without executing

**Examples:**
```bash
turbosync add facebook/react
turbosync add vercel/next.js --branch canary --directory external/nextjs
turbosync add https://github.com/microsoft/typescript.git --dry-run
```

### `turbosync list [options]`
List all integrated repositories.

**Options:**
- `-v, --verbose` - Show detailed information

### `turbosync remove <name> [options]`
Remove an integrated repository.

**Arguments:**
- `name` - Repository name to remove

**Options:**
- `--force` - Force removal without confirmation

### `turbosync update [name] [options]`
Update integrated repositories.

**Arguments:**
- `name` - Specific repository to update (optional)

**Options:**
- `--all` - Update all repositories
- `--dry-run` - Preview changes without executing

### `turbosync status`
Check health status of integrated repositories. Shows:
- Directory existence
- Symbolic link status
- Remote accessibility
- Last update time

## Configuration

TurboSync stores configuration in `.turbosync.json` in your workspace root:

```json
{
  "repositories": [
    {
      "name": "react",
      "url": "https://github.com/facebook/react.git",
      "branch": "main",
      "directory": "external/react",
      "subtreePrefix": "external/react",
      "lastUpdated": "2024-01-15T10:30:00.000Z",
      "packageName": "@external/react"
    }
  ],
  "defaultBranch": "main",
  "defaultDirectory": "external",
  "packageManager": "pnpm",
  "workspaceType": "turborepo"
}
```

## How It Works

1. **Git Subtree Integration**: Uses `git subtree add` to integrate external repositories as subdirectories
2. **Symbolic Links**: Creates symbolic links in your packages directory for workspace visibility
3. **Package.json Updates**: Automatically updates workspace configuration
4. **AI Tool Compatibility**: Source code becomes available for AI tools to analyze and understand

## Requirements

- Node.js 18+ (LTS)
- Git 2.25+
- TurboRepo, Nx, or package.json workspaces
- Clean git working directory

## Supported Environments

- **Workspace Types**: TurboRepo (primary), Nx, Generic monorepos
- **Package Managers**: pnpm, npm, yarn
- **Platforms**: macOS, Linux, Windows
- **Repositories**: Public and private Git repositories

## Troubleshooting

### Common Issues

**TurboSync command not found or permission denied**
- Run `npm run build` and `chmod +x dist/index.js`  
- Or use the setup script: `npm run setup`
- For global installation: `npm link` (in the project directory)

**"Repository not accessible"**
- Check if the repository URL is correct
- Ensure you have access to private repositories
- Verify your git credentials

**"Git repository has uncommitted changes"**
- Commit or stash your changes before running TurboSync commands
- This only applies to `add`, `update`, and `remove` commands, not `init`

**"No supported workspace configuration found"**  
- Ensure you have a `turbo.json`, `nx.json`, or `package.json` with workspaces
- This is only a warning during `init` - TurboSync will still work

**Init command hangs or shows "Working tree clean: no"**
- Make sure you're in the correct workspace directory
- Commit any pending changes first
- The `init` command is more lenient than other commands

### Getting Help

```bash
# View all commands
turbosync --help

# View command-specific help
turbosync add --help
turbosync update --help
```

## Development

```bash
# Clone repository
git clone https://github.com/your-org/turbosync.git
cd turbosync

# Install dependencies  
pnpm install

# Build project
pnpm build

# Run locally
node dist/index.js --help
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request