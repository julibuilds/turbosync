#!/bin/bash

# TurboSync Development Installation Script

echo "🚀 Setting up TurboSync for development..."

# Build the project
echo "📦 Building TurboSync..."
bun run build || bun run build

# Make the CLI executable
echo "🔧 Making CLI executable..."
chmod +x src/index.ts

# Create a global symlink
if command -v bun >/dev/null 2>&1; then
    echo "🔗 Creating global symlink..."
    bun link
    echo "✅ TurboSync is now available globally as 'turbosync'"
    echo ""
    echo "Usage:"
    echo "  turbosync --help"
    echo "  turbosync init"
    echo "  turbosync add facebook/react"
else
    echo "⚠️  bun not found - skipping global installation"
    echo "✅ TurboSync built successfully!"
    echo ""
    echo "Usage:"
    echo "  ./src/index.ts --help"
    echo "  bun src/index.ts init"
fi

echo ""
echo "🎉 Setup complete!"