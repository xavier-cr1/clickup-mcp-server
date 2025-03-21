#!/usr/bin/env node

/**
 * ClickUp MCP Server - A Model Context Protocol server for ClickUp integration
 * 
 * This server enables AI applications to interact with ClickUp through a standardized protocol,
 * allowing AI assistants to manage tasks, lists, and folders in ClickUp workspaces.
 * 
 * Key capabilities include:
 * 
 * Task Management:
 * - Create, update, move and duplicate tasks with rich description support
 * - Find tasks by name with smart disambiguation
 * - Optimized bulk task operations with concurrent processing
 * - Comprehensive filtering and sorting options
 * 
 * Workspace Organization:
 * - Navigate and discover workspace structure with hierarchical views
 * - Create and manage lists and folders with proper nesting
 * - Smart name-based lookups that eliminate the need for IDs
 * - Support for priorities, statuses, and due dates
 * 
 * Technical Features:
 * - Full markdown support for rich text content
 * - Secure credential handling through configuration
 * - Comprehensive error reporting and validation
 * - Name-based entity resolution with fuzzy matching
 * 
 * This implementation follows the Model Context Protocol specification and
 * is designed to be used with AI assistants that support MCP.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configureServer, server } from "./server.js";
import { clickUpServices } from "./services/shared.js";
import { initializeWorkspaceTool } from "./tools/workspace.js";
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
    
    // Initialize tools with services
    info("Initializing workspace tools");
    initializeWorkspaceTool(clickUpServices);
    
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

