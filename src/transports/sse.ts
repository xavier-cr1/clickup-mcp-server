/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * SSE Server Transport
 */

import express from 'express';
import cors from 'cors';
import { Server as HTTPServer } from 'http';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ServerTransport } from "./transport.js";
import { Logger } from "../logger.js";
import config from "../config.js";

const logger = new Logger('SSETransport');

interface SSEServerTransportOptions {
  port?: number;
}

/**
 * Implementation of ServerTransport that uses Server-Sent Events (SSE) for communication
 */
export class SSEServerTransport implements ServerTransport {
  private app: express.Application;
  private httpServer: HTTPServer | null = null;
  private clients: Map<string, express.Response> = new Map();
  private server: Server | null = null;
  private port: number;
  private messageQueue: Map<string, any[]> = new Map();

  constructor(options: SSEServerTransportOptions = {}) {
    this.port = options.port || 3000;
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    
    // Set up endpoint for SSE connection
    this.app.get('/events', this.handleSSEConnection.bind(this));
    
    // Set up endpoint for receiving requests from clients
    this.app.post('/request', this.handleClientRequest.bind(this));
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).send({ status: 'ok' });
    });

    logger.debug("SSEServerTransport initialized");
  }

  /**
   * Set the server instance
   * @param server The MCP server instance
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Handle new SSE connections
   */
  private handleSSEConnection(req: express.Request, res: express.Response): void {
    const clientId = req.query.clientId as string || `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`New SSE connection from client: ${clientId}`);
    
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connection', clientId })}\n\n`);
    
    // Store client connection
    this.clients.set(clientId, res);
    
    // Send any queued messages for this client
    if (this.messageQueue.has(clientId)) {
      const messages = this.messageQueue.get(clientId) || [];
      for (const message of messages) {
        this.sendEventToClient(clientId, 'response', message);
      }
      this.messageQueue.delete(clientId);
    }
    
    // Handle client disconnect
    req.on('close', () => {
      logger.info(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });
  }

  /**
   * Handle incoming requests from clients
   */
  private async handleClientRequest(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { clientId, request } = req.body;
      
      if (!clientId || !request) {
        res.status(400).send({ error: 'Missing clientId or request data' });
        return;
      }
      
      logger.info(`Received request from client: ${clientId}`, { request });
      
      if (!this.server) {
        res.status(500).send({ error: 'Server not connected' });
        return;
      }
      
      // Acknowledge receipt of the request
      res.status(200).send({ status: 'ok' });
      
      try {
        // For simplicity, manually process the most common request types
        const response = await this.processRequest(request);
        
        // Send the response back to the client
        this.sendEventToClient(clientId, 'response', response);
      } catch (error) {
        // Send error response
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32000,
            message: `Server error: ${error instanceof Error ? error.message : String(error)}`
          }
        };
        
        this.sendEventToClient(clientId, 'response', errorResponse);
        logger.error('Error processing request', { error });
      }
    } catch (error) {
      logger.error('Error handling client request', { error });
      res.status(500).send({ error: 'Internal server error' });
    }
  }

  /**
   * Process a JSON-RPC request
   */
  private async processRequest(request: any): Promise<any> {
    if (!this.server) {
      throw new Error('Server not connected');
    }
    
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            server: {
              name: "clickup-mcp-server",
              version: "0.7.2"
            },
            capabilities: {
              tools: {},
              prompts: {},
              resources: {}
            }
          }
        };
        
      case 'tools/list':
        // Manually call the server method with the proper schema formatting
        const response = await (this.server as any)._handleRequest({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: request.params || {},
          id: request.id
        });
        return response;
        
      case 'tools/call':
        // Manually call the server method with the proper schema formatting
        return await (this.server as any)._handleRequest({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: request.params || {},
          id: request.id
        });
        
      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            prompts: []
          }
        };
        
      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            resources: []
          }
        };
        
      default:
        // Default processing
        logger.warn(`Unknown method: ${request.method}`);
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        };
    }
  }

  /**
   * Send an event to a specific client
   */
  private sendEventToClient(clientId: string, eventType: string, data: any): void {
    const client = this.clients.get(clientId);
    
    if (client) {
      client.write(`event: ${eventType}\n`);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } else {
      // Queue the message for when the client connects
      logger.warn(`Client not connected, queueing message for: ${clientId}`);
      if (!this.messageQueue.has(clientId)) {
        this.messageQueue.set(clientId, []);
      }
      this.messageQueue.get(clientId)?.push(data);
    }
  }

  /**
   * Start the transport
   */
  async start(): Promise<void> {
    if (!this.server) {
      throw new Error("Server not set for SSE transport");
    }
    
    // Start the HTTP server
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = this.app.listen(this.port, () => {
          logger.info(`SSE server transport listening on port ${this.port}`);
          resolve();
        });
      } catch (error) {
        logger.error('Failed to start SSE server', { error });
        reject(error);
      }
    });
  }

  /**
   * Send a message (no-op for SSE server as it's handled through the request handler)
   */
  async send(message: string): Promise<void> {
    // No direct implementation needed - messages are sent in response to client requests
    return Promise.resolve();
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    if (this.httpServer) {
      // Close all client connections
      for (const [clientId, response] of this.clients.entries()) {
        logger.info(`Closing connection to client: ${clientId}`);
        response.end();
      }
      
      this.clients.clear();
      
      // Close the HTTP server
      return new Promise((resolve, reject) => {
        if (this.httpServer) {
          this.httpServer.close((err) => {
            if (err) {
              logger.error('Error closing HTTP server', { error: err });
              reject(err);
            } else {
              logger.info('HTTP server closed');
              this.httpServer = null;
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    }
    
    return Promise.resolve();
  }
} 