/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Server Transport Interface
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";

/**
 * Interface for server transport mechanisms.
 * This interface aligns with the Transport interface expected by the MCP SDK.
 */
export interface ServerTransport {
  /**
   * Start the transport
   */
  start(): Promise<void>;
  
  /**
   * Send a message through the transport
   * @param message The message to send
   */
  send(message: string): Promise<void>;
  
  /**
   * Close the transport
   */
  close(): Promise<void>;
} 