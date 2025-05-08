/**
 * ClickUp MCP Server - SSE Client Example
 * 
 * This example demonstrates how to connect to the ClickUp MCP Server using the SSE transport.
 * You can use this as a reference for integrating with n8n or other systems that support SSE.
 * 
 * Usage:
 * 1. Start the ClickUp MCP Server with SSE enabled:
 *    ENABLE_SSE=true SSE_PORT=3000 node build/index.js
 * 
 * 2. Run this client:
 *    node examples/sse-client.js
 * 
 * Requirements:
 * - node-fetch: npm install node-fetch
 * - eventsource: npm install eventsource
 */

// Import required modules
const fetch = require('node-fetch');
const EventSource = require('eventsource');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const CLIENT_ID = `client-${Date.now()}`;

// Connect to SSE endpoint
console.log(`Connecting to SSE endpoint at ${SERVER_URL}/events`);
const eventSource = new EventSource(`${SERVER_URL}/events?clientId=${CLIENT_ID}`);

// Handle SSE connection open
eventSource.onopen = () => {
  console.log('Connection to SSE server established');
  
  // Example: Send a request to list tools
  sendRequest({
    jsonrpc: '2.0',
    method: 'tools/list',
    id: '1',
    params: {}
  });
};

// Handle SSE messages
eventSource.addEventListener('response', (event) => {
  const response = JSON.parse(event.data);
  console.log('Received response:', JSON.stringify(response, null, 2));
  
  // If this was the tools/list response, demonstrate using a tool
  if (response.id === '1' && response.result && response.result.tools) {
    console.log(`Server has ${response.result.tools.length} tools available`);
    
    // Example: Let's call the get_workspace_hierarchy tool
    sendRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: '2',
      params: {
        name: 'get_workspace_hierarchy',
        arguments: {}
      }
    });
  }
});

// Handle SSE errors
eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
};

/**
 * Send a request to the SSE server
 * @param {Object} request - The JSON-RPC request to send
 */
async function sendRequest(request) {
  try {
    console.log('Sending request:', JSON.stringify(request, null, 2));
    
    const response = await fetch(`${SERVER_URL}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        request: request
      })
    });
    
    const result = await response.json();
    console.log('Request acknowledged:', result);
  } catch (error) {
    console.error('Error sending request:', error);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Closing SSE connection');
  eventSource.close();
  process.exit(0);
}); 