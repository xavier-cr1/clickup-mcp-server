# v0.7.0 Release Notes (2025-04-24)

## 🚀 New Features & Improvements

- Added Documents Module with comprehensive capabilities:

  - Complete document lifecycle management (create, list, search, update)
  - Page-level operations for creating and modifying document content
  - Optional activation via `DOCUMENT_SUPPORT=true` environment variable
  - Full compatibility with ClickUp API V3 for document operations
  - Seamless integration with existing workspace navigation
- Added Time Tracking Suite with comprehensive tools:

  - View and manage time entries for tasks with flexible filtering
  - Start/stop time tracking with one command
  - Add manual time entries with natural language duration support
  - Track billable and non-billable time
  - Delete unwanted time entries
  - Monitor currently running timers across workspace
- Added Command Disabling Capability:

  - Selective tool access via `DISABLED_TOOLS` environment variable
  - Comma-separated command list for granular control
  - Compatible with both environment variables and command line arguments
  - Clear error messages when attempting to use disabled commands
  - Enhanced security for production deployments

## 🛠️ Bug Fixes & Improvements

- Fixed custom task ID lookup in `getTaskByCustomId` method:
  - Corrected API endpoint from `/task/custom_task_ids` to `/task/{id}` with proper parameters
  - Added required `custom_task_ids=true` and `team_id` parameters for proper authentication
  - Fixed "Authorization failed" error when retrieving tasks by custom ID
  - Improved error handling and logging for custom ID operations

- Fixed JSON schema compatibility issues for third-party integrations
- Enhanced custom field handling in task update operations
- Improved error handling and validation across all new tools
- Optimized response formatting for consistent output

## 📦 Dependencies

- No dependency changes in this release

## 🔄 Repository Updates

- Comprehensive documentation updates for all new features
- Enhanced API reference with examples for document and time tracking operations
- Added configuration guides for new environment variables
- Improved tool descriptions and parameter documentation

## 🙏 Thank You

Special thanks to our contributors who made this release possible:

- [@jsb989](https://github.com/jsb989) - Document support implementation
- [@quitequinn](https://github.com/quitequinn) - Time tracking functionality
- [@somework](https://github.com/somework) - Command disabling feature
- [@Nemo64](https://github.com/Nemo64) - JSON schema compatibility improvements
- [@FruitSwimer](https://github.com/FruitSwimer) - Custom field update fixes

Your contributions have significantly improved the ClickUp MCP Server!
