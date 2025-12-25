#!/bin/bash
# Verify Figma MCP Setup

export PATH="$HOME/.bun/bin:$PATH"

echo "🔍 Verifying Figma MCP Setup..."
echo ""

# Check Bun
if command -v bun &> /dev/null; then
  echo "✅ Bun installed: $(bun --version)"
else
  echo "❌ Bun not found. Please install: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

# Check MCP server
if [ -d "figma-mcp-server" ]; then
  echo "✅ MCP server directory exists"
  if [ -f "figma-mcp-server/dist/socket.js" ]; then
    echo "✅ MCP server built"
  else
    echo "⚠️  MCP server not built. Run: cd figma-mcp-server && bun install && bun run build"
  fi
else
  echo "❌ MCP server directory not found"
fi

# Check plugin manifest
if [ -f "figma-mcp-server/src/claude_mcp_plugin/manifest.json" ]; then
  echo "✅ Plugin manifest exists"
else
  echo "❌ Plugin manifest not found"
fi

# Check design tokens
if [ -f "figma-design-tokens.json" ]; then
  TOKEN_COUNT=$(cat figma-design-tokens.json | grep -c '"name"')
  echo "✅ Design tokens exported ($TOKEN_COUNT tokens)"
else
  echo "⚠️  Design tokens not exported. Run: npm run figma:export-tokens"
fi

# Check server status
if curl -s http://localhost:3055/status > /dev/null 2>&1; then
  echo "✅ MCP server is running on port 3055"
else
  echo "⚠️  MCP server not running. Start with: npm run figma:mcp:start"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Open Figma Desktop"
echo "2. Menu → Plugins → Development → Import plugin from manifest"
echo "3. Select: $(pwd)/figma-mcp-server/src/claude_mcp_plugin/manifest.json"
echo "4. Start server: npm run figma:mcp:start"
echo "5. Open plugin in Figma and copy channel ID"
echo "6. In Cursor: 'Talk to Figma, channel {channel-id}'"
