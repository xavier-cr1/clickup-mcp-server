/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Tools
 * 
 * This is the main task module that connects tool definitions to their handlers.
 * The actual implementations are organized in sub-modules for better maintainability.
 */

import { sponsorService } from '../../utils/sponsor-service.js';

// Import tool definitions
import {
  createTaskTool,
  getTaskTool,
  getTasksTool,
  updateTaskTool,
  moveTaskTool,
  duplicateTaskTool,
  deleteTaskTool,
  getTaskCommentsTool,
  createTaskCommentTool
} from './single-operations.js';

import {
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
  deleteBulkTasksTool
} from './bulk-operations.js';

import {
  getWorkspaceTasksTool
} from './workspace-operations.js';

// Import handlers
import {
  createTaskHandler,
  getTaskHandler,
  getTasksHandler,
  updateTaskHandler,
  moveTaskHandler,
  duplicateTaskHandler,
  deleteTaskHandler,
  getTaskCommentsHandler,
  createTaskCommentHandler,
  createBulkTasksHandler,
  updateBulkTasksHandler,
  moveBulkTasksHandler,
  deleteBulkTasksHandler,
  getWorkspaceTasksHandler
} from './handlers.js';

// Import shared services
import { clickUpServices } from '../../services/shared.js';
const { task: taskService } = clickUpServices;

//=============================================================================
// HANDLER WRAPPER UTILITY
//=============================================================================

/**
 * Creates a wrapped handler function with standard error handling and response formatting
 */
function createHandlerWrapper<T>(
  handler: (params: any) => Promise<T>,
  formatResponse: (result: T) => any = (result) => result
) {
  return async (parameters: any) => {
    try {
      const result = await handler(parameters);
      return sponsorService.createResponse(formatResponse(result), true);
    } catch (error) {
      return sponsorService.createErrorResponse(error, parameters);
    }
  };
}

//=============================================================================
// SINGLE TASK OPERATIONS - HANDLER IMPLEMENTATIONS
//=============================================================================

export const handleCreateTask = createHandlerWrapper(createTaskHandler);
export const handleGetTask = createHandlerWrapper(getTaskHandler);
export const handleGetTasks = createHandlerWrapper(getTasksHandler, (tasks) => ({
  tasks,
  count: tasks.length
}));
export const handleUpdateTask = createHandlerWrapper(updateTaskHandler);
export const handleMoveTask = createHandlerWrapper(moveTaskHandler);
export const handleDuplicateTask = createHandlerWrapper(duplicateTaskHandler);
export const handleDeleteTask = createHandlerWrapper(deleteTaskHandler, () => ({
  success: true,
  message: "Task deleted successfully"
}));
export const handleGetTaskComments = createHandlerWrapper(getTaskCommentsHandler, (comments) => ({
  comments,
  count: comments.length
}));
export const handleCreateTaskComment = createHandlerWrapper(createTaskCommentHandler, (comment) => ({
  success: true,
  message: "Comment added successfully",
  comment: comment && typeof comment === 'object' ? comment : {
    id: `generated-${Date.now()}`,
    comment_text: typeof comment === 'string' ? comment : "Comment text unavailable"
  }
}));

//=============================================================================
// BULK TASK OPERATIONS - HANDLER IMPLEMENTATIONS
//=============================================================================

export const handleCreateBulkTasks = createHandlerWrapper(createBulkTasksHandler, (tasks) => ({
  tasks,
  count: tasks.length
}));
export const handleUpdateBulkTasks = createHandlerWrapper(updateBulkTasksHandler, (tasks) => ({
  tasks,
  count: tasks.length
}));
export const handleMoveBulkTasks = createHandlerWrapper(moveBulkTasksHandler, (tasks) => ({
  tasks,
  count: tasks.length
}));
export const handleDeleteBulkTasks = createHandlerWrapper(deleteBulkTasksHandler, (results) => ({
  success: true,
  count: results.length,
  results
}));

//=============================================================================
// WORKSPACE TASK OPERATIONS - HANDLER IMPLEMENTATIONS
//=============================================================================

export const handleGetWorkspaceTasks = createHandlerWrapper(
  // This adapts the new handler signature to match what createHandlerWrapper expects
  (params) => getWorkspaceTasksHandler(taskService, params),
  (response) => response // Pass through the response as is
);

//=============================================================================
// TOOL DEFINITIONS AND HANDLERS EXPORT
//=============================================================================

// Tool definitions with their handler mappings
export const taskTools = [
  // Single task operations
  { definition: createTaskTool, handler: handleCreateTask },
  { definition: getTaskTool, handler: handleGetTask },
  { definition: getTasksTool, handler: handleGetTasks },
  { definition: updateTaskTool, handler: handleUpdateTask },
  { definition: moveTaskTool, handler: handleMoveTask },
  { definition: duplicateTaskTool, handler: handleDuplicateTask },
  { definition: deleteTaskTool, handler: handleDeleteTask },
  { definition: getTaskCommentsTool, handler: handleGetTaskComments },
  { definition: createTaskCommentTool, handler: handleCreateTaskComment },
  
  // Bulk task operations
  { definition: createBulkTasksTool, handler: handleCreateBulkTasks },
  { definition: updateBulkTasksTool, handler: handleUpdateBulkTasks },
  { definition: moveBulkTasksTool, handler: handleMoveBulkTasks },
  { definition: deleteBulkTasksTool, handler: handleDeleteBulkTasks },
  
  // Team task operations
  { definition: getWorkspaceTasksTool, handler: handleGetWorkspaceTasks }
];