# MCP Shell Logger

MCP server for executing shell commands with flexible output and logging settings.

## Description

This MCP server provides a universal tool for executing shell commands with control over output and logging. It is especially useful for working with commands that generate a large amount of output.

## Installation

```bash
npm install
```

## Usage

The server provides two tools:

### 1. execute_command
A universal command for executing shell commands with customizable output and logging.

**Parameters:**
- `command` (string) - the command to execute
- `workingDirectory` (string, optional) - the working directory for executing the command
- `maxOutput` (number, optional, default: 500) - the maximum number of characters for the output:
  - `-1` - unlimited output (use with caution!)
  - `0` - no output (only execution status)
  - `number > 0` - limit the output to the specified number of characters
- `enableLogging` (boolean, optional, default: true) - whether to save the command and result to a log file

**Usage Examples:**

```bash
# A regular command with default output (500 characters) and logging
execute_command("ls -la")

# A command with full output without limits
execute_command("cat small_file.txt", "/home/user", -1)

# Docker build without output and without logging
execute_command("docker build -t myapp .", "/project", 0, false)

# Installing packages with minimal output, without logging
execute_command("npm install", "/project", 100, false)

# A command with output redirected to a file (recommended for large outputs)
execute_command("find / -name '*.log' > /tmp/all_logs.txt 2>&1", "/", 0)
```

### 2. view_logs
Views the latest entries from the log file.

**Parameters:**
- `lines` (number, default: 10) - the number of recent entries to display

**Example:**
```bash
view_logs(20)
```

## Usage Recommendations

### Working with commands with large output

For commands that generate a large amount of data (logs, listings, builds), it is recommended to:

1.  **Redirect output to a file:**
    ```bash
    # Save output to a file
    execute_command("docker build -t myapp . > build.log 2>&1", "/project", 0)
    
    # Then read the necessary part
    execute_command("tail -n 50 build.log", "/project")
    ```

2.  **Use filtering:**
    ```bash
    # Instead of the full log
    execute_command("npm install", "/project", 100)
    
    # Better to filter for important information
    execute_command("npm install 2>&1 | grep -E '(error|warning|installed)'", "/project")
    ```

3.  **Use the maxOutput=0 parameter for long-running operations:**
    ```bash
    # Only the execution status
    execute_command("./long_running_script.sh", "/scripts", 0)
    ```

## Logging

Logs are saved to the `~/.mcp-shell-commands.log` file in JSON format. Each entry contains:
- timestamp - execution time
- command - the executed command
- exitCode - exit code (0 = success, 1 = error)
- stdout - standard output
- stderr - error output
- duration - execution time in milliseconds

Logging can be disabled for a specific command by setting `enableLogging: false`.

## Configuration in Claude Desktop

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "shell-logger": {
      "command": "node",
      "args": ["/path/to/mcp-shell-logger/index.js"]
    }
  }
}
```

## Versions

- v2.0.0 - Simplified interface with a single execute_command
- v1.1.0 - Added execute_command_no_log command
- v1.0.0 - Initial version
