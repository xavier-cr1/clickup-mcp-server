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
