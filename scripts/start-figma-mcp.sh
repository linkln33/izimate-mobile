#!/bin/bash
# Start Figma MCP Server
# Run this before using Figma MCP in Cursor

export PATH="$HOME/.bun/bin:$PATH"

cd "$(dirname "$0")/../figma-mcp-server"

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  bun install
  bun run build
fi

echo "🚀 Starting Figma MCP WebSocket server..."
echo "📍 Server will run on http://localhost:3055"
echo ""
echo "Next steps:"
echo "1. Open Figma Desktop app"
echo "2. Open your design file"
echo "3. Run the 'Claude MCP Plugin' from Plugins menu"
echo "4. Copy the channel ID from the plugin"
echo "5. In Cursor, say: 'Talk to Figma, channel {channel-ID}'"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

bun socket

