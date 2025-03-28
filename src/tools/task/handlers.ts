/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Operation Handlers
 * 
 * This module implements the handlers for task operations, both for single task
 * and bulk operations. These handlers are used by the tool definitions.
 */

import { ClickUpComment, ClickUpTask, TaskPriority, UpdateTaskData, TaskFilters, toTaskPriority, CreateTaskData } from '../../services/clickup/types.js';
import { clickUpServices } from '../../services/shared.js';
import { BulkService } from '../../services/clickup/bulk.js';
import { BatchResult } from '../../utils/concurrency-utils.js';
import { parseDueDate } from '../utils.js';
import { 
  validateTaskIdentification, 
  validateListIdentification,
  validateTaskUpdateData,
  validateBulkTasks,
  parseBulkOptions,
  resolveListIdWithValidation,
  formatTaskData
} from './utilities.js';
import { TaskService } from '../../services/clickup/task.js';
import { ExtendedTaskFilters } from '../../services/clickup/types.js';

// Use shared services instance
const { task: taskService, list: listService } = clickUpServices;

// Create a bulk service instance that uses the task service
const bulkService = new BulkService(taskService);

//=============================================================================
// SHARED UTILITY FUNCTIONS
//=============================================================================

/**
 * Build task update data from parameters
 */
function buildUpdateData(params: any): UpdateTaskData {
  const updateData: UpdateTaskData = {};
  
  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.markdown_description !== undefined) updateData.markdown_description = params.markdown_description;
  if (params.status !== undefined) updateData.status = params.status;
  
  // Skip toTaskPriority conversion since we're handling priority in the main handler
  if (params.priority !== undefined) updateData.priority = params.priority;
  
  if (params.dueDate !== undefined) {
    updateData.due_date = parseDueDate(params.dueDate);
    updateData.due_date_time = true;
  }
  
  if (params.startDate !== undefined) {
    updateData.start_date = parseDueDate(params.startDate);
    updateData.start_date_time = true;
  }
  
  return updateData;
}

/**
 * Resolves a task ID from various input formats
 * Smart disambiguation is used for task name lookups
 * 
 * @param taskId Direct task ID
 * @param taskName Task name to search for
 * @param listName List name for context
 * @param customTaskId Custom task ID (prefixed format) 
 * @returns Resolved task ID
 */
export async function getTaskId(taskId?: string, taskName?: string, listName?: string, customTaskId?: string): Promise<string> {
  validateTaskIdentification(taskId, taskName, listName, customTaskId, true);
  
  const result = await taskService.findTasks({
    taskId,
    customTaskId,
    taskName,
    listName,
    allowMultipleMatches: false,
    useSmartDisambiguation: true,
    includeFullDetails: false,
    includeListContext: false
  });
  
  if (result && !Array.isArray(result)) {
    return result.id;
  }
  
  throw new Error("Task not found");
}

/**
 * Process a list identification validation, returning the list ID
 */
async function getListId(listId?: string, listName?: string): Promise<string> {
  validateListIdentification(listId, listName);
  return await resolveListIdWithValidation(listId, listName);
}

/**
 * Extract and build task filters from parameters
 */
function buildTaskFilters(params: any): TaskFilters {
  const { subtasks, statuses, page, order_by, reverse } = params;
  const filters: TaskFilters = {};
  
  if (subtasks !== undefined) filters.subtasks = subtasks;
  if (statuses !== undefined) filters.statuses = statuses;
  if (page !== undefined) filters.page = page;
  if (order_by !== undefined) filters.order_by = order_by;
  if (reverse !== undefined) filters.reverse = reverse;
  
  return filters;
}

/**
 * Map tasks for bulk operations, resolving task IDs
 * Uses smart disambiguation for tasks without list context
 */
async function mapTaskIds(tasks: any[]): Promise<string[]> {
  return Promise.all(tasks.map(async (task) => {
    validateTaskIdentification(task.taskId, task.taskName, task.listName, task.customTaskId);
    return await getTaskId(task.taskId, task.taskName, task.listName, task.customTaskId);
  }));
}

//=============================================================================
// SINGLE TASK OPERATIONS
//=============================================================================

/**
 * Handler for creating a task
 */
