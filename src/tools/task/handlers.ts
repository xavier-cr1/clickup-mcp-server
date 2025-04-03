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
import { TaskService } from '../../services/clickup/task/task-service.js';
import { ExtendedTaskFilters } from '../../services/clickup/types.js';
import { findListIDByName } from '../list.js';
import { workspaceService } from '../../services/shared.js';

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
  
  // Handle custom fields if provided
  if (params.custom_fields !== undefined) {
    updateData.custom_fields = params.custom_fields;
  }
  
  return updateData;
}

/**
 * Core function to find a task by ID or name
 * This consolidates all task lookup logic in one place for consistency
 */
async function findTask(params: {
  taskId?: string,
  taskName?: string,
  listName?: string,
  customTaskId?: string,
  requireId?: boolean,
  includeSubtasks?: boolean
}) {
  const { taskId, taskName, listName, customTaskId, requireId = false, includeSubtasks = false } = params;

  // Validate that we have enough information to identify a task
  const validationResult = validateTaskIdentification(
    { taskId, taskName, listName, customTaskId },
    { requireTaskId: requireId, useGlobalLookup: true }
  );
  
  if (!validationResult.isValid) {
    throw new Error(validationResult.errorMessage);
  }
  
  try {
    // Direct path for taskId - most efficient
    if (taskId) {
      const task = await taskService.getTask(taskId);
      
      // Add subtasks if requested
      if (includeSubtasks) {
        const subtasks = await taskService.getSubtasks(task.id);
        return { task, subtasks };
      }
      
      return { task };
    }
    
    // Direct path for customTaskId - also efficient
    if (customTaskId) {
      const task = await taskService.getTaskByCustomId(customTaskId);
      
      // Add subtasks if requested
      if (includeSubtasks) {
        const subtasks = await taskService.getSubtasks(task.id);
        return { task, subtasks };
      }
      
      return { task };
    }
    
    // Special optimized path for taskName + listName combination
    if (taskName && listName) {
      const listId = await resolveListIdWithValidation(null, listName);
      
      // Get all tasks in the list
      const allTasks = await taskService.getTasks(listId);
      
      // Find the task that matches the name
      const matchingTask = findTaskByName(allTasks, taskName);
      
      if (!matchingTask) {
        throw new Error(`Task "${taskName}" not found in list "${listName}"`);
      }
      
      // Add subtasks if requested
      if (includeSubtasks) {
        const subtasks = await taskService.getSubtasks(matchingTask.id);
        return { task: matchingTask, subtasks };
      }
      
      return { task: matchingTask };
    }
    
    // Fallback to global lookup for taskName-only case
    if (taskName) {
      console.log(`Attempting global search for task: "${taskName}"`);
      
      // Step 1: Get the workspace hierarchy to access all lists
      const workspaceService = clickUpServices.workspace;
      const hierarchy = await workspaceService.getWorkspaceHierarchy(true);
      
      const allLists: any[] = [];
      // Collect all lists from the hierarchy
      const collectLists = (nodes: any[]) => {
        for (const node of nodes || []) {
          if (node.type === 'list') {
            allLists.push(node);
          }
          if (node.children && node.children.length > 0) {
            collectLists(node.children);
          }
        }
      };
      
      collectLists(hierarchy.root.children);
      console.log(`Found ${allLists.length} lists in the workspace hierarchy`);
      
      // Step 2: Search through each list for the task
      for (const list of allLists) {
        try {
          console.log(`Searching in list: "${list.name}" (${list.id})`);
          const tasksInList = await taskService.getTasks(list.id);
          
          // Debug: Log any blank tasks we find
          const blankTasks = tasksInList.filter(t => t.name.trim() === '');
          if (blankTasks.length > 0) {
            console.log(`WARNING: Found ${blankTasks.length} blank tasks in list "${list.name}":`);
            blankTasks.forEach(t => {
              console.log(`  - Blank task ID: ${t.id}, content length: ${t.text_content?.length || 0}, created: ${new Date(parseInt(t.date_created)).toISOString()}`);
            });
          }
          
          // Search through tasks in this list
          for (const task of tasksInList) {
            const normalizedTaskName = task.name.toLowerCase().trim();
            const normalizedSearchName = taskName.toLowerCase().trim();
            
            // For debugging, log more details about matching
            if (task.name.trim() === '' || task.name.trim() === '   ') {
              console.log(`ALERT: Potential problematic task "${task.name}" (ID: ${task.id})`);
              console.log(`  - In list: "${list.name}" (${list.id})`);
              console.log(`  - Raw name length: ${task.name.length}`);
              console.log(`  - Name characters: ${[...task.name].map(c => c.charCodeAt(0)).join(',')}`);
              console.log(`  - Search term: "${taskName}"`);
              console.log(`  - exactMatch: ${normalizedTaskName === normalizedSearchName}`);
              console.log(`  - containsMatch: ${normalizedTaskName.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedTaskName)}`);
            }
            
            // Do multiple kinds of matching
            const exactMatch = normalizedTaskName === normalizedSearchName;
            const containsMatch = normalizedTaskName.includes(normalizedSearchName) || 
                               normalizedSearchName.includes(normalizedTaskName);
            
            // Try matching without emoji
            const taskNameWithoutEmoji = normalizedTaskName.replace(/[\p{Emoji}\u{FE00}-\u{FE0F}\u200d]+/gu, '').trim();
            const searchNameWithoutEmoji = normalizedSearchName.replace(/[\p{Emoji}\u{FE00}-\u{FE0F}\u200d]+/gu, '').trim();
            const emojiMatch = taskNameWithoutEmoji === searchNameWithoutEmoji || 
                            taskNameWithoutEmoji.includes(searchNameWithoutEmoji) ||
                            searchNameWithoutEmoji.includes(taskNameWithoutEmoji);
            
            // Skip blank tasks - never match them regardless of what the user is searching for
            if (task.name.trim() === '' || task.name.trim() === '   ') {
              console.log(`Skipping blank task ${task.id} in "${list.name}" list`);
              continue;
            }
            
            if (exactMatch || containsMatch || emojiMatch) {
              console.log(`Found matching task: "${task.name}" (${task.id})`);
              
              // We found a match!
              if (includeSubtasks) {
                const subtasks = await taskService.getSubtasks(task.id);
                return { task, subtasks };
              }
              
              return { task };
            }
          }
        } catch (err) {
          console.log(`Error searching list ${list.name}: ${err.message}`);
          // Continue to next list
        }
      }
      
      // If we get here, we couldn't find the task in any list
      console.log("No matching task found in any list. Trying direct workspace search...");
      
      // Step 3: Fall back to workspace tasks API as a last resort
      const workspaceTasks = await taskService.getWorkspaceTasks({
        include_closed: true,
        include_archived_lists: true,
        include_closed_lists: true,
        detail_level: 'detailed'
      });
      
      // Check if we have tasks in the response
      const tasks = 'tasks' in workspaceTasks ? workspaceTasks.tasks : [];
      console.log(`Received ${tasks.length} tasks from workspace search`);
      
      // Now we need to find matching tasks by name
      if (tasks.length > 0) {
        const matchingTasks = tasks.filter(task => 
          task.name.toLowerCase().includes(taskName.toLowerCase()) || 
          taskName.toLowerCase().includes(task.name.toLowerCase().replace(/[\p{Emoji}]/gu, '').trim())
        );
        
        console.log(`Found ${matchingTasks.length} matching tasks`);
        
        if (matchingTasks.length > 0) {
          // Sort by updated date for smart disambiguation
          matchingTasks.sort((a, b) => {
            const aDate = parseInt(a.date_updated || '0', 10);
            const bDate = parseInt(b.date_updated || '0', 10);
            return bDate - aDate; // Most recent first
          });
          
          const result = matchingTasks[0];
          
          if (includeSubtasks) {
            const subtasks = await taskService.getSubtasks(result.id);
            return { task: result, subtasks };
          }
          
          return { task: result };
        }
      }
      
      // As a last resort, try the standard findTasks method
      try {
        const result = await taskService.findTasks({
          taskName,
          allowMultipleMatches: false,
          useSmartDisambiguation: true,
          includeFullDetails: true,
          includeListContext: true
        });
        
        if (!result) {
          throw new Error(`Task "${taskName}" not found in any list. Please check the task name and try again.`);
        }
        
        // Handle result which could be a single task or an array
        if (!Array.isArray(result)) {
          if (includeSubtasks) {
            const subtasks = await taskService.getSubtasks(result.id);
            return { task: result, subtasks };
          }
          
          return { task: result };
        } else if (result.length > 0) {
          // If we got an array, use the first item
          const firstMatch = result[0];
          
          if (includeSubtasks) {
            const subtasks = await taskService.getSubtasks(firstMatch.id);
            return { task: firstMatch, subtasks };
          }
          
          return { task: firstMatch };
        } else {
          throw new Error(`Task "${taskName}" not found in any list. Please check the task name and try again.`);
        }
      } catch (innerError) {
        throw innerError;
      }
    }
    
    // We shouldn't reach here if validation is working correctly
    throw new Error("No valid task identification provided");
    
  } catch (error) {
    // Enhance error message for non-existent tasks
    if (taskName && error.message.includes('not found')) {
      throw new Error(`Task "${taskName}" not found. Please check the task name and try again.`);
    }
    
    // Pass along other formatted errors
    throw error;
  }
}

