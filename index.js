#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { z } from 'zod';

const execAsync = promisify(exec);

// Path to log file
const LOG_FILE = path.join(os.homedir(), '.mcp-shell-commands.log');

// Function to write to log
async function logCommand(command, result, error = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    command: command,
    exitCode: error ? 1 : 0,
    stdout: result?.stdout || '',
    stderr: result?.stderr || error?.message || '',
    duration: result?.duration || 0
  };
  
  try {
    await fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

// Create MCP server
const mcpServer = new McpServer({
  name: 'mcp-shell-logger',
  version: '2.0.0',
});

// Register main tool for command execution
mcpServer.registerTool('execute_command', {
  description: 'Execute a shell command with optional output limiting and logging',
  inputSchema: {
    command: z.string().describe('The shell command to execute'),
    workingDirectory: z.string().optional().describe('Working directory for command execution'),
    maxOutput: z.number().optional().default(500).describe('Maximum characters to return (-1 for unlimited, 0 for no output, default: 500)'),
    enableLogging: z.boolean().optional().default(true).describe('Whether to save command and output to log file (default: true)'),
  },
}, async ({ command, workingDirectory, maxOutput, enableLogging }) => {
  const startTime = Date.now();
  
  try {
    const options = {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    };
    if (workingDirectory) {
      options.cwd = workingDirectory;
    }
    
    const result = await execAsync(command, options);
    const duration = Date.now() - startTime;
    
    // Log if enabled
    if (enableLogging) {
      await logCommand(command, { ...result, duration });
    }
    
    // Process output based on maxOutput
    let stdout = result.stdout;
    let stderr = result.stderr;
    let outputSize = stdout.length;
    let truncated = false;
    
    if (maxOutput !== -1) {
      if (stdout.length > maxOutput) {
        stdout = stdout.substring(0, maxOutput) + (maxOutput > 0 ? '\n... (output truncated)' : '');
        truncated = true;
      }
      
      if (stderr.length > maxOutput) {
        stderr = stderr.substring(0, maxOutput) + (maxOutput > 0 ? '\n... (error output truncated)' : '');
        truncated = true;
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Command executed successfully (${duration}ms)${truncated ? ` - Output: ${outputSize} chars (truncated to ${maxOutput})` : ''}:\n\nOutput:\n${stdout}\n${stderr ? `\nErrors:\n${stderr}` : ''}`,
        },
      ],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error if enabled
    if (enableLogging) {
      await logCommand(command, null, error);
    }
    
    // Process error output
    let stdout = error.stdout || '';
    let stderr = error.stderr || '';
    let outputSize = stdout.length + stderr.length;
    
    if (maxOutput !== -1) {
      if (stdout.length > maxOutput) {
        stdout = stdout.substring(0, maxOutput) + (maxOutput > 0 ? '\n... (output truncated)' : '');
      }
      
      if (stderr.length > maxOutput) {
        stderr = stderr.substring(0, maxOutput) + (maxOutput > 0 ? '\n... (error output truncated)' : '');
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Command failed (${duration}ms) - Total output: ${outputSize} chars:\n\nError: ${error.message}\n\nOutput:\n${stdout}\n\nError output:\n${stderr}`,
        },
      ],
    };
  }
});

// Register tool for viewing logs
mcpServer.registerTool('view_logs', {
  description: 'View recent command logs',
  inputSchema: {
    lines: z.number().default(10).describe('Number of recent log entries to show'),
  },
}, async ({ lines }) => {
  try {
    const logContent = await fs.readFile(LOG_FILE, 'utf-8');
    const logLines = logContent.trim().split('\n');
    const recentLogs = logLines.slice(-lines);
    
    const formattedLogs = recentLogs.map(line => {
      try {
        const entry = JSON.parse(line);
        return `[${entry.timestamp}] ${entry.command} (${entry.exitCode === 0 ? 'SUCCESS' : 'FAILED'}, ${entry.duration}ms)`;
      } catch {
        return line;
      }
    }).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `Recent command logs:\n\n${formattedLogs}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `No logs found or error reading logs: ${error.message}`,
        },
      ],
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('MCP Shell Logger Server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
