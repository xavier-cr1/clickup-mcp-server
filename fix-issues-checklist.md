# ClickUp MCP Server - Claude Desktop Troubleshooting Checklist

## Initial Diagnostics
- [ ] Check for multiple running instances of the server
  ```bash
  ps aux | grep clickup-mcp-server
  ```
- [ ] Verify the log file at `/Volumes/Code/Projects/MCP/clickup-mcp-server/build/server.log`
- [ ] Check Claude Desktop version compatibility with MCP server version

## Clean Server Restart
- [ ] Kill all existing server instances
  ```bash
  pkill -9 -f clickup-mcp-server
  ```
- [ ] Clear any temporary files or cached data
  ```bash
  rm -f /Volumes/Code/Projects/MCP/clickup-mcp-server/build/server.log
  ```
- [ ] Start a single clean instance of the server
- [ ] Verify only one instance is running after restart

## JSON Communication Issues
- [ ] Check for non-JSON content in the server's output stream
- [ ] Verify that log messages aren't being mixed with JSON responses
- [ ] Review recent code changes that might affect JSON formatting
- [ ] Validate all outgoing messages with a JSON linter

## API Method Resolution
- [ ] Verify the server correctly implements all methods being called
- [ ] Add proper handling for the `resources/list` method
- [ ] Ensure method registration is working correctly
- [ ] Check for protocol version mismatches between client and server

## Tool Description Optimization
- [ ] Audit all tool descriptions for excessive length
- [ ] Revise tool descriptions to be concise while maintaining clarity
- [ ] Prioritize essential information in descriptions
- [ ] Move detailed parameter explanations to appropriate sections
- [ ] Standardize description format across all tools
- [ ] Test token usage before and after optimization

## Client-Side Configuration
- [ ] Review Claude Desktop configuration
- [ ] Check for any client-side logging settings that might affect communication
- [ ] Verify client is properly handling JSON-RPC errors
- [ ] Ensure proper error handling for unsupported methods

## Advanced Troubleshooting
- [ ] Enable debug logging for more detailed diagnostics
- [ ] Capture a complete communication trace between client and server
- [ ] Analyze polling behavior and optimize if needed
- [ ] Check for any network or environment issues
- [ ] Review system resources (memory, CPU usage) during operation

## Post-Fix Verification
- [ ] Verify successful connection between Claude Desktop and MCP server
- [ ] Test basic functionality (listing tools, executing commands)
- [ ] Monitor for recurring error messages
- [ ] Check server logs for any remaining issues
- [ ] Verify tool descriptions display correctly in Claude Desktop 