export async function createTaskHandler(params) {
  const { name, description, markdown_description, status, dueDate, startDate, parent, tags } = params;
  
  if (!name) throw new Error("Task name is required");
  
  // Use our helper function to validate and convert priority
  const priority = toTaskPriority(params.priority);

  const listId = await getListId(params.listId, params.listName);
  
  const taskData: CreateTaskData = {
    name,
    description,
    markdown_description,
    status,
    priority,
    parent,
    tags
  };
  
  // Add due date if specified
  if (dueDate) {
    taskData.due_date = parseDueDate(dueDate);
    taskData.due_date_time = true;
  }
  
  // Add start date if specified
  if (startDate) {
    taskData.start_date = parseDueDate(startDate);
    taskData.start_date_time = true;
  }
  
  return await taskService.createTask(listId, taskData);
}

/**
 * Handler for updating a task
 */
export async function updateTaskHandler(params) {
  console.log('Update Task Handler - Raw params:', JSON.stringify(params));
  console.log('Update Task Handler - Priority type:', typeof params.priority, 'Value:', params.priority);
  
  validateTaskUpdateData(params);
  const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
  
  const updateData = buildUpdateData(params);
  console.log('Update Task Handler - Update data:', JSON.stringify(updateData));
  
  return await taskService.updateTask(taskId, updateData);
}

/**
 * Handler for moving a task
 */
export async function moveTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
  const listId = await getListId(params.listId, params.listName);
  return await taskService.moveTask(taskId, listId);
}

/**
 * Handler for duplicating a task
 */
export async function duplicateTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
  let listId;
  
  if (params.listId || params.listName) {
    listId = await getListId(params.listId, params.listName);
  }
  
  return await taskService.duplicateTask(taskId, listId);
}

/**
 * Handler for getting a task
 */
export async function getTaskHandler(params) {
  // Use the new unified findTasks method to handle all lookup scenarios
  try {
    const result = await taskService.findTasks({
      taskId: params.taskId,
      customTaskId: params.customTaskId,
      taskName: params.taskName,
      listName: params.listName,
      allowMultipleMatches: true,
      useSmartDisambiguation: false,
      includeFullDetails: true,
      includeListContext: true
    });

    // Handle the response based on the result type
    if (Array.isArray(result)) {
      // If multiple tasks matched, format them with task count
      return {
        matches: result,
        count: result.length
      };
    } else if (result) {
      // Single task found, check if we need to include subtasks
      if (params.subtasks) {
        const subtasks = await taskService.getSubtasks(result.id);
        return { ...result, subtasks };
      }
      
      // Return the single task
      return result;
    } else {
      throw new Error("Task not found");
    }
  } catch (error) {
    // Enhance error message for non-existent tasks
    if (params.taskName && error.message.includes('not found')) {
      throw new Error(`Task "${params.taskName}" not found. Please check the task name and try again.`);
    }
    
    // Pass along other formatted errors
    throw error;
  }
}

/**
 * Handler for getting tasks
 */
export async function getTasksHandler(params) {
  const listId = await getListId(params.listId, params.listName);
  return await taskService.getTasks(listId, buildTaskFilters(params));
}

/**
 * Handler for getting task comments
 */
export async function getTaskCommentsHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
  const { start, startId } = params;
  return await taskService.getTaskComments(taskId, start, startId);
}

/**
 * Handler for creating a task comment
 */
export async function createTaskCommentHandler(params) {
  // Validate required parameters
  if (!params.commentText) {
    throw new Error('Comment text is required');
  }
  
  try {
    // Resolve the task ID
    const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
    
    // Extract other parameters with defaults
    const {
      commentText,
      notifyAll = false,
      assignee = null
    } = params;
    
    // Create the comment
    return await taskService.createTaskComment(taskId, commentText, notifyAll, assignee);
  } catch (error) {
    // If this is a task lookup error, provide more helpful message
    if (error.message?.includes('not found') || error.message?.includes('identify task')) {
      if (params.taskName) {
        throw new Error(`Could not find task "${params.taskName}" in list "${params.listName}"`);
      } else {
        throw new Error(`Task with ID "${params.taskId}" not found`);
      }
    }
    
    // Otherwise, rethrow the original error
    throw error;
  }
}

/**
 * Handler for getting workspace tasks with filtering
 */
