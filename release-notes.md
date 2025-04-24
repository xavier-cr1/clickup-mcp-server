# v0.7.0 Release Notes (2025-04-24)

## 🚀 New Features & Improvements

- Added Documents Module with comprehensive capabilities:
  - Complete document lifecycle management (create, list, search, update)
  - Page-level operations for creating and modifying document content
  - Optional activation via `DOCUMENT=true` environment variable
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
  - Selective tool access via `DISABLED_COMMANDS` environment variable
  - Comma-separated command list for granular control
  - Compatible with both environment variables and command line arguments
  - Clear error messages when attempting to use disabled commands
  - Enhanced security for production deployments

## 🛠️ Bug Fixes & Improvements

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

# v0.6.9 Release Notes (2025-04-03)

## 🚀 New Features & Improvements

- Enhanced token limit protection for workspace tasks:
  - Added handler-level token limit validation with 50,000 token threshold
  - Implemented dual-layer protection at both service and handler levels
  - Smart response format switching based on estimated response size
  - Automatic fallback to summary format for large responses
  - Added token estimation utilities for accurate size prediction
  - Improved logging for format switching events
  - Zero configuration required - works automatically
  - Maintains backward compatibility with existing implementations

## 📦 Dependencies

- No dependency changes in this release

## 🔄 Repository Updates

- Updated task handler implementation with token limit checks
- Added token estimation utilities for task responses
- Enhanced documentation with token limit behavior details
