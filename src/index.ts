#!/usr/bin/env node

/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
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
 * - Multiple transport options (STDIO, SSE)
 * 
 * For full documentation and usage examples, please refer to the README.md file.
 */

import { configureServer, server } from "./server.js";
import { clickUpServices } from "./services/shared.js";
import { info, error } from "./logger.js";
import config from "./config.js";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport, SSEServerTransport } from "./transports/index.js";

// Get directory name for module paths
const __dirname = dirname(fileURLToPath(import.meta.url));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  error("Uncaught Exception", { message: err.message, stack: err.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  error("Unhandled Rejection", { reason });
  process.exit(1);
});

/**
 * Application entry point that configures and starts the MCP server.
 */
async function main() {
  try {
    info("Starting ClickUp MCP Server...");
    
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
    
    const connectedTransports = [];
    
    // Connect using stdio transport if enabled
    if (config.enableStdio) {
      info("Initializing STDIO transport");
      const stdioTransport = new StdioServerTransport();
      stdioTransport.setServer(server);
      info("Starting STDIO transport");
      await stdioTransport.start();
      connectedTransports.push("STDIO");
    }
    
    // Connect using SSE transport if enabled
    if (config.enableSSE) {
      info("Initializing SSE transport");
      const sseTransport = new SSEServerTransport({ port: config.ssePort });
      sseTransport.setServer(server);
      info(`Starting SSE transport on port ${config.ssePort}`);
      await sseTransport.start();
      connectedTransports.push(`SSE (port ${config.ssePort})`);
    }
    
    // Ensure at least one transport is connected
    if (connectedTransports.length === 0) {
      error("No transports enabled. Set ENABLE_STDIO=true or ENABLE_SSE=true");
      process.exit(1);
    }
    
    info(`Server startup complete - connected transports: ${connectedTransports.join(", ")}`);
  } catch (err) {
    error("Error during server startup", { message: err.message, stack: err.stack });
    process.exit(1);
  }
}

main().catch((err) => {
  error("Unhandled server error", { message: err.message, stack: err.stack });
  process.exit(1);
});

