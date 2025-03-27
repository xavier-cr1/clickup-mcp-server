/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * MCP Server for ClickUp integration
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
    version: "0.6.0",
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
        duplicateTaskTool,
        deleteTaskTool,
        getTaskCommentsTool,
        createTaskCommentTool,
        attachTaskFileTool,
        createBulkTasksTool,
        updateBulkTasksTool,
        moveBulkTasksTool,
        deleteBulkTasksTool,
        getWorkspaceTasksTool,
        createListTool,
        createListInFolderTool,
        getListTool,
        updateListTool,
        deleteListTool,
        createFolderTool,
        getFolderTool,
        updateFolderTool,
        deleteFolderTool,
        getSpaceTagsTool,
        createSpaceTagTool,
        updateSpaceTagTool,
        deleteSpaceTagTool,
        addTagToTaskTool,
        removeTagFromTaskTool
      ]
    };
  });

  // Register CallTool handler with proper logging
  logger.info("Registering tool handlers", {
    toolCount: 31,
    categories: ["workspace", "task", "list", "folder", "tag"]
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
        case "duplicate_task":
          return handleDuplicateTask(params);
        case "get_task":
          return handleGetTask(params);
        case "get_tasks":
          return handleGetTasks(params);
        case "delete_task":
          return handleDeleteTask(params);
        case "get_task_comments":
          return handleGetTaskComments(params);
        case "create_task_comment":
          return handleCreateTaskComment(params);
        case "attach_task_file":
          return handleAttachTaskFile(params);
        case "create_bulk_tasks":
          return handleCreateBulkTasks(params);
        case "update_bulk_tasks":
          return handleUpdateBulkTasks(params);
        case "move_bulk_tasks":
          return handleMoveBulkTasks(params);
        case "delete_bulk_tasks":
          return handleDeleteBulkTasks(params);
        case "get_workspace_tasks":
          return handleGetWorkspaceTasks(params);
        case "create_list":
          return handleCreateList(params);
        case "create_list_in_folder":
          return handleCreateListInFolder(params);
        case "get_list":
          return handleGetList(params);
        case "update_list":
          return handleUpdateList(params);
        case "delete_list":
          return handleDeleteList(params);
        case "create_folder":
          return handleCreateFolder(params);
        case "get_folder":
          return handleGetFolder(params);
        case "update_folder":
          return handleUpdateFolder(params);
        case "delete_folder":
          return handleDeleteFolder(params);
        case "get_space_tags":
          return handleGetSpaceTags(params);
        case "create_space_tag":
          return handleCreateSpaceTag(params);
        case "update_space_tag":
          return handleUpdateSpaceTag(params);
        case "delete_space_tag":
          return handleDeleteSpaceTag(params);
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