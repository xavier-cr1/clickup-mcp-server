#!/usr/bin/env node

/**
 * ClickUp MCP Server
 * 
 * This custom server implements the Model Context Protocol (MCP) specification to enable
 * AI applications to interact with ClickUp workspaces. It provides a standardized 
 * interface for managing tasks, lists, folders and other ClickUp entities using Natural Language.
 * 
 * Key Features:
 * - Complete task management (CRUD operations, moving, duplicating)
 * - Workspace organization (spaces, folders, lists)
 * - Bulk operations with concurrent processing
 * - Natural language date parsing
 * - File attachments support
 * - Name-based entity resolution
 * - Markdown formatting
 * - Built-in rate limiting
 * 
 * For full documentation and usage examples, please refer to the README.md file.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configureServer, server } from "./server.js";
import { clickUpServices } from "./services/shared.js";
import { info, error, debug, warn } from "./logger.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import config from "./config.js";

const execAsync = promisify(exec);

/**
 * Check if another instance of the server is already running
 * @returns Boolean indicating if this is the only instance
 */
async function checkSingleInstance(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`ps aux | grep "node.*clickup-mcp-server" | grep -v grep | wc -l`);
    const instanceCount = parseInt(stdout.trim(), 10);
    
    // If there's more than one instance (including this one), warn and exit
    if (instanceCount > 1) {
      error(`Multiple server instances detected (${instanceCount}). This may cause issues.`);
      info("Use 'pkill -9 -f clickup-mcp-server' to kill all instances before starting a new one.");
      return false;
    }
    
    return true;
  } catch (err) {
    error("Failed to check for other running instances", err);
    // Continue execution even if check fails
    return true;
  }
}

/**
 * Application entry point that configures and starts the MCP server.
 */
async function main() {
  try {
    info("Starting ClickUp MCP Server...");
    
    // Check if we're the only instance
    const isSingleInstance = await checkSingleInstance();
    if (!isSingleInstance) {
      warn("Continuing startup despite multiple instances detected");
    }
    
    // Log essential information about the environment
    info("Server environment", {
      pid: process.pid,
      node: process.version,
      os: process.platform,
      arch: process.arch
    });
    
    // Configure the server with all handlers
    info("Configuring server request handlers");
    await configureServer();
    
    // Connect using stdio transport
    info("Connecting to MCP stdio transport");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    info("Server startup complete - ready to handle requests");
  } catch (err) {
    error("Error during server startup", err);
    process.exit(1);
  }
}

main().catch((err) => {
  error("Unhandled server error", err);
  process.exit(1);
});

