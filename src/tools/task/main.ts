/**
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
  getTaskCommentsTool
} from './single-operations.js';

import {
  createBulkTasksTool,
  updateBulkTasksTool,
  moveBulkTasksTool,
  deleteBulkTasksTool
} from './bulk-operations.js';

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
  createBulkTasksHandler,
  updateBulkTasksHandler,
  moveBulkTasksHandler,
  deleteBulkTasksHandler
} from './handlers.js';

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
  
  // Bulk task operations
  { definition: createBulkTasksTool, handler: handleCreateBulkTasks },
  { definition: updateBulkTasksTool, handler: handleUpdateBulkTasks },
  { definition: moveBulkTasksTool, handler: handleMoveBulkTasks },
  { definition: deleteBulkTasksTool, handler: handleDeleteBulkTasks }
];