# v0.8.2 Release Notes

## 🎯 Critical Bug Fixes & Enhanced Functionality

**v0.8.2** is a significant patch release that fixes critical task assignment functionality and enhances workspace task visibility. This release resolves major issues that were preventing users from properly assigning tasks and accessing subtasks.

## 🛠️ Major Bug Fixes

### **Fixed Task Assignment Feature Not Working (Issue #48)**
- **Issue**: Task assignees were not being properly assigned despite successful API responses
- **Root Cause**: Missing assignee resolution logic in task creation and update handlers
- **Solution**: Added comprehensive assignee resolution supporting multiple input formats:
  - **Numeric user IDs** (e.g., `96055451`)
  - **Email addresses** (e.g., `"user@example.com"`)
  - **Usernames** (e.g., `"John Doe"`)
  - **Mixed format arrays** (e.g., `[96055451, "user@example.com"]`)

### **Enhanced Task Handlers with Automatic Assignee Resolution**
- **`create_task`** - Now resolves assignees before task creation
- **`update_task`** - Now resolves assignees during task updates
- **`create_bulk_tasks`** - Now resolves assignees for each task in bulk operations
- **Smart deduplication** for duplicate assignees in mixed format requests
- **Graceful error handling** for unresolvable assignees (continues with resolved ones)

### **Fixed Task Due Date Updates Not Working (Issue #49)**
- **Issue**: `update_task` returned success but didn't actually update due dates
- **Root Cause**: `updateTaskHandler` was not calling `buildUpdateData()` to parse date strings into timestamps
- **Enhanced natural language date parsing** to support complex formats:
  - Day names: "Monday", "Friday", "Saturday", etc.
  - Time parsing: "Monday at 3pm EST", "Friday at 2:30pm", etc.
  - "Next" prefix handling: "next Friday", "next Monday", etc.
  - Improved fallback parsing with multiple strategies and validation

### **Fixed Subtask Visibility in Workspace Tasks (Issue #56)**
- **Issue**: Users couldn't see subtasks through workspace-wide queries
- **Solution**: Added missing `subtasks` parameter to `get_workspace_tasks` tool
- **Enhanced parameters**: Added `include_subtasks`, `include_compact_time_entries`, and `custom_fields` for completeness
- **Clarified behavior**: Subtasks must still match other filter criteria (tags, lists, etc.) to appear in results
- **Alternative**: Use `get_task` tool with `subtasks=true` to see all subtasks regardless of filters

## 🎯 Impact & Benefits

### **Task Assignment Now Fully Functional**
- ✅ **All documented assignee formats work correctly**: User IDs, emails, usernames, and mixed arrays
- ✅ **Seamless integration**: Works across create, update, and bulk operations
- ✅ **Smart resolution**: Automatically converts emails/usernames to user IDs
- ✅ **Error resilience**: Continues with resolved assignees even if some fail

### **Enhanced Date Handling**
- ✅ **Natural language support**: "tomorrow", "Monday at 3pm EST", "next Friday"
- ✅ **Multiple formats**: Unix timestamps, "MM/DD/YYYY", relative times like "2 hours from now"
- ✅ **Reliable updates**: Due date changes now persist correctly

### **Improved Workspace Visibility**
- ✅ **Subtask access**: View subtasks through workspace-wide queries when they match criteria
- ✅ **Enhanced filtering**: More comprehensive parameter support for workspace tasks
- ✅ **Clear documentation**: Better understanding of how subtask filtering works

## 🧪 Testing & Validation

This release underwent comprehensive testing with real ClickUp API integration:
- ✅ **Task assignment with user IDs** - Direct numeric user ID assignment
- ✅ **Task assignment with emails** - Email address resolved to user ID
- ✅ **Task assignment with usernames** - Username resolved to user ID
- ✅ **Task updates with assignees** - Existing task updated with assignee via email
- ✅ **Bulk task creation** - Multiple tasks created with different assignee formats
- ✅ **Mixed format assignment** - User ID and email in same request (properly deduplicated)

## 🔗 Issues Resolved

- **#48**: [Task Assignment Feature Not Working through ClickUp MCP Integration API](https://github.com/taazkareem/clickup-mcp-server/issues/48)
- **#49**: [update_task not updating due dates](https://github.com/taazkareem/clickup-mcp-server/issues/49)
- **#56**: [Can't see sub-tasks](https://github.com/taazkareem/clickup-mcp-server/issues/56)

## 🚀 Quick Start

No configuration changes required - all fixes are automatically available:

```bash
# STDIO Transport (Default)
npx @taazkareem/clickup-mcp-server \
  --env CLICKUP_API_KEY=your-key \
  --env CLICKUP_TEAM_ID=your-team-id

# HTTP Streamable Transport
ENABLE_SSE=true PORT=3231 npx @taazkareem/clickup-mcp-server \
  --env CLICKUP_API_KEY=your-key \
  --env CLICKUP_TEAM_ID=your-team-id
```

## 🔄 Migration Notes

**✅ Zero Breaking Changes**
- All existing integrations continue to work unchanged
- Enhanced functionality is automatically available
- No configuration changes required
- All existing tools preserved and enhanced

## 🙏 Thank You

Special thanks to our community for reporting these critical issues:
- Issue reporters who identified the task assignment and due date problems
- Users who provided detailed reproduction steps
- Contributors who helped validate the fixes

Your feedback continues to drive improvements and make ClickUp MCP Server better for everyone!

---

# v0.8.1 Release Notes

## 🛠️ Critical Schema Fix

**v0.8.1** is a patch release that fixes a critical schema validation issue that prevented the MCP server from starting.