export async function getWorkspaceTasksHandler(
  taskService: TaskService,
  params: Record<string, any>
): Promise<Record<string, any>> {
  try {
    // Require at least one filter parameter
    const hasFilter = [
      'tags',
      'list_ids',
      'folder_ids', 
      'space_ids',
      'statuses',
      'assignees',
      'date_created_gt',
      'date_created_lt',
      'date_updated_gt',
      'date_updated_lt',
      'due_date_gt',
      'due_date_lt'
    ].some(key => params[key] !== undefined);

    if (!hasFilter) {
      throw new Error('At least one filter parameter is required (tags, list_ids, folder_ids, space_ids, statuses, assignees, or date filters)');
    }

    // For workspace tasks, we'll continue to use the direct getWorkspaceTasks method
    // since it supports specific workspace-wide filters that aren't part of the unified findTasks
    const filters: ExtendedTaskFilters = {
      tags: params.tags,
      list_ids: params.list_ids,
      folder_ids: params.folder_ids,
      space_ids: params.space_ids,
      statuses: params.statuses,
      include_closed: params.include_closed,
      include_archived_lists: params.include_archived_lists,
      include_closed_lists: params.include_closed_lists,
      archived: params.archived,
      order_by: params.order_by,
      reverse: params.reverse,
      due_date_gt: params.due_date_gt,
      due_date_lt: params.due_date_lt,
      date_created_gt: params.date_created_gt,
      date_created_lt: params.date_created_lt,
      date_updated_gt: params.date_updated_gt,
      date_updated_lt: params.date_updated_lt,
      assignees: params.assignees,
      page: params.page,
      detail_level: params.detail_level || 'detailed'
    };

    // Get tasks with adaptive response format support
    const response = await taskService.getWorkspaceTasks(filters);

    // Return the response without adding the redundant _note field
    return response;
  } catch (error) {
    throw new Error(`Failed to get workspace tasks: ${error.message}`);
  }
}

//=============================================================================
// BULK TASK OPERATIONS
//=============================================================================

/**
 * Handler for creating multiple tasks
 */
export async function createBulkTasksHandler(params) {
  validateBulkTasks(params.tasks);
  const listId = await getListId(params.listId, params.listName);
  
  // Process tasks - prepare data for each task
  const tasks = params.tasks.map(task => {
    const processedTask = { ...task };
    
    if (task.dueDate) {
      processedTask.due_date = parseDueDate(task.dueDate);
      delete processedTask.dueDate;
    }
    
    return processedTask;
  });

  const result = await bulkService.createTasks(
    listId, 
    tasks, 
    parseBulkOptions(params.options)
  );
  
  return result.successful;
}

/**
 * Handler for updating multiple tasks
 */
export async function updateBulkTasksHandler(params) {
  validateBulkTasks(params.tasks);
  
  const updates = await Promise.all(params.tasks.map(async (task) => {
    validateTaskUpdateData(task);
    const taskId = await getTaskId(task.taskId, task.taskName, task.listName);
    return { id: taskId, data: buildUpdateData(task) };
  }));

  const result = await bulkService.updateTasks(
    updates, 
    parseBulkOptions(params.options)
  );
  
  return result.successful;
}

/**
 * Handler for moving multiple tasks
 */
export async function moveBulkTasksHandler(params) {
  validateBulkTasks(params.tasks);
  
  if (!params.targetListId && !params.targetListName) {
    throw new Error("Either targetListId or targetListName must be provided");
  }

  const targetListId = await getListId(params.targetListId, params.targetListName);
  const taskIds = await mapTaskIds(params.tasks);
  
  const result = await bulkService.moveTasks(
    taskIds, 
    targetListId, 
    parseBulkOptions(params.options)
  );
  
  return result.successful;
}

/**
 * Handler for deleting multiple tasks
 */
export async function deleteBulkTasksHandler(params) {
  validateBulkTasks(params.tasks);
  const taskIds = await mapTaskIds(params.tasks);
  
  await bulkService.deleteTasks(
    taskIds, 
    parseBulkOptions(params.options)
  );
  
  return taskIds.map(() => true);
}

/**
 * Handler for deleting a task
 */
export async function deleteTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
  await taskService.deleteTask(taskId);
  return true;
} 