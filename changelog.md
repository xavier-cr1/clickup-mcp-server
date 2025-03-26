# Changelog

## Unreleased


## Unreleased

### 🚀 New Features & Improvements

- Add subtasks support with multi-level nesting capability
- Update README
- Update README
- Update README
- Update README with new supporter badge and refined status update for v0
- Update changelog for v0
- Fix getting task by custom id
- Merge pull request #18 from colinmollenhour/main
- Add support for log level to be controlled via environment variable or command line argument
- Fix Smithery link URL
- Add photo attribution
- Update README
- Refactor workspace tool initialization in workspace
- Remove update-changelog
- Merge branch 'main' of https://github
- Create Security Policy
- Create CODE_OF_CONDUCT
- Merge branch 'main' of https://github
- Refactor GitHub Actions workflow to simplify release notes handling
- docs: Include logging and custom ID fixes in changelog - PR #18 and PR #20
- Merge pull request #20 from colinmollenhour/fix-get-task-by-custom-id
- Fix incorrect comparison

### 🔗 References

- #18: [See pull request](https://github.com/taazkareem/clickup-mcp-server/pull/18)
- #20: [See pull request](https://github.com/taazkareem/clickup-mcp-server/pull/20)
- #20: [See pull request](https://github.com/taazkareem/clickup-mcp-server/pull/20)
- #18: [See pull request](https://github.com/taazkareem/clickup-mcp-server/pull/18)



### 🚀 New Features & Improvements
- Added support for Custom IDs across all tools
- New tools: 
  - `attach_task_file`: Attach files to tasks using local paths, URLs, or base64 data
  - `create_task_comment`: Add comments to tasks
  - `get_task_comments`: Retrieve comments from tasks
- Enhanced date parsing with support for "X minutes from now" expressions
- Improved task name matching with greater flexibility:
  - Case-insensitive matching
  - Partial name matching
  - Matching without emojis
- Fixed error response formatting in task comment retrieval
- Improved workspace hierarchy display to correctly show lists directly in spaces

### 📦 Dependencies
- Updated dependencies to use semantic versioning
- Upgraded:
  - @modelcontextprotocol/sdk: 0.6.0 → 0.6.1
  - axios: 1.6.7 → 1.8.4
  - dotenv: 16.4.1 → 16.4.7

### 🔄 Repository Updates
- Added automated changelog generation
- Updated documentation and README
- Added funding options through GitHub Sponsors and Buy Me A Coffee

## v0.5.0 (2025-03-22)

### 🚀 Initial Release
- First public version of ClickUp MCP Server
- Core functionality for task, list, and folder management
- Basic workspace hierarchy navigation
- NPM and Smithery deployment options

### 🔄 Repository Updates
- Initial README and documentation
- Added GitHub workflow for publishing
- Created Funding options through GitHub Sponsors and Buy Me a Coffee

### 🔗 References
- #12: [See pull request](https://github.com/taazkareem/clickup-mcp-server/pull/12)
