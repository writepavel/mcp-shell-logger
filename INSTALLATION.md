# Local Installation Guide

## For Claude Desktop Users

### Option 1: Install from npm (Recommended)

1. Install globally:
```bash
npm install -g @writepavel/mcp-shell-logger
```

2. Add to Claude Desktop configuration:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-shell-logger": {
      "command": "mcp-shell-logger"
    }
  }
}
```

### Option 2: Install from source

1. Clone the repository:
```bash
git clone https://github.com/writepavel/mcp-shell-logger.git
cd mcp-shell-logger
npm install
```

2. Add to Claude Desktop configuration:
```json
{
  "mcpServers": {
    "mcp-shell-logger": {
      "command": "node",
      "args": ["/path/to/mcp-shell-logger/index.js"]
    }
  }
}
```

## For Other MCP Clients

The server communicates via stdio, so you can integrate it with any MCP client:

```bash
# Run directly
npx @writepavel/mcp-shell-logger

# Or if installed globally
mcp-shell-logger
```

## Configuration

The server accepts the following environment variables:
- `LOG_LEVEL`: Set logging level (debug, info, warn, error)
- `MAX_OUTPUT_SIZE`: Default maximum output size for commands

## Verification

After installation, restart Claude Desktop and look for "mcp-shell-logger" in the MCP servers list.