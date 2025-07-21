#!/bin/bash

# TurboSync Development Installation Script

echo "🚀 Setting up TurboSync for development..."

# Build the project
echo "📦 Building TurboSync..."
pnpm run build || npm run build

# Make the CLI executable
echo "🔧 Making CLI executable..."
chmod +x dist/index.js

# Create a global symlink
if command -v npm >/dev/null 2>&1; then
    echo "🔗 Creating global symlink..."
    npm link
    echo "✅ TurboSync is now available globally as 'turbosync'"
    echo ""
    echo "Usage:"
    echo "  turbosync --help"
    echo "  turbosync init"
    echo "  turbosync add facebook/react"
else
    echo "⚠️  npm not found - skipping global installation"
    echo "✅ TurboSync built successfully!"
    echo ""
    echo "Usage:"
    echo "  ./dist/index.js --help"
    echo "  node dist/index.js init"
fi

echo ""
echo "🎉 Setup complete!"