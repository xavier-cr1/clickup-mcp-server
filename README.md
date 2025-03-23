<img src="https://clickup.com/assets/brand/logo-v3-clickup-dark.svg" alt="ClickUp" height="40" style="vertical-align: middle; margin-top: -4px;">

# MCP Server

[![GitHub Stars](https://img.shields.io/github/stars/TaazKareem/clickup-mcp-server?style=flat&logo=github)](https://github.com/TaazKareem/clickup-mcp-server/stargazers)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/TaazKareem/clickup-mcp-server/graphs/commit-activity)

A Model Context Protocol (MCP) server for integrating ClickUp tasks with AI applications. This server allows AI agents to interact with ClickUp tasks, spaces, lists, and folders through a standardized protocol.


> 🚧 **Status Update:** -v0.5.1 beta release with new Attach Task Files tool, Create Task Comments tool, Get Task Comments tool, and Custom ID support across all tools.





## Setup

1. Get your credentials:
   - ClickUp API key from [ClickUp Settings](https://app.clickup.com/settings/apps)
   - Team ID from your ClickUp workspace URL
2. Choose either hosted installation (sends webhooks) or NPX installation (downloads to local path and installs dependencies)
3. Use natural language to manage your workspace!

## Smithery Installation (Quick Start)

[![smithery badge](https://smithery.ai/badge/@TaazKareem/clickup-mcp-server)](https://smithery.ai/server/@TaazKareem/clickup-mcp-server)

The server is hosted on Smithery. There, you can preview the available tools or copy the commands to run on your specific client app. 


## NPX Installation

[![NPM Version](https://img.shields.io/npm/v/@taazkareem/clickup-mcp-server.svg?style=flat&logo=npm)](https://www.npmjs.com/package/@taazkareem/clickup-mcp-server)
[![Dependency Status](https://img.shields.io/librariesio/github/TaazKareem/clickup-mcp-server)](https://libraries.io/github/TaazKareem/clickup-mcp-server)
[![NPM Downloads](https://img.shields.io/npm/dm/@taazkareem/clickup-mcp-server.svg?style=flat&logo=npm)](https://npmcharts.com/compare/@taazkareem/clickup-mcp-server?minimal=true)

Add this entry to your client's MCP settings JSON file:

```json
{
  "mcpServers": {
    "ClickUp": {
      "command": "npx",
      "args": [
        "-y",
        "@taazkareem/clickup-mcp-server@latest"
      ],
      "env": {
        "CLICKUP_API_KEY": "your-api-key",
        "CLICKUP_TEAM_ID": "your-team-id"
      }
    }
  }
}
```

Or use this npx command:

`npx -y @taazkareem/clickup-mcp-server@latest --env CLICKUP_API_KEY=your-api-key --env CLICKUP_TEAM_ID=your-team-id`

## Features

- 🎯 **Task Management**
  - Create, retrieve, update, and delete tasks
  - Move and duplicate tasks between lists, spaces, and folders
  - Single operation or bulk operation
  - View and modify task details and properties
  - Get task comments
  - Set due dates using natural language and relative time expressions
  - Attach files to tasks using local file paths, URL, base64, or chunked uploads

- 📂 **Workspace Organization**
  - Complete workspace hierarchy (spaces, folders, lists)
  - Tree structure with clear relationships
  - Efficient path-based navigation

- 🔄 **Integration Features**
  - Name or ID-based item lookup
  - Case-insensitive name matching
  - Markdown formatting support
  - Built-in API rate limiting

## Available Tools

| Tool | Description | Required Parameters |
|------|-------------|-------------------|
| [get_workspace_hierarchy](docs/api-reference.md#workspace-navigation) | Get workspace structure | None |
| [create_task](docs/api-reference.md#task-management) | Create a task | `name`, (`listId`/`listName`) |
| [create_bulk_tasks](docs/api-reference.md#task-management) | Create multiple tasks | `tasks[]` |
| [update_task](docs/api-reference.md#task-management) | Modify task | `taskId`/`taskName` |
| [update_bulk_tasks](docs/api-reference.md#task-management) | Update multiple tasks | `tasks[]` with IDs or names |
| [get_tasks](docs/api-reference.md#task-management) | Get tasks from list | `listId`/`listName` |
| [get_task](docs/api-reference.md#task-management) | Get task details | `taskId`/`taskName` |
| [get_task_comments](docs/api-reference.md#task-management) | Get comments on a task | `taskId`/`taskName` |
| [create_task_comment](docs/api-reference.md#task-management) | Add a comment to a task | `commentText`, (`taskId`/(`taskName`+`listName`)) |
| [attach_task_file](docs/api-reference.md#task-management) | Attach file to a task | `taskId`/`taskName`, (`file_data` or `file_url`) |
| [delete_task](docs/api-reference.md#task-management) | Remove task | `taskId`/`taskName` |
| [delete_bulk_tasks](docs/api-reference.md#task-management) | Remove multiple tasks | `tasks[]` with IDs or names |
| [move_task](docs/api-reference.md#task-management) | Move task | `taskId`/`taskName`, `listId`/`listName` |
| [move_bulk_tasks](docs/api-reference.md#task-management) | Move multiple tasks | `tasks[]` with IDs or names, target list |
| [duplicate_task](docs/api-reference.md#task-management) | Copy task | `taskId`/`taskName`, `listId`/`listName` |
| [create_list](docs/api-reference.md#list-management) | Create list in space | `name`, `spaceId`/`spaceName` |
| [create_folder](docs/api-reference.md#folder-management) | Create folder | `name`, `spaceId`/`spaceName` |
| [create_list_in_folder](docs/api-reference.md#list-management) | Create list in folder | `name`, `folderId`/`folderName` |
| [get_folder](docs/api-reference.md#folder-management) | Get folder details | `folderId`/`folderName` |
| [update_folder](docs/api-reference.md#folder-management) | Update folder properties | `folderId`/`folderName` |
| [delete_folder](docs/api-reference.md#folder-management) | Delete folder | `folderId`/`folderName` |
| [get_list](docs/api-reference.md#list-management) | Get list details | `listId`/`listName` |
| [update_list](docs/api-reference.md#list-management) | Update list properties | `listId`/`listName` |
| [delete_list](docs/api-reference.md#list-management) | Delete list | `listId`/`listName` |

See [full documentation](docs/api-reference.md) for optional parameters and advanced usage.

## Available Prompts
Not yet implemented (or needed) For now, you can send a follow up prompt after the tool result.

| Prompt | Purpose | Features |
|--------|---------|----------|
| [summarize_tasks](docs/api-reference.md#prompts) | Task overview | Status summary, priorities, relationships |
| [analyze_priorities](docs/api-reference.md#prompts) | Priority optimization | Distribution analysis, sequencing |
| [generate_description](docs/api-reference.md#prompts) | Task description creation | Objectives, criteria, dependencies |

## Error Handling

The server provides clear error messages for:
- Missing required parameters
- Invalid IDs or names
- Items not found
- Permission issues
- API errors
- Rate limiting

## Support the Developer

When using this server, you may occasionally see a small sponsor message with a link to this repository included in tool responses. I hope you can support the project!
If you find this project useful, please consider supporting:

[![Sponsor TaazKareem](https://img.shields.io/badge/Sponsor-TaazKareem-orange?logo=github)](https://github.com/sponsors/TaazKareem)

<a href="https://buymeacoffee.com/taazkareem">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="200" alt="Buy Me A Coffee">
</a>

## Acknowledgements

Special thanks to [ClickUp](https://clickup.com) for their excellent API and services that make this integration possible.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

Disclaimer: This software makes use of third-party APIs and may reference trademarks
or brands owned by third parties. The use of such APIs or references does not imply 
any affiliation with or endorsement by the respective companies. All trademarks and 
brand names are the property of their respective owners. This project is an independent
work and is not officially associated with or sponsored by any third-party company mentioned.