/**
 * Helper function to find a task by name in an array of tasks
 */
function findTaskByName(tasks, name) {
  if (!tasks || !Array.isArray(tasks) || !name) return null;
  
  const normalizedSearchName = name.toLowerCase().trim();
  
  // Try exact match first
  let match = tasks.find(task => task.name === name);
  if (match) return match;
  
  // Try case-insensitive match
  match = tasks.find(task => 
    task.name.toLowerCase().trim() === normalizedSearchName
  );
  if (match) return match;
  
  // Try emoji-agnostic matching by removing emojis from both sides
  const searchNameWithoutEmoji = normalizedSearchName.replace(/[\p{Emoji}\u{FE00}-\u{FE0F}\u200d]+/gu, '').trim();
  
  match = tasks.find(task => {
    const taskNameWithoutEmoji = task.name.toLowerCase().replace(/[\p{Emoji}\u{FE00}-\u{FE0F}\u200d]+/gu, '').trim();
    return taskNameWithoutEmoji === searchNameWithoutEmoji;
  });
  if (match) return match;
  
  // Try fuzzy match - looking for name as substring
  match = tasks.find(task => 
    task.name.toLowerCase().includes(normalizedSearchName) || 
    normalizedSearchName.includes(task.name.toLowerCase())
  );
  
  // Try fuzzy match with emoji removal as final attempt
  if (!match) {
    match = tasks.find(task => {
      const taskNameWithoutEmoji = task.name.toLowerCase().replace(/[\p{Emoji}\u{FE00}-\u{FE0F}\u200d]+/gu, '').trim();
      return taskNameWithoutEmoji.includes(searchNameWithoutEmoji) || 
             searchNameWithoutEmoji.includes(taskNameWithoutEmoji);
    });
  }
  
  return match || null;
}