### **Bug Fix**
- **Fixed JSON Schema Validation Error**: Removed invalid `optional: true` keywords from document tool schemas
  - **Issue**: Server failed to start with error: `Invalid schema for tool list_document_pages: strict mode: unknown keyword: "optional"`
  - **Root Cause**: Document tools were using `optional: true` which is not a valid JSON Schema keyword
  - **Solution**: Removed `optional` keywords from all document tool schemas (optional properties are handled by the `required` array)
  - **Tools Fixed**: `list_document_pages`, `get_document_pages`, `create_document_page`, `update_document_page`

### **Impact**
- ✅ **Server now starts correctly** without schema validation errors
- ✅ **All tools load properly** and are fully functional
- ✅ **Zero breaking changes** - all existing functionality preserved
- ✅ **Immediate fix** for users experiencing startup issues

### **Technical Details**
In JSON Schema specification, optional properties are defined by omitting them from the `required` array, not by using an `optional` keyword. This fix ensures compliance with strict JSON Schema validation.

---

# v0.8.0 Release Notes

## 🎉 Major Release: Architectural Revolution & Member Management

We're thrilled to announce **v0.8.0** - our most significant release yet! This version delivers a complete architectural overhaul, massive performance improvements, and powerful new member management capabilities.

## 🏗️ Massive Architectural Improvements

### **70% Codebase Reduction**
- **Before**: 1,566 total lines across server files
- **After**: 466 total lines
- **Eliminated 1,100+ lines of duplicated code** (89% reduction in SSE server)
- **Single source of truth** for server configuration
- **Unified architecture** supporting all transport types

### **Transport Architecture Revolution**
- **HTTP Streamable Transport**: Modern MCP protocol support
- **Legacy SSE Transport**: Backward compatibility maintained
- **STDIO Transport**: Enhanced and optimized
- **Unified Server Configuration**: All transports share the same tool definitions
- **Zero Code Duplication**: Clean, maintainable architecture

## 🚀 New Features

### **Member Management Tools**
Three powerful new tools for workspace member management:

- **`get_workspace_members`** - Retrieve all workspace members with complete details
- **`find_member_by_name`** - Find specific members by name or email address
- **`resolve_assignees`** - Convert names/emails to ClickUp user IDs

### **Enhanced Task Assignment**
- **Assignees parameter** added to `create_task`, `update_task`, `create_bulk_tasks`, and `update_bulk_tasks`
- **Complete assignment workflow**: Create tasks with assignees AND update existing task assignments
- **Flexible assignment**: Support for user IDs, emails, or usernames
- **Seamless integration**: Works across all transport types

## 🔧 Configuration & Endpoints

### **Updated Configuration Options**

| Option | Description | Default |
|--------|-------------|---------|
| `ENABLE_SSE` | Enable HTTP/SSE transport | `false` |
| `PORT` | HTTP server port | `3231` |
| `ENABLE_STDIO` | Enable STDIO transport | `true` |

### **HTTP Server Endpoints**

- **`/mcp`** - HTTP Streamable endpoint (MCP Inspector compatible)
- **`/sse`** - Legacy SSE endpoint (backward compatibility)

## 🚀 Quick Start

### **STDIO Transport (Default)**
```bash
npx @taazkareem/clickup-mcp-server \
  --env CLICKUP_API_KEY=your-key \
  --env CLICKUP_TEAM_ID=your-team-id
```

### **HTTP Streamable Transport**
```bash
ENABLE_SSE=true PORT=3231 npx @taazkareem/clickup-mcp-server \
  --env CLICKUP_API_KEY=your-key \
  --env CLICKUP_TEAM_ID=your-team-id
```

### **Test with MCP Inspector**
```bash
# Start server
ENABLE_SSE=true PORT=3231 npm start

# In another terminal
npx @modelcontextprotocol/inspector
# Connect to: http://127.0.0.1:3231/mcp
```

## 🔄 Migration Notes

**✅ Zero Breaking Changes**
- All existing integrations continue to work unchanged
- STDIO transport remains the default
- All 30 original tools preserved and enhanced
- Backward compatibility maintained for SSE endpoints

## � Performance Impact

### **Before v0.8.0**
- Duplicated tool definitions across transport files
- Maintenance overhead from code duplication
- Inconsistent tool availability across transports

### **After v0.8.0**
- **70% smaller codebase** - easier to maintain and extend
- **Unified tool registry** - consistent experience across all transports
- **Clean architecture** - faster development of new features
- **Zero regressions** - all existing functionality preserved

## 📦 Dependencies

- All existing dependencies remain unchanged
- No new dependencies added (leverages existing express/cors from previous versions)
- Maintained compatibility with all MCP SDK versions

## 🧪 Testing & Validation

This release underwent comprehensive testing:
- ✅ **All 36 tools validated** (33 original + 3 new member tools)
- ✅ **STDIO transport** - Full functionality verified
- ✅ **HTTP Streamable transport** - MCP Inspector compatibility confirmed
- ✅ **Legacy SSE transport** - Backward compatibility maintained
- ✅ **Member management** - Real ClickUp API integration tested

## 🙏 Thank You

This release represents the most significant architectural improvement in ClickUp MCP Server's history. The unified architecture, massive code reduction, and new member management capabilities make this server more powerful, maintainable, and user-friendly than ever before.

**Key Contributors:**
- Architectural design and implementation
- Comprehensive testing and validation
- Documentation and release preparation

Your feedback and contributions continue to drive this project forward!

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

Special thanks to our contributors who reported and helped fix this issue

Your feedback helps make ClickUp MCP Server better for everyone!
