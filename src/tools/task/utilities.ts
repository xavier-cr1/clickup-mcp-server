/**
 * ClickUp MCP Task Utilities
 * 
 * This module provides utility functions for task-related operations including
 * data formatting, validation, and resolution of IDs from names.
 */

import { 
  ClickUpTask, 
  TaskPriority, 
  UpdateTaskData
} from '../../services/clickup/types.js';
import { BatchProcessingOptions } from '../../utils/concurrency-utils.js';
import { formatDueDate } from '../utils.js';
import { clickUpServices } from '../../services/shared.js';

// Use shared services instance for ID resolution
const { workspace: workspaceService } = clickUpServices;

//=============================================================================
// DATA FORMATTING UTILITIES
//=============================================================================

/**
 * Formats task data for response
 */
export function formatTaskData(task: ClickUpTask, additional: any = {}) {
  return {
    id: task.id,
    name: task.name,
    url: task.url,
    status: task.status?.status || "Unknown",
    due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
    list: task.list.name,
    space: task.space.name,
    folder: task.folder?.name,
    ...additional
  };
}

//=============================================================================
// VALIDATION UTILITIES
//=============================================================================

/**
 * Validates task identification parameters
 * Ensures either taskId is provided or both taskName and listName are provided
 */
export function validateTaskIdentification(taskId?: string, taskName?: string, listName?: string): void {
  if (!taskId && !taskName) {
    throw new Error("Either taskId or taskName must be provided");
  }
  
  if (!taskId && taskName && !listName) {
    throw new Error("When using taskName, listName is required to locate the task");
  }
}

/**
 * Validates list identification parameters
 * Ensures either listId or listName is provided
 */
export function validateListIdentification(listId?: string, listName?: string): void {
  if (!listId && !listName) {
    throw new Error("Either listId or listName must be provided");
  }
}

/**
 * Validates task update data
 * Ensures at least one update field is provided
 */
export function validateTaskUpdateData(updateData: UpdateTaskData): void {
  const hasUpdates = Object.keys(updateData).length > 0;
  if (!hasUpdates) {
    throw new Error("At least one field to update must be provided");
  }
}

/**
 * Validate bulk operation tasks array
 */
export function validateBulkTasks(tasks: any[]): void {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('You must provide a non-empty array of tasks');
  }
}

/**
 * Parse options for bulk operations
 */
export function parseBulkOptions(rawOptions: any): BatchProcessingOptions | undefined {
  if (typeof rawOptions === 'string') {
    try {
      return JSON.parse(rawOptions);
    } catch (error) {
      return undefined;
    }
  }
  return rawOptions;
}

//=============================================================================
// ID RESOLUTION UTILITIES
//=============================================================================

/**
 * Resolves a task ID from either direct ID or name+list combination
 * Handles validation and throws appropriate errors
 */
export async function resolveTaskIdWithValidation(taskId?: string, taskName?: string, listName?: string): Promise<string> {
  // Validate parameters
  validateTaskIdentification(taskId, taskName, listName);
  
  // If taskId is provided, use it directly
  if (taskId) return taskId;
  
  // At this point we know we have taskName and listName (validation ensures this)
  
  // Find the list ID from its name
  const listId = await resolveListIdWithValidation(undefined, listName!);
  
  // Find the task in the list
  const { task: taskService } = clickUpServices;
  const foundTask = await taskService.findTaskByName(listId, taskName!);
  
  if (!foundTask) {
    throw new Error(`Task "${taskName}" not found in list "${listName}"`);
  }
  
  return foundTask.id;
}

/**
 * Resolves a list ID from either direct ID or name
 * Handles validation and throws appropriate errors
 */
export async function resolveListIdWithValidation(listId?: string, listName?: string): Promise<string> {
  // Validate parameters
  validateListIdentification(listId, listName);
  
  // If listId is provided, use it directly
  if (listId) return listId;
  
  // At this point we know we have listName (validation ensures this)
  
  // Find the list ID from its name
  const hierarchy = await workspaceService.getWorkspaceHierarchy();
  const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName!, 'list');
  
  if (!listInfo) {
    throw new Error(`List "${listName}" not found`);
  }
  
  return listInfo.id;
}

//=============================================================================
// PATH EXTRACTION HELPER FUNCTIONS
//=============================================================================

/**
 * Extract path from node to root
 */
export function extractPath(node: any): string {
  if (!node) return '';
  if (!node.parent) return node.name;
  return `${extractPath(node.parent)} > ${node.name}`;
}

/**
 * Extract path from root to a specific node
 */
export function extractTreePath(root: any, targetId: string): any[] {
  if (!root) return [];
  
  // If this node is the target, return it in an array
  if (root.id === targetId) {
    return [root];
  }
  
  // Check children if they exist
  if (root.children) {
    for (const child of root.children) {
      const path = extractTreePath(child, targetId);
      if (path.length > 0) {
        return [root, ...path];
      }
    }
  }
  
  // Not found in this branch
  return [];
} 