/**
 * Handler for getting a task - uses the consolidated findTask function
 */
export async function getTaskHandler(params) {
  try {
    const result = await findTask({
      taskId: params.taskId,
      taskName: params.taskName,
      listName: params.listName,
      customTaskId: params.customTaskId,
      includeSubtasks: params.subtasks
    });
    
    if (result.subtasks) {
      return { ...result.task, subtasks: result.subtasks };
    }
    
    return result.task;
  } catch (error) {
    throw error;
  }
}

/**
 * Get task ID from various identifiers - uses the consolidated findTask function
 */
export async function getTaskId(taskId?: string, taskName?: string, listName?: string, customTaskId?: string, requireId?: boolean, includeSubtasks?: boolean): Promise<string> {
  const result = await findTask({
    taskId,
    taskName,
    listName,
    customTaskId,
    requireId,
    includeSubtasks
  });
  
  return result.task.id;
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
    const validationResult = validateTaskIdentification(
      { taskId: task.taskId, taskName: task.taskName, listName: task.listName, customTaskId: task.customTaskId },
      { useGlobalLookup: true }
    );
    
    if (!validationResult.isValid) {
      throw new Error(validationResult.errorMessage);
    }
    
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
  const { 
    name, 
    description, 
    markdown_description, 
    status, 
    dueDate, 
    startDate, 
    parent, 
    tags,
    custom_fields,
    check_required_custom_fields
  } = params;
  
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
    tags,
    custom_fields,
    check_required_custom_fields
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

export interface UpdateTaskParams extends UpdateTaskData {
  taskId?: string;
  taskName?: string;
  listName?: string;
  customTaskId?: string;
}

/**
 * Handler for updating a task
 */
export async function updateTaskHandler(
  taskService: TaskService,
  params: UpdateTaskParams
): Promise<ClickUpTask> {
  const { taskId, taskName, listName, customTaskId, ...updateData } = params;
  
  // Validate task identification with global lookup enabled
  const validationResult = validateTaskIdentification(params, { useGlobalLookup: true });
  if (!validationResult.isValid) {
    throw new Error(validationResult.errorMessage);
  }

  // Validate update data
  validateTaskUpdateData(updateData);

  // Log operation parameters
  console.info('Updating task', { taskId, taskName, listName, customTaskId, updateData });

  try {
    // Get the task ID using global lookup
    const id = await getTaskId(taskId, taskName, listName, customTaskId);
    return await taskService.updateTask(id, updateData);
  } catch (error) {
    throw new Error(`Failed to update task: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handler for moving a task
 */
export async function moveTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, undefined, params.customTaskId, false);
  const listId = await getListId(params.listId, params.listName);
  return await taskService.moveTask(taskId, listId);
}

/**
 * Handler for duplicating a task
 */
export async function duplicateTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, undefined, params.customTaskId, false);
  let listId;
  
  if (params.listId || params.listName) {
    listId = await getListId(params.listId, params.listName);
  }
  
  return await taskService.duplicateTask(taskId, listId);
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
export async function createBulkTasksHandler(params: any) {
  const { tasks, listId, listName, options } = params;

  // Validate tasks array
  validateBulkTasks(tasks, 'create');

  // Validate and resolve list ID
  const targetListId = await resolveListIdWithValidation(listId, listName);

  // Format tasks for creation
  const formattedTasks: CreateTaskData[] = tasks.map(task => {
    const taskData: CreateTaskData = {
      name: task.name,
      description: task.description,
      markdown_description: task.markdown_description,
      status: task.status,
      priority: toTaskPriority(task.priority),
      tags: task.tags,
      custom_fields: task.custom_fields
    };

    // Add due date if specified
    if (task.dueDate) {
      taskData.due_date = parseDueDate(task.dueDate);
      taskData.due_date_time = true;
    }

    // Add start date if specified
    if (task.startDate) {
      taskData.start_date = parseDueDate(task.startDate);
      taskData.start_date_time = true;
    }

    return taskData;
  });

  // Parse bulk options
  const bulkOptions = parseBulkOptions(options);

  // Create tasks - pass arguments in correct order: listId, tasks, options
  return await bulkService.createTasks(targetListId, formattedTasks, bulkOptions);
}

/**
 * Handler for updating multiple tasks
 */
export async function updateBulkTasksHandler(params: any) {
  const { tasks, options } = params;

  // Validate tasks array
  validateBulkTasks(tasks, 'update');

  // Parse bulk options
  const bulkOptions = parseBulkOptions(options);

  // Update tasks
  return await bulkService.updateTasks(tasks, bulkOptions);
}

/**
 * Handler for moving multiple tasks
 */
export async function moveBulkTasksHandler(params: any) {
  const { tasks, targetListId, targetListName, options } = params;

  // Validate tasks array
  validateBulkTasks(tasks, 'move');

  // Validate and resolve target list ID
  const resolvedTargetListId = await resolveListIdWithValidation(targetListId, targetListName);

  // Parse bulk options
  const bulkOptions = parseBulkOptions(options);

  // Move tasks
  return await bulkService.moveTasks(tasks, resolvedTargetListId, bulkOptions);
}

/**
 * Handler for deleting multiple tasks
 */
export async function deleteBulkTasksHandler(params: any) {
  const { tasks, options } = params;

  // Validate tasks array
  validateBulkTasks(tasks, 'delete');

  // Parse bulk options
  const bulkOptions = parseBulkOptions(options);

  // Delete tasks
  return await bulkService.deleteTasks(tasks, bulkOptions);
}

/**
 * Handler for deleting a task
 */
export async function deleteTaskHandler(params) {
  const taskId = await getTaskId(params.taskId, params.taskName, params.listName);
  await taskService.deleteTask(taskId);
  return true;
} 