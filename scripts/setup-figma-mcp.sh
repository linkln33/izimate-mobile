#!/bin/bash
# Setup script for Figma MCP Server
# This enables code-to-design workflow

echo "🚀 Setting up Figma MCP Server..."

# Clone the MCP server repository
if [ ! -d "figma-mcp-server" ]; then
  echo "📦 Cloning Figma MCP server..."
  git clone https://github.com/arinspunk/claude-talk-to-figma-mcp.git figma-mcp-server
  cd figma-mcp-server
  bun install
  bun run build
  cd ..
  echo "✅ MCP server cloned and built"
else
  echo "✅ MCP server already exists"
fi

echo ""
echo "📋 Next steps:"
echo "1. Open Figma Desktop app"
echo "2. Go to Menu → Plugins → Development → Import plugin from manifest"
echo "3. Select: figma-mcp-server/src/claude_mcp_plugin/manifest.json"
echo "4. Run: bun socket (in figma-mcp-server directory)"
echo "5. Open the plugin in Figma and copy the channel ID"
echo "6. Configure Cursor MCP (see .cursor/mcp.json)"
echo ""
echo "✅ Setup complete!"

