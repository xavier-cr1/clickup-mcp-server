# v0.8.4 Release Notes

### � Security Features

- **Comprehensive MCP Streamable HTTPS Transport Security Implementation**:
  - **HTTPS/TLS Support**: Added optional HTTPS server alongside HTTP for encrypted communication
    - Environment variables: `ENABLE_HTTPS`, `SSL_KEY_PATH`, `SSL_CERT_PATH`, `SSL_CA_PATH`, `HTTPS_PORT`
    - Dual protocol support: HTTP (3231) and HTTPS (3443) run simultaneously for backwards compatibility
    - Self-signed certificate generation script: `./scripts/generate-ssl-cert.sh`
    - Production-ready with CA-issued certificates
  - **Origin Header Validation**: Prevents cross-site attacks by validating Origin header against whitelist
    - Environment variable: `ENABLE_ORIGIN_VALIDATION=true`
    - Default allowed origins: `127.0.0.1:3231`, `localhost:3231`, plus HTTPS variants
    - Smart handling: Allows non-browser clients (n8n, MCP Inspector) while blocking unauthorized origins
  - **Rate Limiting Protection**: Protects against DoS attacks with configurable request limits
    - Environment variable: `ENABLE_RATE_LIMIT=true`
    - Default: 100 requests per minute per IP address
    - Configurable via: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`
  - **CORS Configuration**: Secure cross-origin resource sharing for web applications
    - Environment variable: `ENABLE_CORS=true`
    - Supports GET, POST, DELETE, OPTIONS methods
    - Headers: Content-Type, mcp-session-id, Authorization
  - **Security Headers**: Web security best practices when `ENABLE_SECURITY_FEATURES=true`
    - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
    - Referrer-Policy, Strict-Transport-Security (HTTPS only)
  - **Request Size Limits**: Prevents memory exhaustion attacks
    - Configurable limit: `MAX_REQUEST_SIZE=10mb` (default)
    - Hard limit: 50MB maximum
  - **Security Monitoring**: Comprehensive logging and health endpoint
    - Health endpoint: `/health` shows security status
    - Security event logging: origin validation, rate limits, violations
    - Log levels: DEBUG, INFO, WARN, ERROR for security events
  - **Zero Breaking Changes**: All security features are opt-in and disabled by default
    - Existing clients (Claude Desktop, n8n, MCP Inspector) work unchanged
    - No configuration changes required for current users
    - Backwards compatibility thoroughly tested and verified

### 🐛 Bug Fixes

- **Fixed Gemini compatibility (Issue #79)**:
  - **Root cause**: Priority enum values were defined as numbers `[1, 2, 3, 4, null]` but Gemini API expects strings
  - **Solution**: Updated priority enum to use string values `["1", "2", "3", "4", null]` in `update_task` and `update_bulk_tasks` tools
  - **Schema changes**: Changed type from `"number"` to `"string"` for priority field in affected tools
  - **Backward compatibility**: Maintained via existing `toTaskPriority()` function that handles string-to-number conversion
  - **Impact**: Resolves schema validation errors in Cursor IDE and other Gemini-based MCP clients
  - **Affected tools**: `update_task_ClickUp__Local_` and `update_bulk_tasks_ClickUp__Local_`
  - **Testing**: Verified priority setting and removal functionality works correctly

- **Fixed priority null handling in task updates (Issue #23)**:
  - Fixed `update_task` tool failing when setting priority to `null` to clear/remove priority
  - Modified `buildUpdateData` function to use `toTaskPriority` helper for proper null value conversion
  - Priority updates now work correctly for both setting valid values (1-4) and clearing priority (null)
  - Bulk task updates (`update_bulk_tasks`) already worked correctly and continue to function properly

- **Fixed subtasks not being retrieved (Issue #69)**:
  - Fixed `getSubtasks` method in `task-core.ts` to include required query parameters
  - Added `subtasks=true` and `include_subtasks=true` parameters to ClickUp API call
  - Subtasks are now properly retrieved and displayed when using `get_task` tool with `subtasks=true`
  - Resolves issue where subtasks arrays were always empty despite subtasks existing in ClickUp

### 🔧 Compatibility Improvements

- **Enhanced MCP Client Support**: Improved compatibility with Cursor IDE and Gemini-based MCP clients
- **Schema Standardization**: Aligned tool schemas with MCP protocol best practices for broader client support
- **Testing Coverage**: Verified functionality across multiple MCP client implementations
