# v0.8.0 Release Notes

## 🚀 Major New Feature: Server-Sent Events (SSE) Transport

We're excited to announce **SSE Transport Support** - a major enhancement that enables web-based integrations and expands the server's compatibility with modern workflow tools!

### ✨ What's New

**Dual Transport Architecture**
- Run both STDIO and SSE transports simultaneously
- Seamless integration with web applications and services
- Backward compatible - existing STDIO integrations continue to work

**SSE Server Capabilities**
- Real-time event streaming to web clients
- Multiple concurrent client connections
- Message queuing for disconnected clients
- RESTful endpoints for easy integration

**Enhanced Integration Support**
- **n8n Integration**: Direct workflow automation support
- **Web Applications**: Browser-based ClickUp management
- **Custom Clients**: Build your own SSE-powered integrations

### 🔧 Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `ENABLE_SSE` | Enable SSE transport | `false` |
| `SSE_PORT` | SSE server port | `3000` |
| `ENABLE_STDIO` | Enable STDIO transport | `true` |

### 🌐 SSE Endpoints

- **`/events`** - SSE connection for real-time events
- **`/request`** - POST endpoint for sending requests
- **`/health`** - Health check endpoint

### 🚀 Quick Start with SSE

```bash
# Enable SSE transport
ENABLE_SSE=true SSE_PORT=3000 npx @taazkareem/clickup-mcp-server \
  --env CLICKUP_API_KEY=your-key \
  --env CLICKUP_TEAM_ID=your-team-id
```

### 📚 Documentation & Examples

- Complete SSE transport guide: `docs/sse-transport.md`
- Example SSE client: `examples/sse-client.js`
- n8n integration instructions included

### 🔄 Migration Notes

**No breaking changes** - this is a purely additive feature:
- Existing STDIO integrations work unchanged
- SSE is disabled by default
- Enable only when needed for web integrations

## 📦 Dependencies

- Added `express` and `cors` for SSE server functionality
- All existing dependencies remain unchanged

## 🙏 Thank You

This release represents a significant step forward in making ClickUp MCP Server more accessible and integration-friendly. The SSE transport opens up new possibilities for workflow automation and web-based task management.

---

# Previous Release: v0.7.2 (2025-04-25)

## 🛠️ Bug Fixes

- Fixed time estimate support in task updates:
  - Removed redundant field-specific validation check in task update operations
  - Simplified validation to check only for the presence of update fields
  - Fixed "At least one field to update must be provided" error when using time_estimate
  - Added time string parsing for converting formats like "2h 30m" to minutes
  - Improved tool description for clear guidance on supported formats
  - Ensures compatibility with all fields defined in the UpdateTaskData type

## 🙏 Thank You

Special thanks to our contributors who reported and helped fix this issue:

- [@m-roberts](https://github.com/m-roberts) - Reporting and suggesting fix for the time estimate update issue

Your feedback helps make ClickUp MCP Server better for everyone!
