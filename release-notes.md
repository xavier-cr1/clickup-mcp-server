# v0.8.3 Release Notes

### 🚀 New Features & Improvements

- **Enhanced workspace tasks filtering with Views API support (Issue #43)**:
  - **Enhanced list filtering**: When `list_ids` are provided, `get_workspace_tasks` now uses ClickUp's Views API for comprehensive task coverage
  - **Multi-list task support**: Now retrieves tasks that are *associated with* specified lists, including tasks created elsewhere and added to multiple lists
  - **Two-tier filtering strategy**:
    - **Server-side filtering**: Supported filters applied at ClickUp API level for efficiency (statuses, assignees, dates, etc.)
    - **Client-side filtering**: Additional filters applied after data retrieval (tags, folder_ids, space_ids)
  - **API endpoints used**:
    - `GET /list/{listId}/view` - Retrieves list views and identifies default list view
    - `GET /view/{viewId}/task` - Retrieves all tasks associated with the view/list
  - **Performance optimizations**:
    - Concurrent API calls for multiple lists using `Promise.all()`
    - Task deduplication to prevent duplicate results
    - Automatic summary format switching for large result sets
    - Safety limits to prevent infinite pagination loops
  - **Robust error handling**: Graceful degradation when some lists fail, comprehensive logging
  - **Backward compatibility**: Existing functionality unchanged when `list_ids` not provided
  - **Impact**: Addresses ClickUp's "tasks in multiple lists" feature, providing complete task coverage for list-based queries

    Thanks @dantearaujo for the help!

- **Added ENABLED_TOOLS configuration option (PR #39 & Issue #50)**:
  - Added `ENABLED_TOOLS` environment variable and command line argument support
  - Allows specifying exactly which tools should be available via comma-separated list
  - Provides complementary functionality to existing `DISABLED_TOOLS` option
  - **Precedence logic**: `ENABLED_TOOLS` takes precedence over `DISABLED_TOOLS` when both are specified
  - **Configuration options**:
    - `ENABLED_TOOLS=tool1,tool2` - Only enable specified tools
    - `DISABLED_TOOLS=tool1,tool2` - Disable specified tools (legacy approach)
    - If neither specified, all tools are available (default behavior)
  - **Enhanced tool filtering**:
    - Updated `ListToolsRequestSchema` handler to use new filtering logic
    - Updated `CallToolRequestSchema` handler with improved error messages
    - Clear distinction between "disabled" vs "not in enabled tools list" errors
  - **Impact**: Users can now precisely control tool availability for security, context limitations, or workflow optimization
  - **Backward compatibility**: Existing `DISABLED_TOOLS` functionality unchanged

  Thanks @somework & @colinmollenhour for the help!

### 🛠️ Bug Fixes

- **Fixed automatic priority assignment in task creation**:
  - Fixed issue where `create_task` and `create_bulk_tasks` tools were automatically setting priorities even when users didn't specify one
  - **Root cause**: Priority field was unconditionally included in API requests as `undefined`, which ClickUp interpreted as a request to set a default priority
  - **Solution**: Priority field is now only included in API requests when explicitly provided by the user
  - **Impact**: Tasks created without specifying a priority will now have `priority: null` instead of an automatically assigned priority
  - **Affected tools**: `create_task_ClickUp__Local_` and `create_bulk_tasks_ClickUp__Local_`
  - **Backward compatibility**: Tasks created with explicit priority values continue to work unchanged
