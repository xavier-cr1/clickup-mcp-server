# v0.6.0 Release Notes (2025-03-26)

## 🚀 New Features & Improvements

- Added subtasks support with multi-level nesting capability
  - Create subtasks by setting the `parent` parameter with parent task ID
  - Retrieve subtasks using the `subtasks` parameter on `get_task` and `get_tasks` operations
  - Support nested subtasks (subtasks of subtasks)

- Made logging level configurable and improved logging system
  - Configure via `LOG_LEVEL` environment variable or command line argument
  - Default log level now set to ERROR for better compatibility with tools like Cline
  - Support for TRACE, DEBUG, INFO, WARN, and ERROR levels

- Fixed custom task ID handling across all operations
  - Improved support for retrieving tasks using custom ID format (e.g., "DEV-1234")
  - Fixed comparison issues with custom ID validation

## 📦 Dependencies

- No dependency changes in this release

## 🔄 Repository Updates

- Updated documentation for subtasks feature
- Improved API reference with subtasks examples
- Added Security Policy and Code of Conduct

## 🔗 References

- #18: [Add configurable log levels](https://github.com/taazkareem/clickup-mcp-server/pull/18)
- #20: [Fix custom task ID handling](https://github.com/taazkareem/clickup-mcp-server/pull/20) 