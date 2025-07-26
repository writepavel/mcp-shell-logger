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

// Путь к файлу логов
const LOG_FILE = path.join(os.homedir(), '.mcp-shell-commands.log');

// Функция для записи в лог
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

// Создаем MCP сервер
const mcpServer = new McpServer({
  name: 'mcp-shell-logger',
  version: '1.0.0',
});

// Регистрируем инструмент для выполнения команд
mcpServer.registerTool('execute_command', {
  description: 'Execute a shell command and log the result',
  inputSchema: {
    command: z.string().describe('The shell command to execute'),
    workingDirectory: z.string().optional().describe('Working directory for command execution'),
  },
}, async ({ command, workingDirectory }) => {
  const startTime = Date.now();
  
  try {
    const options = {};
    if (workingDirectory) {
      options.cwd = workingDirectory;
    }
    
    const result = await execAsync(command, options);
    const duration = Date.now() - startTime;
    
    await logCommand(command, { ...result, duration });
    
    return {
      content: [
        {
          type: 'text',
          text: `Command executed successfully:\n\nOutput:\n${result.stdout}\n${result.stderr ? `\nErrors:\n${result.stderr}` : ''}`,
        },
      ],
    };
  } catch (error) {
    await logCommand(command, null, error);
    
    return {
      content: [
        {
          type: 'text',
          text: `Command failed:\n\nError: ${error.message}\n\nOutput:\n${error.stdout || ''}\n\nError output:\n${error.stderr || ''}`,
        },
      ],
    };
  }
});

// Регистрируем инструмент для просмотра логов
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

// Запускаем сервер
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('MCP Shell Logger Server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
