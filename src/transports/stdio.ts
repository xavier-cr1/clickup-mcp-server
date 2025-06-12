/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * STDIO Server Transport
 */

import { StdioServerTransport as MCPStdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerTransport } from "./transport.js";
import { Logger } from "../logger.js";

const logger = new Logger('StdioTransport');

/**
 * Implementation of ServerTransport that uses standard input/output for communication
 */
export class StdioServerTransport implements ServerTransport {
  private transport: MCPStdioServerTransport;
  private server: Server | null = null;

  constructor(server?: Server) {
    this.transport = new MCPStdioServerTransport();
    this.server = server || null;
    logger.debug("StdioServerTransport initialized");
  }

  /**
   * Set the server instance
   * @param server The MCP server instance
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Start the transport
   */
  async start(): Promise<void> {
    logger.info("Starting STDIO transport");
    
    if (!this.server) {
      throw new Error("Server not set for STDIO transport");
    }
    
    // Use the native server.connect method with our transport
    return this.server.connect(this.transport);
  }

  /**
   * Send a message through the transport
   * @param message The message to send
   */
  async send(_message: string): Promise<void> {
    // The underlying StdioServerTransport handles sending messages automatically
    // This method is here for interface compatibility
    return Promise.resolve();
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    logger.info("Closing STDIO transport");
    // The underlying StdioServerTransport doesn't have a close method,
    // but we include it for interface consistency
    return Promise.resolve();
  }
} 