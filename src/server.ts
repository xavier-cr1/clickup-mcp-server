/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Server
 * 
 * This is the main server module that handles MCP requests.
 * 
 * !!! TEMPORARY CHANGES !!!
 * Approximately half of the tools have been temporarily disabled to test if this resolves
 * the context token limit issues in Claude Desktop. Once testing is complete, 
 * the commented-out tools should be re-enabled.
 * Last modified: [Date]
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClickUpServices } from "./services/clickup/index.js";
import config from "./config.js";
import { workspaceHierarchyTool, handleGetWorkspaceHierarchy } from "./tools/workspace.js";
import {
  createTaskTool,
  updateTaskTool,
  moveTaskTool,
  duplicateTaskTool,
  getTaskTool,
  getTasksTool,
  deleteTaskTool,
  getTaskCommentsTool,
  createTaskCommentTool,
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
  deleteBulkTasksTool,
  attachTaskFileTool,
  getWorkspaceTasksTool,
  handleCreateTask,
  handleUpdateTask,
  handleMoveTask,
  handleDuplicateTask,
  handleGetTasks,
  handleDeleteTask,
  handleGetTaskComments,
  handleCreateTaskComment,
  handleCreateBulkTasks,
  handleUpdateBulkTasks,
  handleMoveBulkTasks,
  handleDeleteBulkTasks,
  handleGetTask,
  handleAttachTaskFile,
  handleGetWorkspaceTasks
} from "./tools/task/index.js";
import {
  createListTool, handleCreateList,
  createListInFolderTool, handleCreateListInFolder,
  getListTool, handleGetList,
  updateListTool, handleUpdateList,
  deleteListTool, handleDeleteList
} from "./tools/list.js";
import {
  createFolderTool, handleCreateFolder,
  getFolderTool, handleGetFolder,
  updateFolderTool, handleUpdateFolder,
  deleteFolderTool, handleDeleteFolder
} from "./tools/folder.js";
import {
  getSpaceTagsTool, handleGetSpaceTags,
  createSpaceTagTool, handleCreateSpaceTag,
  updateSpaceTagTool, handleUpdateSpaceTag,
  deleteSpaceTagTool, handleDeleteSpaceTag,
  addTagToTaskTool, handleAddTagToTask,
  removeTagFromTaskTool, handleRemoveTagFromTask
} from "./tools/tag.js";
import { Logger } from "./logger.js";
import { clickUpServices } from "./services/shared.js";

// Create a logger instance for server
const logger = new Logger('Server');

// Use existing services from shared module instead of creating new ones
const { workspace } = clickUpServices;

export const server = new Server(
  {
    name: "clickup-mcp-server",
    version: "0.6.4",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Configure the server routes and handlers
 */
export function configureServer() {
  logger.info("Registering server request handlers");
  
  // Register ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("Received ListTools request");
    return {
      tools: [
        workspaceHierarchyTool,
        createTaskTool,
        getTaskTool,
        getTasksTool,
        updateTaskTool,
        moveTaskTool,
        deleteTaskTool,
        getWorkspaceTasksTool,
        createListTool,
        getListTool,
        updateListTool,
        getSpaceTagsTool,
        createSpaceTagTool,
        addTagToTaskTool,
        removeTagFromTaskTool
      ]
    };
  });

  // Register CallTool handler with proper logging
  logger.info("Registering tool handlers", {
    toolCount: 16,
    categories: ["workspace", "task", "list", "tag"]
  });
  
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: params } = req.params;
    
    // Improved logging with more context
    logger.info(`Received CallTool request for tool: ${name}`, { 
      params 
    });
    
    try {
      // Handle tool calls by routing to the appropriate handler
      switch (name) {
        case "get_workspace_hierarchy":
          return handleGetWorkspaceHierarchy();
        case "create_task":
          return handleCreateTask(params);
        case "update_task":
          return handleUpdateTask(params);
        case "move_task":
          return handleMoveTask(params);
        case "get_task":
          return handleGetTask(params);
        case "get_tasks":
          return handleGetTasks(params);
        case "delete_task":
          return handleDeleteTask(params);
        case "get_workspace_tasks":
          return handleGetWorkspaceTasks(params);
        case "create_list":
          return handleCreateList(params);
        case "get_list":
          return handleGetList(params);
        case "update_list":
          return handleUpdateList(params);
        case "get_space_tags":
          return handleGetSpaceTags(params);
        case "create_space_tag":
          return handleCreateSpaceTag(params);
        case "add_tag_to_task":
          return handleAddTagToTask(params);
        case "remove_tag_from_task":
          return handleRemoveTagFromTask(params);
        default:
          logger.error(`Unknown tool requested: ${name}`);
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err) {
      logger.error(`Error executing tool: ${name}`, err);
      throw err;
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.info("Received ListPrompts request");
    return { prompts: [] };
  });

  server.setRequestHandler(GetPromptRequestSchema, async () => {
    logger.error("Received GetPrompt request, but prompts are not supported");
    throw new Error("Prompt not found");
  });

  return server;
}

/**
 * Export the clickup service for use in tool handlers
 */
export { workspace };